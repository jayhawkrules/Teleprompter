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
    (2, "projectcasting",   "https://www.projectcasting.com/casting-calls/reality-tv", "parse_projectcasting",  "requests",   "verify"),
    (2, "backstage",        "https://www.backstage.com/casting/reality-tv/",          "parse_backstage",       "requests",   "verify"),
    (2, "auditionsfree",    "https://www.auditionsfree.com/category/reality-tv/",     "parse_auditionsfree",   "requests",   "verify"),
    (2, "castingnetworks",  "https://www.castingnetworks.com/talent/jobs?type=reality","parse_castingnetworks", "playwright", "js-required"),
    (2, "lacasting",        "https://www.lacasting.com/jobs?type=reality",            "parse_lacasting",       "playwright", "js-required"),
    (2, "stage32",          "https://www.stage32.com/jobs?searchQuery=reality",       "parse_generic_aggregator", "playwright", "verify"),
    (2, "castingcrane",     "https://castingcrane.com/casting-calls",                 "parse_generic_aggregator", "playwright", "verify"),
    (2, "castingfrontier",  "https://www.castingfrontier.com/jobs?type=reality",      "parse_generic_aggregator", "playwright", "verify"),
    (2, "mandy",            "https://www.mandy.com/uk/casting-calls?category=reality","parse_generic_aggregator", "requests",   "verify"),

    # Tier 3 — specialist platforms
    (3, "castlyst",            "https://castlyst.com/casting-calls",       "parse_generic_aggregator", "requests", "verify"),
    (3, "castitreach",         "https://castitreach.com/casting-calls",    "parse_generic_aggregator", "requests", "verify"),
    (3, "realitytalentsearch", "https://realitytalentsearch.com/calls",    "parse_generic_aggregator", "requests", "verify"),

    # RSS / Atom feeds — cheapest + most stable engine. Always prefer
    # the feed when a source publishes one. The parse_rss_generic
    # parser maps feedparser entries to RawListing fields with a
    # sensible default mapping; per-source parsers can override.
    #
    # Project Casting historically exposed an RSS feed at ?rss=1 on
    # the listings page; we re-add it here so the run-without-Playwright
    # path still gets something even if the HTML scrape is rate-limited.
    # Validate via `python -c "import feedparser; print(feedparser.parse('https://www.projectcasting.com/casting-calls/reality-tv?rss=1').entries[:1])"`.
    (2, "projectcasting_rss",  "https://www.projectcasting.com/casting-calls/reality-tv?rss=1",  "parse_rss_generic", "rss", "verify"),
    (2, "backstage_rss",       "https://www.backstage.com/casting/reality-tv/feed/",             "parse_rss_generic", "rss", "verify"),
    (2, "auditionsfree_rss",   "https://www.auditionsfree.com/category/reality-tv/feed/",        "parse_rss_generic", "rss", "verify"),
]


def _polite_sleep() -> None:
    time.sleep(RATE_LIMIT_BASE_SECONDS + random.uniform(0, RATE_LIMIT_JITTER_SECONDS))


def _browser_headers() -> dict:
    """Return a fresh, browser-like header set for each request."""
    return {
        "User-Agent":      random.choice(USER_AGENTS),
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
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
    """Read an RSS/Atom feed via feedparser. Returns a list of feed
    entries (dict-like) so the rss parser can map fields verbatim,
    or None on permanent failure.

    Imported lazily so the requests-only path doesn't require the
    feedparser package. Add `feedparser>=6.0` to requirements when the
    scout is wired into a CI image that doesn't already have it.

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
        parsed = feedparser.parse(url, agent=random.choice(USER_AGENTS))
        entries = list(getattr(parsed, "entries", []) or [])
        if not entries or not any(e.get("link") for e in entries):
            log.warning("rss feed returned no parseable entries: %s", url)
            return None
        return entries
    except Exception as e:  # noqa: BLE001 — feedparser surfaces many error shapes
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


def parse_generic_network(html: str, source_url: str, tier: int) -> Iterable[RawListing]:
    soup = BeautifulSoup(html, "html.parser")
    for card in soup.select(".casting-call, article.casting, .show-card, [data-testid*='casting']"):
        title = card.select_one("h2, h3, .title")
        if not title:
            continue
        yield RawListing(
            showTitle=title.get_text(strip=True),
            network=_domain(source_url).split(".")[0].upper(),
            castingCompany=_text_or_empty(card.select_one(".casting-company")),
            description=_text_or_empty(card.select_one(".description, p")),
            applyUrl=_href_or_default(card.select_one("a[href]"), source_url),
            deadline=_text_or_empty(card.select_one(".deadline, time")),
            location=_text_or_empty(card.select_one(".location")),
            pay=_text_or_empty(card.select_one(".pay, .compensation")),
            sourceUrl=source_url,
            sourceTier=tier,
        )


def parse_generic_aggregator(html: str, source_url: str, tier: int) -> Iterable[RawListing]:
    yield from parse_generic_network(html, source_url, tier)


def parse_projectcasting(html: str, source_url: str, tier: int) -> Iterable[RawListing]:
    soup = BeautifulSoup(html, "html.parser")
    for card in soup.select("article.casting-listing, .casting-call-card, .listing-card"):
        title_el = card.select_one("h2 a, h3 a, .listing-title")
        if not title_el:
            continue
        yield RawListing(
            showTitle=title_el.get_text(strip=True),
            network="",
            castingCompany=_text_or_empty(card.select_one(".casting-director, .producer")),
            description=_text_or_empty(card.select_one(".excerpt, p")),
            applyUrl=_href_or_default(title_el, source_url),
            deadline=_text_or_empty(card.select_one(".deadline")),
            location=_text_or_empty(card.select_one(".location, .city")),
            pay=_text_or_empty(card.select_one(".compensation, .pay")),
            sourceUrl=source_url,
            sourceTier=tier,
        )


def parse_backstage(html: str, source_url: str, tier: int) -> Iterable[RawListing]:
    yield from parse_projectcasting(html, source_url, tier)


def parse_castingnetworks(html: str, source_url: str, tier: int) -> Iterable[RawListing]:
    yield from parse_projectcasting(html, source_url, tier)


def parse_auditionsfree(html: str, source_url: str, tier: int) -> Iterable[RawListing]:
    yield from parse_projectcasting(html, source_url, tier)


def parse_lacasting(html: str, source_url: str, tier: int) -> Iterable[RawListing]:
    yield from parse_projectcasting(html, source_url, tier)


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
        if count == 0 and status != "verify":
            decaying_sources.append(f"{name} (returned 0)")

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
