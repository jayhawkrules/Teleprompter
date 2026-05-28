#!/usr/bin/env python3
"""
scrape_sources.py - Step 1 of the reality-casting-scout pipeline.

v2 (2026-05-13): browser-like headers, per-source engine flag (requests vs
playwright), retry/backoff for transient 429/503, and explicit `status`
tracking so the operator sees source decay in the log before listings
disappear.

Usage:
  python scrape_sources.py                # all tiers, requests engine only
  python scrape_sources.py --tier 1       # tier 1 only
  python scrape_sources.py --tier 2 --max 25
  python scrape_sources.py --with-playwright  # also run playwright engine
                                              # (requires `pip install playwright
                                              # && playwright install chromium`)
"""

import argparse
import json
import logging
import random
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

# Polite-but-realistic pacing. Real users don't hammer a site at 1.5s
# intervals — they think between clicks. Add jitter so the cadence
# doesn't look mechanical to a WAF watching for bot patterns.
RATE_LIMIT_BASE_SECONDS = 1.5
RATE_LIMIT_JITTER_SECONDS = 1.2
TIMEOUT_SECONDS = 20
MAX_RETRIES = 3

# Rotate among current real-Chrome User-Agents. The v1 UA
# ("MythieCastingScout/1.0 (+https://mythie.app/bot)") was honest but
# invited the 403 we saw from Discovery on 2026-05-13. A real browser
# UA + Accept-Language + Accept signals reach more sites cleanly. We're
# still polite — see RATE_LIMIT_* and per-source caching upstream.
USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
]

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"
OUTPUT_FILE = OUTPUT_DIR / "raw_listings.json"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("scout.scrape")


@dataclass
class RawListing:
    showTitle: str
    network: str
    castingCompany: str
    description: str
    applyUrl: str
    deadline: str
    location: str
    pay: str
    sourceUrl: str
    sourceTier: int
    scrapedAt: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# Per-source: (tier, name, url, parser_name, engine, status)
