"""
score_brief.py - Step 3 of the pipeline.

Computes per-signal identityMatchConfidence and drops signals below
threshold. Computes overall brief confidence.

Per safe-edit-policy: scaffold.
"""

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"

DROP_THRESHOLD = 0.50
HIGH_THRESHOLD = 0.80


def tokenise(s: str) -> set[str]:
    return {t.lower() for t in re.findall(r"\w+", s or "") if len(t) > 1}


def name_match_score(subject_name: str, signal_text: str) -> float:
    subj = tokenise(subject_name)
    sig = tokenise(signal_text)
    if not subj or not sig:
        return 0.0
    overlap = subj & sig
    return min(1.0, len(overlap) / max(2, len(subj)))


def city_match(subject_city: str, signal_text: str) -> float:
    if not subject_city:
        return 0.0
    return 1.0 if subject_city.lower() in (signal_text or "").lower() else 0.0


def score_signal(signal: dict, subject: dict) -> float:
    """Weighted identity-match. Tunable. Source-tier informs prior."""
    text = signal.get("content", "")
    name_w = 0.55
    city_w = 0.20
    profession_w = 0.15
    tier_prior_w = 0.10

    name_s = name_match_score(subject["name"], text)
    city_s = city_match(subject.get("city", ""), text)
    profession_s = name_match_score(subject.get("profession", ""), text)

    tier_prior = {
        "A": 0.95,  # sanctions matches require name+DOB - very high prior
        "B": 0.65,  # press mentions often disambiguated
        "C": 0.45,  # court records frequently have name collisions
        "D": 0.75,  # social profiles - the username is identity-bearing
    }.get(signal.get("sourceTier", ""), 0.5)

    return round(
        name_w * name_s
        + city_w * city_s
        + profession_w * profession_s
        + tier_prior_w * tier_prior,
        3,
    )


def overall_confidence(signals: list[dict]) -> str:
    if not signals:
        return "insufficient"
    kept = [s for s in signals if s["identityMatchConfidence"] >= DROP_THRESHOLD]
    if not kept:
        return "insufficient"
    high = [s for s in kept if s["identityMatchConfidence"] >= HIGH_THRESHOLD]
    if len(high) >= 2:
        return "high"
    if len(high) == 1 or len(kept) >= 3:
        return "medium"
    return "low"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gather", required=True)
    args = parser.parse_args()

    with open(args.gather) as f:
        gather = json.load(f)

    subject = gather.get("subject")
    if not subject or not subject.get("name"):
        print(json.dumps({"error": "gather output missing embedded subject"}))
        return 2

    scored = []
    for s in gather["signals"]:
        s["identityMatchConfidence"] = score_signal(s, subject)
        if s["identityMatchConfidence"] >= DROP_THRESHOLD:
            scored.append(s)

    scored.sort(key=lambda s: -s["identityMatchConfidence"])

    out = {
        **gather,
        "signals": scored,
        "confidence": overall_confidence(scored),
        "scoredAt": datetime.now(timezone.utc).isoformat(),
    }

    out_path = OUTPUT_DIR / f"scored_{gather['briefId']}.json"
    with open(out_path, "w") as f:
        json.dump(out, f, indent=2)
    print(json.dumps({"briefId": gather["briefId"], "kept": len(scored), "confidence": out["confidence"]}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
