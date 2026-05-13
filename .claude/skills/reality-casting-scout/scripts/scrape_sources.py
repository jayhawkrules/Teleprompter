#!/usr/bin/env python3
"""
scrape_sources.py - Step 1 of the reality-casting-scout pipeline.

Scrapes Tier 1, 2, and 3 reality TV casting sources, returns raw listing dicts,
and writes them to output/raw_listings.json. Polite rate-limiting (1.5s between
requests). Does NOT score or upload - that's Steps 3 and 4.

Usage:
  python scrape_sources.py                # all tiers
  python scrape_sources.py --tier 1       # tier 1 only
  python scrape_sources.py --tier 2 --max 25
"""

import argparse
import json
import logging
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

RATE_LIMIT_SECONDS = 1.5
USER_AGENT = "MythieCastingScout/1.0 (+https://mythie.app/bot)"
TIMEOUT_SECONDS = 20

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


SOURCES = [
    (1, "abc",              "https://abc.com/casting",                  "parse_generic_network"),
    (1, "bravotv",          "https://www.bravotv.com/be-on-bravo",      "parse_generic_network"),
    (1, "netflix",          "https://www.netflix.com/jobs/casting",     "parse_generic_network"),
    (1, "cbs",              "https://www.cbs.com/casting/",             "parse_generic_network"),
    (1, "nbc",              "https://www.nbc.com/casting",              "parse_generic_network"),
    (1, "mtv",              "https://www.mtv.com/casting",              "parse_generic_network"),
    (1, "discovery",        "https://www.discovery.com/casting",        "parse_generic_network"),
    (1, "tlc",              "https://www.tlc.com/casting/",             "parse_generic_network"),
    (1, "hbo",              "https://www.hbo.com/casting",              "parse_generic_network"),
    (1, "hulu",             "https://www.hulu.com/casting",             "parse_generic_network"),
    (1, "fox",              "https://www.fox.com/casting",              "parse_generic_network"),
    (1, "peacocktv",        "https://www.peacocktv.com/casting",        "parse_generic_network"),
    (1, "paramountplus",    "https://www.paramountplus.com/casting/",   "parse_generic_network"),
    (2, "projectcasting",   "https://www.projectcasting.com/casting-calls/reality-tv", "parse_projectcasting"),
    (2, "backstage",        "https://www.backstage.com/casting/reality-tv/",           "parse_backstage"),
    (2, "castingnetworks",  "https://www.castingnetworks.com/talent/jobs?type=reality","parse_castingnetworks"),
    (2, "auditionsfree",    "https://www.auditionsfree.com/category/reality-tv/",      "parse_auditionsfree"),
    (2, "lacasting",        "https://www.lacasting.com/jobs?type=reality",             "parse_lacasting"),
    (3, "castlyst",         "https://castlyst.com/casting-calls",        "parse_generic_aggregator"),
    (3, "castitreach",      "https://castitreach.com/casting-calls",     "parse_generic_aggregator"),
    (3, "realitytalentsearch", "https://realitytalentsearch.com/calls",  "parse_generic_aggregator"),
]


def fetch(url: str) -> str | None:
    try:
        log.info("GET %s", url)
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT_SECONDS)
        if resp.status_code != 200:
            log.warning("non-200 (%s) for %s", resp.status_code, url)
            return None
        return resp.text
    except requests.RequestException as e:
        log.warning("fetch failed %s - %s", url, e)
        return None
    finally:
        time.sleep(RATE_LIMIT_SECONDS)


def _domain(url: str) -> str:
    return urlparse(url).netloc.replace("www.", "")


def _text_or_empty(el) -> str:
    return el.get_text(strip=True) if el else ""


def _href_or_default(el, default: str) -> str:
    return el.get("href", default) if el and el.has_attr("href") else default


def parse_generic_network(html: str, source_url: str, tier: int) -> Iterable[RawListing]:
    soup = BeautifulSoup(html, "html.parser")
    for card in soup.select(".casting-call, article.casting, .show-card"):
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
    for card in soup.select("article.casting-listing, .casting-call-card"):
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


def scrape(tier_filter: int | None = None, max_per_source: int | None = None) -> list[RawListing]:
    results: list[RawListing] = []
    for tier, name, url, parser_name in SOURCES:
        if tier_filter is not None and tier != tier_filter:
            continue
        parser = PARSERS.get(parser_name)
        if parser is None:
            log.error("parser %s missing for %s - skipping", parser_name, name)
            continue
        html = fetch(url)
        if not html:
            continue
        count = 0
        for listing in parser(html, url, tier):
            results.append(listing)
            count += 1
            if max_per_source and count >= max_per_source:
                break
        log.info("%s: %d listings (tier %d)", name, count, tier)
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tier", type=int, choices=[1, 2, 3])
    parser.add_argument("--max", type=int, dest="max_per_source")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    results = scrape(tier_filter=args.tier, max_per_source=args.max_per_source)
    OUTPUT_FILE.write_text(json.dumps([asdict(r) for r in results], indent=2))
    log.info("wrote %d raw listings -> %s", len(results), OUTPUT_FILE)


if __name__ == "__main__":
    sys.exit(main() or 0)
