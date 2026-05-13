#!/usr/bin/env python3
"""
normalise.py - Step 2 of the reality-casting-scout pipeline.

Reads output/raw_listings.json, deduplicates by slugified showTitle, extracts
deadlines + pay, auto-tags by genre, then hands off to score_trust.normalise_and_score()
to produce output/auto_listings.json and output/review_listings.json.
"""

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import dateparser

from score_trust import normalise_and_score

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"
RAW_FILE = OUTPUT_DIR / "raw_listings.json"
NORMALISED_FILE = OUTPUT_DIR / "normalised_listings.json"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("scout.normalise")


DEADLINE_HINT_PATTERNS = [
    r"apply by\s+([^.,;\n]{3,40})",
    r"deadline[:\s]+([^.,;\n]{3,40})",
    r"submit by\s+([^.,;\n]{3,40})",
    r"submissions? close[:\s]+([^.,;\n]{3,40})",
    r"closes?\s+(?:on\s+)?([^.,;\n]{3,40})",
    r"due[:\s]+([^.,;\n]{3,40})",
]

PAY_PATTERNS = [
    r"(\$[\d,]+(?:\.\d+)?(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per|/)\s*(?:day|episode|person|week))?)",
    r"(£[\d,]+(?:\.\d+)?(?:\s*-\s*£[\d,]+)?(?:\s*(?:per|/)\s*(?:day|episode|person|week))?)",
    r"(€[\d,]+(?:\.\d+)?)",
    r"\b(paid|stipend|honorarium)\b",
]

TAG_KEYWORDS = {
    "dating": ["dating", "single", "relationship", "love", "bachelor", "bachelorette", "romance"],
    "competition": ["competition", "compete", "challenge", "tournament", "race", "survival", "elimination"],
    "cooking": ["cooking", "chef", "kitchen", "baking", "culinary", "food"],
    "talent": ["talent", "singer", "dancer", "performer", "audition", "got talent"],
    "game-show": ["game show", "trivia", "quiz", "prize", "win money"],
    "lifestyle": ["lifestyle", "transformation", "makeover", "home renovation", "wedding"],
    "docu-soap": ["follow our family", "docu-series", "documentary series", "follow your life"],
    "business": ["entrepreneur", "business pitch", "startup", "shark tank"],
    "supernatural": ["paranormal", "psychic", "haunted", "supernatural"],
    "travel": ["travel", "adventure", "expedition", "around the world"],
}


def _slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"\s+", "-", s)
    return s[:80]


def _extract_deadline(text: str) -> str:
    for pat in DEADLINE_HINT_PATTERNS:
        m = re.search(pat, text, flags=re.IGNORECASE)
        if not m:
            continue
        parsed = dateparser.parse(m.group(1), settings={"PREFER_DATES_FROM": "future"})
        if parsed:
            return parsed.date().isoformat()
    parsed = dateparser.parse(text[:80], settings={"PREFER_DATES_FROM": "future"})
    return parsed.date().isoformat() if parsed else ""


def _extract_pay(text: str) -> str:
    matches = []
    for pat in PAY_PATTERNS:
        for m in re.finditer(pat, text, flags=re.IGNORECASE):
            matches.append(m.group(1) if m.groups() else m.group(0))
    seen = set()
    return ", ".join(x for x in matches if not (x.lower() in seen or seen.add(x.lower())))


def _tag(text: str) -> list[str]:
    lowered = text.lower()
    return sorted({tag for tag, kws in TAG_KEYWORDS.items() if any(kw in lowered for kw in kws)})


def normalise(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_slug: dict[str, dict[str, Any]] = {}
    for r in raw:
        title = (r.get("showTitle") or "").strip()
        if not title:
            continue
        slug = _slugify(title)
        if not slug:
            continue

        haystack = " ".join(filter(None, [
            r.get("description", ""), r.get("deadline", ""),
            r.get("pay", ""), r.get("location", ""),
        ]))

        normalised_record = {
            "slug": slug,
            "showTitle": title,
            "network": r.get("network", "") or "",
            "castingCompany": r.get("castingCompany", "") or "",
            "description": r.get("description", "") or "",
            "applyUrl": r.get("applyUrl", "") or r.get("sourceUrl", ""),
            "deadline": r.get("deadline") or _extract_deadline(haystack),
            "location": r.get("location", "") or "",
            "pay": r.get("pay") or _extract_pay(haystack),
            "sourceUrl": r.get("sourceUrl", "") or "",
            "sourceTier": r.get("sourceTier") or 0,
            "tags": _tag(f"{title} {r.get('description','')}"),
            "scrapedAt": r.get("scrapedAt") or datetime.now(timezone.utc).isoformat(),
            "sourcesSeen": [r.get("sourceUrl", "")],
        }

        if slug in by_slug:
            existing = by_slug[slug]
            if not existing["deadline"] and normalised_record["deadline"]:
                existing["deadline"] = normalised_record["deadline"]
            if not existing["pay"] and normalised_record["pay"]:
                existing["pay"] = normalised_record["pay"]
            existing["sourceTier"] = min(existing["sourceTier"] or 99, normalised_record["sourceTier"] or 99)
            existing["sourcesSeen"] = sorted(set(existing["sourcesSeen"] + normalised_record["sourcesSeen"]))
            existing["tags"] = sorted(set(existing["tags"] + normalised_record["tags"]))
        else:
            by_slug[slug] = normalised_record

    return list(by_slug.values())


def main():
    if not RAW_FILE.exists():
        log.error("missing %s - run scrape_sources.py first", RAW_FILE)
        return 1

    raw = json.loads(RAW_FILE.read_text())
    log.info("loaded %d raw listings", len(raw))

    normalised = normalise(raw)
    NORMALISED_FILE.write_text(json.dumps(normalised, indent=2))
    log.info("wrote %d normalised listings -> %s", len(normalised), NORMALISED_FILE)

    summary = normalise_and_score(normalised, output_dir=OUTPUT_DIR)
    log.info("scored: auto=%d review=%d quarantined=%d",
             summary["auto"], summary["review"], summary["quarantined"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