#   engine: "requests" — plain HTTP fetch + BeautifulSoup
#           "playwright" — headless browser (only runs when --with-playwright)
#           "rss"        — feedparser-backed RSS/Atom feed reader. Cheapest
#                          and most stable engine — when a source publishes
#                          a feed, we should always prefer it over the
#                          HTML scrape. Requires `pip install feedparser`.
#   status: "working" | "verify" | "dead" | "js-required"
# See references/sources.md for the audit that produced these values.
SOURCES = [
    # Tier 1 — official networks (mostly JS-rendered as of 2026-05-13)
    (1, "abc",              "https://abc.com/casting",                       "parse_generic_network",   "playwright", "js-required"),
    (1, "nbc",              "https://www.nbc.com/casting",                   "parse_generic_network",   "playwright", "js-required"),
    (1, "netflix",          "https://www.netflix.com/jobs/casting",          "parse_generic_network",   "playwright", "verify"),
    (1, "cbs",              "https://www.cbs.com/casting/",                  "parse_generic_network",   "playwright", "js-required"),
    (1, "discovery",        "https://www.discovery.com/casting",             "parse_generic_network",   "playwright", "dead"),
    (1, "tlc",              "https://www.tlc.com/casting/",                  "parse_generic_network",   "playwright", "verify"),
    (1, "hbo",              "https://www.hbo.com/casting",                   "parse_generic_network",   "playwright", "verify"),
    (1, "hulu",             "https://www.hulu.com/casting",                  "parse_generic_network",   "playwright", "verify"),
    (1, "fox",              "https://www.fox.com/casting",                   "parse_generic_network",   "playwright", "verify"),
    (1, "peacocktv",        "https://www.peacocktv.com/casting",             "parse_generic_network",   "playwright", "verify"),
    (1, "paramountplus",    "https://www.paramountplus.com/casting/",        "parse_generic_network",   "playwright", "verify"),

    # Tier 2 — aggregators (purpose-built to be machine-readable)
    # 2026-05-25 — scout-zero-listings round-2 selector tuning:
    #   - DROP backstage.com entirely. Listings are login-walled; even
    #     with browser headers + Playwright the public path returns 0
    #     (Andrew's directive, after 9 PRs of trying).
    #   - parse_projectcasting (HTML) removed: 0 h2/h3/h4 in static HTML —
    #     projectcasting.com renders listings client-side. RSS path below
    #     replaces it.
    (2, "auditionsfree",    "https://www.auditionsfree.com/category/reality-tv/",     "parse_auditionsfree",   "requests",   "working"),
    (2, "castingnetworks",  "https://www.castingnetworks.com/talent/jobs?type=reality","parse_castingnetworks", "playwright", "js-required"),
    (2, "lacasting",        "https://www.lacasting.com/jobs?type=reality",            "parse_lacasting",       "playwright", "js-required"),
    (2, "stage32",          "https://www.stage32.com/jobs?searchQuery=reality",       "parse_generic_aggregator", "playwright", "verify"),
    # castingcrane.com apex → 403 bot-blocked as of 2026-05-25. Trust signal
    # on applyUrls to castingcrane subdomains still applies (see
    # TRUSTED_APPLY_DOMAINS in score_trust.py); we just can't scrape the
    # apex hub directly. Most castingcrane content surfaces via castlyst.com
    # apply links anyway — see Tier 3 row below.
    (2, "castingcrane",     "https://castingcrane.com/casting-calls",                 "parse_generic_aggregator", "playwright", "dead"),
    # castingfrontier.com apex is marketing copy; their real jobs board is
    # behind login. Confirmed 2026-05-25 — apex returns only 3 .post-casting
    # cards, all "Join Casting Frontier!" promo blocks.
    (2, "castingfrontier",  "https://www.castingfrontier.com/jobs?type=reality",      "parse_generic_aggregator", "playwright", "dead"),
    (2, "mandy",            "https://www.mandy.com/uk/casting-calls?category=reality","parse_generic_aggregator", "requests",   "verify"),
    # mysticartpictures.com/now-casting/ → 404; /mystic/nowcasting.php apex
    # returns 200 but the listings are rendered client-side (only 1 h2 +
    # 2 h3 of static markup, all auth/cookie UI). Re-add when stable URL.
    (2, "mysticart",        "https://www.mysticartpictures.com/mystic/nowcasting.php","parse_generic_aggregator", "playwright", "dead"),

    # Tier 3 — specialist platforms
    # castlyst.com is a Wix-hosted site whose listings render server-side
    # under `.wixui-repeater__item`. Plain-HTTP fetch returns 31 listings
    # per page; many applyUrls land on castingcrane.com subdomains
    # (eg. `mafscasting.castingcrane.com`) so the trust score lifts
    # automatically via TRUSTED_APPLY_DOMAINS. Confirmed 2026-05-25.
    (3, "castlyst",            "https://castlyst.com/casting-calls",       "parse_castlyst",           "requests", "working"),
    # castitreach.com/casting-calls → 404 since at least 2026-05-13. The
    # `castitreach.com` domain is alive but the casting-calls listing path
    # was retired. Andrew's 2026-05-17 directive still treats *applyUrl*s
    # on castitreach.com as high-trust legitimacy signals for listings
    # discovered elsewhere — see TRUSTED_APPLY_DOMAINS in score_trust.py.
    # Re-add this row only after a fresh URL is confirmed.
    (3, "castitreach",         "https://castitreach.com/casting-calls",    "parse_generic_aggregator", "requests", "dead"),
    # realitytalentsearch.com → DNS-dead since 2026-05-21 (NXDOMAIN).
    # Domain appears to have lapsed. Re-add only after a fresh URL.
    (3, "realitytalentsearch", "https://realitytalentsearch.com/calls",    "parse_generic_aggregator", "requests", "dead"),

    # RSS / Atom feeds — cheapest + most stable engine. Always prefer
    # the feed when a source publishes one. parse_projectcasting_rss
    # filters /feed/ entries to casting-call URLs only — the firehose
    # mixes casting calls with celebrity news, but everything under
    # `/blog/casting-calls-acting-auditions/` is a real call.
    #
    # 2026-05-25 verification:
    #   - `?rss=1` on the category page → returns HTML (not RSS — the param
    #     is silently ignored). Fixed v3 → use `/feed/` instead.
    #   - `/casting-calls/reality-tv/feed/` → 410 Gone (category feed dead)
    #   - `/feed/` → 200, 20 RSS items (mix; URL prefix filter required)
    # backstage_rss + auditionsfree_rss removed: backstage dropped entirely;
    # auditionsfree_rss URL returned the HTML category page anyway.
    (2, "projectcasting_rss",  "https://www.projectcasting.com/feed/",     "parse_projectcasting_rss", "rss", "working"),
]


