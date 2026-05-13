"""
gather_signals.py - Step 1+2 of the casting-research-brief pipeline.

Gates a brief request (consent, age, role, cache freshness), then fetches
public-internet signals in parallel across the tiered source matrix.

NEVER queries Tier E sources. NEVER persists raw signals about minors.
Outputs: output/gather_{briefId}.json with the raw signal array.

Per safe-edit-policy: this is a scaffold. Wiring to live Mythie Firestore
+ third-party APIs is a Manual Task.
"""

import argparse
import hashlib
import json
import os
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

TIER_E_BLOCKLIST = {
    "nsopw", "sex_offender_registry", "dmv", "driving_records",
    "credit_report", "credit_header", "criminal_records",
    "spokeo", "beenverified", "truthfinder", "intelius", "whitepages_paid",
    "darkweb_breach",
}

# Workspace plan tiers ranked low -> high. Briefs require >= MIN_TIER.
# Adopting apps override via RESEARCH_BRIEF_PLAN_TIERS env (JSON map) +
# RESEARCH_BRIEF_MIN_TIER env. Defaults shown match the CastHub1 reference.
_DEFAULT_TIERS = {
    "free": 0,
    "trial": 0,
    "casting_starter": 1,
    "casting_pro": 2,
    "casting_enterprise": 3,
}
try:
    PLAN_TIER_RANK = json.loads(os.environ.get("RESEARCH_BRIEF_PLAN_TIERS", ""))
    if not isinstance(PLAN_TIER_RANK, dict):
        PLAN_TIER_RANK = _DEFAULT_TIERS
except (json.JSONDecodeError, TypeError):
    PLAN_TIER_RANK = _DEFAULT_TIERS

MIN_TIER = os.environ.get("RESEARCH_BRIEF_MIN_TIER", "casting_pro")
SUBJECT_KIND = os.environ.get("RESEARCH_BRIEF_SUBJECT_KIND", "talent")
REQUIRED_ROLE = f"{SUBJECT_KIND}_research:read"


def fingerprint(name: str, dob: str, city: str) -> str:
    raw = f"{name.lower().strip()}|{dob.strip()}|{city.lower().strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def gate(subject: dict, requester: dict, cache: dict) -> tuple[bool, str]:
    """Returns (allowed, reason). All checks must pass."""
    # Age gate
    dob = subject.get("dateOfBirth")
    if dob:
        born = datetime.fromisoformat(dob).date()
        today = datetime.now(timezone.utc).date()
        age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
        if age < 18:
            return False, "subject_under_18"

    # Talent opt-out
    if subject.get("privacy", {}).get("allowResearch") is False:
        return False, "subject_opted_out"

    # Requester role (derived from configured subject kind)
    if REQUIRED_ROLE not in requester.get("roles", []):
        return False, "requester_missing_role"

    # Workspace plan tier (this feature costs money to run; gated to paid tiers)
    workspace_tier = requester.get("workspacePlanTier", "free")
    if PLAN_TIER_RANK.get(workspace_tier, 0) < PLAN_TIER_RANK.get(MIN_TIER, 2):
        return False, "workspace_plan_below_tier"

    # Per-requester rate limit (caller passes counts via `cache`)
    if cache.get("requesterBriefsToday", 0) >= 20:
        return False, "rate_limit_daily"
    if cache.get("requesterBriefsThisMonth", 0) >= 100:
        return False, "rate_limit_monthly"

    # Per-subject-per-requester cooldown: 7 days
    last = cache.get("lastBriefForThisSubjectByRequester")
    if last:
        last_dt = datetime.fromisoformat(last)
        if (datetime.now(timezone.utc) - last_dt) < timedelta(days=7):
            return False, "use_cached_brief"

    return True, "ok"


def gather_tier_a(subject: dict) -> list[dict]:
    """OpenSanctions + Google PSE. Scaffold - real impl calls APIs."""
    # MANUAL TASK: Wire OpenSanctions (https://api.opensanctions.org) and PSE.
    return []