def _polite_sleep() -> None:
    time.sleep(RATE_LIMIT_BASE_SECONDS + random.uniform(0, RATE_LIMIT_JITTER_SECONDS))


def _browser_headers() -> dict:
    """Return a fresh, browser-like header set for each request.

    Note on Accept-Encoding (2026-05-25 fix): we deliberately omit `br`
    (brotli) and accept only `gzip, deflate`. Python's `requests`
    library cannot decode brotli responses without an extra package
    (`brotli` / `urllib3[brotli]`); if we advertise br, sites like
    auditionsfree.com return brotli-encoded bodies that look like
    binary garbage to BeautifulSoup, the selectors match nothing, and
    the parser silently returns 0 listings. This was a contributor to
    the chronic rawCount=0 problem alongside the over-generic
    selectors. Dropping `br` is the cheaper fix than adding a runtime
    dep; the bandwidth difference is negligible at the scout's
    every-3-days cadence.
    """
    return {
        "User-Agent":      random.choice(USER_AGENTS),
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "Cache-Control":   "no-cache",
        "Pragma":          "no-cache",
    }


def fetch_requests(url: str) -> str | None:
    """Plain HTTP fetch via requests + BeautifulSoup downstream. Retries on
    429/503 (transient rate-limiting from real sites) with exponential
    backoff. Returns None on permanent failure so the caller can flag the
    source as decaying."""
    for attempt in range(MAX_RETRIES):
        try:
            log.info("GET %s (attempt %d)", url, attempt + 1)
            resp = requests.get(url, headers=_browser_headers(), timeout=TIMEOUT_SECONDS)
            if resp.status_code == 200:
                return resp.text
            if resp.status_code in (429, 503) and attempt < MAX_RETRIES - 1:
                backoff = 2 ** attempt + random.uniform(0, 1)
                log.warning("%s for %s — backing off %.1fs", resp.status_code, url, backoff)
                time.sleep(backoff)
                continue
            log.warning("non-200 (%s) for %s", resp.status_code, url)
            return None
        except requests.RequestException as e:
            log.warning("fetch failed %s — %s", url, e)
            return None
        finally:
            _polite_sleep()
    return None


def fetch_rss(url: str) -> list | None:
    """Read an RSS/Atom feed. Returns a list of feed entries (dict-like)
    so the rss parser can map fields verbatim, or None on permanent
    failure.

    Imported lazily so the requests-only path doesn't require the
    feedparser package.

    2026-05-25 fix: we now fetch the body via `requests` and pass the
    bytes to `feedparser.parse()` instead of letting feedparser fetch
    directly. Direct feedparser fetches were silently failing because:
      1. feedparser's built-in HTTP client uses urllib's default SSL
         context, which can't always find the system cert bundle on
         macOS Python builds (urlopen error CERTIFICATE_VERIFY_FAILED).
      2. Even with a browser UA, sites behind Cloudflare may serve
         feedparser differently than requests.
    Routing through requests gives us the same SSL handling as our
    other engines + uses the same browser-like header set.

    Note: feedparser is patient about malformed feeds and will return
    even when the response is HTML rather than a real feed. We guard
    against that by requiring at least one entry with a `link` field —
    a sane heuristic for "this is actually a feed and not a 200 OK
    error page".
    """
    try:
        import feedparser
    except ImportError:
        log.error("feedparser not installed — `pip install feedparser`. Skipping %s", url)
        return None

    try:
        log.info("GET %s (rss)", url)
        resp = requests.get(url, headers=_browser_headers(), timeout=TIMEOUT_SECONDS)
        if resp.status_code != 200:
            log.warning("rss fetch non-200 (%s) for %s", resp.status_code, url)
            return None
        parsed = feedparser.parse(resp.content)
        entries = list(getattr(parsed, "entries", []) or [])
        if not entries or not any(e.get("link") for e in entries):
            log.warning("rss feed returned no parseable entries: %s", url)
            return None
        return entries
    except Exception as e:  # noqa: BLE001 — feedparser/requests surfaces many error shapes
        log.warning("rss fetch failed %s — %s", url, e)
        return None
    finally:
        _polite_sleep()


def parse_rss_generic(feed_entries, source_url: str, tier: int) -> Iterable[RawListing]:
    """Map feedparser entries to RawListing fields with the default
    mapping that covers Project Casting / Backstage / Auditions Free.
    Site-specific parsers can override; this generic one is good
    enough to start ingesting.

    feedparser entry conventions used:
      - .title         → showTitle
      - .summary       → description (HTML stripped via BeautifulSoup)
      - .link          → applyUrl
      - .published     → deadline (best-effort; many feeds don't carry one)
      - .tags / .category → location/network when applicable
    """
    for entry in feed_entries or []:
        title = (entry.get("title") or "").strip()
        link  = (entry.get("link")  or "").strip()
        if not title or not link:
            continue
        # Strip HTML in summary — feeds often embed paragraph markup.
        summary_html = entry.get("summary") or entry.get("description") or ""
        try:
            summary_text = BeautifulSoup(summary_html, "html.parser").get_text(" ", strip=True)
        except Exception:  # noqa: BLE001
            summary_text = summary_html
        yield RawListing(
            showTitle=title,
            network=_domain(source_url).split(".")[0].upper(),
            castingCompany="",
            description=summary_text[:2000],
            applyUrl=link,
            deadline=str(entry.get("published") or ""),
            location="",
            pay="",
            sourceUrl=source_url,
            sourceTier=tier,
        )