def gather_tier_b(subject: dict) -> list[dict]:
    """GDELT + NewsAPI. Scaffold."""
    # MANUAL TASK: Wire GDELT 2.0 doc API + NewsAPI /everything.
    return []


def gather_tier_c(subject: dict) -> list[dict]:
    """CourtListener public civil docket references. Scaffold."""
    # MANUAL TASK: Wire CourtListener REST API.
    # CRITICAL: every signal returned here MUST be tagged
    # kind = "civil_docket_reference" and rendered in the brief
    # as "public mention in court records", never as a criminal record.
    return []


def gather_tier_d(subject: dict) -> list[dict]:
    """Public social presence (IG, TikTok, LinkedIn, X). Scaffold."""
    # MANUAL TASK: Wire public web fetch with strict rate limits
    # (1 fetch per talent per 24h). Never store DMs, private posts,
    # follower lists, or contact data.
    return []


def gather(subject: dict) -> list[dict]:
    """Fan-out across the four allowed tiers. NEVER calls Tier E."""
    signals = []
    signals.extend(gather_tier_a(subject))
    signals.extend(gather_tier_b(subject))
    signals.extend(gather_tier_c(subject))
    signals.extend(gather_tier_d(subject))

    # Belt-and-braces guard: drop anything that smells Tier-E even if
    # somehow returned by a misconfigured source.
    safe = []
    for s in signals:
        src = (s.get("source") or "").lower()
        kind = (s.get("kind") or "").lower()
        if any(blocked in src or blocked in kind for blocked in TIER_E_BLOCKLIST):
            continue
        safe.append(s)
    return safe


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to gate-input JSON {subject, requester, cache}")
    parser.add_argument("--gate-only", action="store_true")
    args = parser.parse_args()

    with open(args.input) as f:
        ctx = json.load(f)

    subject = ctx["subject"]
    requester = ctx["requester"]
    cache = ctx.get("cache", {})

    allowed, reason = gate(subject, requester, cache)
    if not allowed:
        print(json.dumps({"gate": "denied", "reason": reason}))
        return 0 if reason == "use_cached_brief" else 2

    if args.gate_only:
        print(json.dumps({"gate": "ok"}))
        return 0

    brief_id = hashlib.sha256(
        f"{fingerprint(subject['name'], subject.get('dateOfBirth', ''), subject.get('city', ''))}|{requester['orgId']}|{datetime.now(timezone.utc).date().isoformat()}".encode("utf-8")
    ).hexdigest()[:24]

    signals = gather(subject)

    # The intermediate gather output carries the disambiguation fields
    # (name, city, profession) so downstream score + summarise can read
    # them without a second file. DOB is intentionally NOT carried -
    # it has done its job at the age gate and is not needed downstream.
    subject_for_pipeline = {
        "subjectId": subject.get("subjectId") or subject.get("talentId"),
        "subjectKind": subject.get("subjectKind") or SUBJECT_KIND,
        "name": subject["name"],
        "city": subject.get("city"),
        "profession": subject.get("profession"),
    }

    out = {
        "briefId": brief_id,
        "subject": subject_for_pipeline,
        "subjectId": subject_for_pipeline["subjectId"],
        "subjectKind": subject_for_pipeline["subjectKind"],
        "subjectFingerprint": fingerprint(subject["name"], subject.get("dateOfBirth", ""), subject.get("city", "")),
        "requestedBy": requester["uid"],
        "requestedByOrg": requester["orgId"],
        "signals": signals,
        "gatheredAt": datetime.now(timezone.utc).isoformat(),
    }

    out_path = OUTPUT_DIR / f"gather_{brief_id}.json"
    with open(out_path, "w") as f:
        json.dump(out, f, indent=2)
    print(json.dumps({"briefId": brief_id, "signalCount": len(signals), "out": str(out_path)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