def fetch_playwright(url: str) -> str | None:
    """Headless-browser fetch via Playwright. Used for JS-rendered sources
    (most Tier-1 networks in 2026). Returns the post-render HTML so the
    same BeautifulSoup parsers as the requests engine can consume it.

    Imported lazily so the requests-only path doesn't require the
    playwright package to be installed."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        log.error("playwright not installed — `pip install playwright && playwright install chromium`. Skipping %s", url)
        return None

    try:
        log.info("GET %s (playwright)", url)
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=random.choice(USER_AGENTS),
                locale="en-US",
            )
            page = context.new_page()
            page.goto(url, wait_until="networkidle", timeout=TIMEOUT_SECONDS * 1000)
            html = page.content()
            browser.close()
        return html
    except Exception as e:  # noqa: BLE001 — playwright surfaces many error shapes
        log.warning("playwright fetch failed %s — %s", url, e)
        return None
    finally:
        _polite_sleep()


def _domain(url: str) -> str:
    return urlparse(url).netloc.replace("www.", "")


def _text_or_empty(el) -> str:
    return el.get_text(strip=True) if el else ""


def _href_or_default(el, default: str) -> str:
    return el.get("href", default) if el and el.has_attr("href") else default


# Resilient selector families — tried in order, first one to yield ≥2 cards wins.
# The order matters: most-specific first so that a real `.casting-call` listing
# beats a generic `<article>` page wrapper. A 2-card minimum is the floor that
# distinguishes "found a list of listings" from "matched the page's hero block".
#
# Why this is structured as a fall-through ladder rather than per-source CSS:
# the previous design hard-coded one selector per source (`.casting-call,
# article.casting, .show-card`). Every Tier-2 source returned 200 OK with that
# selector matching zero elements because real aggregator markup uses class
# names like `.job-listing`, `.posting-row`, `.casting-card`, `[data-testid]`,
# etc. — none of which were in the hardcoded list. The 2026-05-13 → 2026-05-21
# production runs all yielded 0 listings as a direct consequence.
SELECTOR_LADDER = [
    # Vendor-named cards — the obvious-but-rare match
    "article.casting-listing, article.casting-call, article.job-listing, article.posting",
    "div.casting-call, div.casting-card, div.casting-listing, div.job-listing, div.audition-listing",
    "li.casting-call, li.casting-card, li.job-card, li.audition",
    # Class-pattern matches — catches `*-listing`, `*-casting`, `*-job` variants
    "article[class*='listing'], article[class*='casting'], article[class*='job']",
    "div[class*='casting-call'], div[class*='casting-listing'], div[class*='casting-card']",
    "div[class*='job-listing'], div[class*='posting'], div[class*='audition']",
    "li[class*='casting'], li[class*='listing'], li[class*='job']",
    # Testid / data-attribute fallbacks (modern React apps)
    "[data-testid*='casting'], [data-testid*='job-listing'], [data-testid*='listing-card']",
    "[data-cy*='casting'], [data-cy*='listing']",
    # Last resort — any heading + anchor pair under a section/main that looks like a list
    "section li:has(h2), section li:has(h3), main li:has(h2), main li:has(h3)",
    "section article:has(h2 a), section article:has(h3 a), main article:has(h2 a), main article:has(h3 a)",
]
MIN_CARDS_PER_SELECTOR = 2  # below this, treat as a page header / hero match — keep walking the ladder


def _extract_card(card, source_url: str, tier: int, network_hint: str = "") -> RawListing | None:
    """Pull a RawListing out of one DOM card using the broadest reasonable
    field selectors. Returns None if no title could be extracted — that
    means this candidate isn't actually a listing card.
    """
    title_el = card.select_one(
        "h2 a, h3 a, h4 a, h2, h3, h4, .title, .listing-title, "
        ".job-title, .casting-title, [class*='title']"
    )
    if not title_el or not title_el.get_text(strip=True):
        return None
    title = title_el.get_text(strip=True)

    # apply URL: prefer the title's anchor; fall back to first anchor in the card
    anchor = title_el if (title_el.name == "a" and title_el.has_attr("href")) else card.select_one("a[href]")
    apply_url = _href_or_default(anchor, source_url)
    # Normalise relative URLs against the source domain
    if apply_url and apply_url.startswith("/"):
        from urllib.parse import urljoin
        apply_url = urljoin(source_url, apply_url)

    return RawListing(
        showTitle=title,
        network=network_hint or _domain(source_url).split(".")[0].upper(),
        castingCompany=_text_or_empty(card.select_one(
            ".casting-director, .casting-company, .producer, .company, [class*='director'], [class*='company']"
        )),
        description=_text_or_empty(card.select_one(
            ".excerpt, .description, .summary, [class*='excerpt'], [class*='description'], p"
        )),
        applyUrl=apply_url,
        deadline=_text_or_empty(card.select_one(
            ".deadline, time, [class*='deadline'], [class*='due-date']"
        )),
        location=_text_or_empty(card.select_one(
            ".location, .city, [class*='location'], [class*='city']"
        )),
        pay=_text_or_empty(card.select_one(
            ".pay, .compensation, [class*='pay'], [class*='compensation'], [class*='rate']"
        )),
        sourceUrl=source_url,
        sourceTier=tier,
    )


def _parse_with_ladder(html: str, source_url: str, tier: int, network_hint: str = "") -> Iterable[RawListing]:
    """Walk the SELECTOR_LADDER and yield from the first selector family
    that matches at least MIN_CARDS_PER_SELECTOR cards. Logs which rung
    of the ladder matched so the operator can see whether the resilient
    fallback is doing the work (signal that the source's vendor-specific
    selectors should be added at the top of the ladder for clarity)."""
    soup = BeautifulSoup(html, "html.parser")
    matched_rung = None
    for rung_index, selector in enumerate(SELECTOR_LADDER):
        try:
            cards = soup.select(selector)
        except Exception:  # noqa: BLE001 — some CSS-4 selectors (:has) require BS4 4.12+
            continue
        if len(cards) >= MIN_CARDS_PER_SELECTOR:
            matched_rung = rung_index
            for card in cards:
                listing = _extract_card(card, source_url, tier, network_hint)
                if listing is not None:
                    yield listing
            break
    if matched_rung is None:
        log.info("parser: no selector rung matched for %s (HTML may be JS-rendered or unrecognized structure)", source_url)
    else:
        log.debug("parser: matched ladder rung %d for %s", matched_rung, source_url)


def parse_generic_network(html: str, source_url: str, tier: int) -> Iterable[RawListing]:
    yield from _parse_with_ladder(html, source_url, tier)


def parse_generic_aggregator(html: str, source_url: str, tier: int) -> Iterable[RawListing]:
    yield from _parse_with_ladder(html, source_url, tier)


def parse_castingnetworks(html: str, source_url: str, tier: int) -> Iterable[RawListing]:
    yield from _parse_with_ladder(html, source_url, tier)


def parse_lacasting(html: str, source_url: str, tier: int) -> Iterable[RawListing]:
    yield from _parse_with_ladder(html, source_url, tier)


# Per-source parsers — tuned 2026-05-25 against real HTML fixtures in
# scripts/fixtures/. The ladder still exists as a fallback for sources
# we haven't profiled yet, but for these 3 sources the dedicated
# parser is strictly better: the ladder was matching menu items
# instead of listings and the generic _extract_card was pulling
# navigation chrome instead of show titles.

def parse_auditionsfree(html: str, source_url: str, tier: int) -> Iterable[RawListing]:
    """auditionsfree.com category page — WordPress with `article.post.hentry`.
    Per fixture, ~15 listings per page. The .entry-title and .entry-summary
    selectors lift cleanly; the apply link is the post permalink.

    Tier mapping note: source is Tier 2 (aggregator); listings on
    auditionsfree carry a mix of reality TV, scripted, and commercial
    casting. The /reality-tv/ category URL pre-filters most of that.
    """
    soup = BeautifulSoup(html, "html.parser")
    posts = soup.select("article.post.hentry, article.post.type-post")
    for post in posts:
        title_el = post.select_one(".entry-title a, .entry-title, h1 a, h2 a, h3 a")
        if not title_el:
            continue
        title = title_el.get_text(strip=True)
        if not title:
            continue
        anchor = title_el if (title_el.name == "a" and title_el.has_attr("href")) else post.select_one("a[href]")
        apply_url = _href_or_default(anchor, source_url)
        summary = _text_or_empty(post.select_one(".entry-summary, .entry-content p, p"))
        yield RawListing(
            showTitle=title,
            network="auditionsfree",
            castingCompany="",
            description=summary[:800],
            applyUrl=apply_url,
            deadline="",
            location="",
            pay="",
            sourceUrl=source_url,
            sourceTier=tier,
        )


def parse_castlyst(html: str, source_url: str, tier: int) -> Iterable[RawListing]:
    """castlyst.com — Wix-hosted Mythie-competitor scraper site. Listings
    live under `.wixui-repeater__item` with structure:
      [genre badge] [h2 show title] [Apply button → castlyst landing OR direct]
      [description text]
    Per fixture, ~31 listings per page. Apply URLs frequently land on
    castingcrane.com subdomains — the TRUSTED_APPLY_DOMAINS bonus in
    score_trust.py picks those up automatically (+30 trust).
    """
    soup = BeautifulSoup(html, "html.parser")
    items = soup.select(".wixui-repeater__item")
    for item in items:
        heading = item.find(["h1", "h2", "h3", "h4"])
        if not heading:
            continue
        title = heading.get_text(strip=True)
        if not title:
            continue
        # Castlyst lists 2 anchors per item: the castlyst detail page first,
        # then the actual external apply link (castingcrane / pietown / etc.).
        # Prefer the EXTERNAL apply link — it carries the trust signal and
        # is what the producer actually wants to share.
        anchors = item.find_all("a", href=True)
        external = next(
            (a for a in anchors if a.get("href", "").startswith("http")
             and "castlyst.com" not in a.get("href", "")),
            None,
        )
        apply_url = external.get("href") if external else (
            anchors[0].get("href") if anchors else source_url
        )
        # Description: full item text minus the heading + "Apply" button label.
        full_text = item.get_text(" ", strip=True)
        description = full_text.replace(title, "", 1).replace("Apply", "", 1).strip()
        yield RawListing(
            showTitle=title,
            network="castlyst",
            castingCompany="",
            description=description[:800],
            applyUrl=apply_url,
            deadline="",
            location="",
            pay="",
            sourceUrl=source_url,
            sourceTier=tier,
        )


# URL-prefix filter for projectcasting.com /feed/ — the firehose mixes
# blog news ("Anne Hathaway Addresses Facelift Rumors") with real casting
# calls. Everything under /blog/casting-calls-acting-auditions/ is a real
# call. Verified 2026-05-25 by inspecting /feed/ entries.
PROJECTCASTING_CALL_URL_FRAGMENT = "/blog/casting-calls-acting-auditions/"


def parse_projectcasting_rss(feed_entries, source_url: str, tier: int) -> Iterable[RawListing]:
    """projectcasting.com /feed/ — filtered RSS. Only emits entries whose
    link contains PROJECTCASTING_CALL_URL_FRAGMENT, which is how PC
    namespaces their actual casting-call posts vs news + interviews."""
    for entry in feed_entries or []:
        link = (entry.get("link") or "").strip()
        if not link or PROJECTCASTING_CALL_URL_FRAGMENT not in link:
            continue
        title = (entry.get("title") or "").strip()
        if not title:
            continue
        summary_html = entry.get("summary") or entry.get("description") or ""
        try:
            summary_text = BeautifulSoup(summary_html, "html.parser").get_text(" ", strip=True)
        except Exception:  # noqa: BLE001
            summary_text = summary_html
        yield RawListing(
            showTitle=title,
            network="projectcasting",
            castingCompany="",
            description=summary_text[:2000],
            applyUrl=link,
            deadline=str(entry.get("published") or ""),
            location="",
            pay="",
            sourceUrl=source_url,
            sourceTier=tier,
        )


PARSERS = {name: fn for name, fn in globals().items() if name.startswith("parse_")}


def scrape(tier_filter: int | None = None, max_per_source: int | None = None, with_playwright: bool = False) -> list[RawListing]:
    results: list[RawListing] = []
    decaying_sources: list[str] = []
    for tier, name, url, parser_name, engine, status in SOURCES:
        if tier_filter is not None and tier != tier_filter:
            continue
        if status == "dead":
            log.info("%s: skipped (status=dead — see references/sources.md)", name)
            continue
        if engine == "playwright" and not with_playwright:
            log.info("%s: skipped (engine=playwright; pass --with-playwright to include)", name)
            continue

        parser = PARSERS.get(parser_name)
        if parser is None:
            log.error("parser %s missing for %s — skipping", parser_name, name)
            continue

        # Dispatch to the engine. RSS returns a list of feed entries,
        # not HTML, so the parser signature for `rss` engine is
        # (feed_entries, source_url, tier) rather than (html, ...).
        if engine == "rss":
            payload = fetch_rss(url)
        elif engine == "playwright":
            payload = fetch_playwright(url)
        else:
            payload = fetch_requests(url)
        if not payload:
            decaying_sources.append(f"{name} ({status})")
            continue

        count = 0
        for listing in parser(payload, url, tier):
            results.append(listing)
            count += 1
            if max_per_source and count >= max_per_source:
                break
        log.info("%s: %d listings (tier %d, engine=%s, status=%s)", name, count, tier, engine, status)
        # PR A3 — inverted-polarity fix. Original code skipped the decay
        # warning for status=="verify" sources, but every source's status
        # is "verify", so the warning never fired. The whole purpose of
        # this list is to surface "this run returned 0", regardless of
        # whether the source was previously known-healthy ("working"),
        # known-flaky ("verify"), or actively probing ("js-required").
        # "dead" sources are filtered earlier in the loop and never reach
        # this branch.
        if count == 0:
            decaying_sources.append(f"{name} (returned 0, status={status})")

    if decaying_sources:
        log.warning("Decaying or zero-yield sources this run: %s", ", ".join(decaying_sources))
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tier", type=int, choices=[1, 2, 3])
    parser.add_argument("--max", type=int, dest="max_per_source")
    parser.add_argument(
        "--with-playwright",
        action="store_true",
        help="Also run Playwright-engine sources. Requires `playwright` Python package + a Chromium install.",
    )
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    results = scrape(
        tier_filter=args.tier,
        max_per_source=args.max_per_source,
        with_playwright=args.with_playwright,
    )
    OUTPUT_FILE.write_text(json.dumps([asdict(r) for r in results], indent=2))
    log.info("wrote %d raw listings -> %s", len(results), OUTPUT_FILE)


if __name__ == "__main__":
    sys.exit(main() or 0)
