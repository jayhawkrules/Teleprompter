#!/usr/bin/env python3
"""
score_trust.py - Step 3 of the reality-casting-scout pipeline.

Scores each normalised listing for trustworthiness, classifies the decision,
and partitions records into auto-publishable vs admin-review vs quarantined.

Public entrypoints:
  - score_record(record)              -> dict (record with trust fields appended)
  - score_batch(records)              -> list[dict]
  - normalise_and_score(records, output_dir) -> summary dict
"""

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("scout.score")


WEIGHTS = {
    "tier_1_domain": 45,
    "tier_2_domain": 30,
    "tier_3_domain": 15,
    "network_field_set": 10,
    "casting_company_set": 8,
    "apply_url_https": 5,
    "apply_url_matches_source_tier": 10,
    "deadline_parsed": 5,
    "pay_disclosed": 5,
    "description_length_ok": 5,
    "buzzword_present": -10,
    "social_only_source": -25,
    "multi_source_corroboration": 15,
    # PR /99it Phase C3 (lands work that PR BM specced 2026-05-17 but
    # never shipped — see tests/regression/scout-trusted-apply-BM.test.ts).
    # A listing discovered on social (IG/TikTok) whose applyUrl points
    # to a trusted intake gets +30 — the apply form is where the
    # legitimacy lives, regardless of where the listing was first
    # surfaced. Per Andrew's 2026-05-17 directive: social media is the
    # MAIN discovery path, but the apply URL is what we actually need
    # to vouch for. See the trusted-apply set below.
    "trusted_apply_domain": 30,
}


TRUSTED_DOMAINS = {
    1: {
        "abc.com", "bravotv.com", "netflix.com", "cbs.com", "nbc.com",
        "mtv.com", "discovery.com", "tlc.com", "hbo.com", "hulu.com",
        "fox.com", "peacocktv.com", "paramountplus.com",
    },
    2: {
        "projectcasting.com", "backstage.com", "castingnetworks.com",
        "auditionsfree.com", "lacasting.com",
    },
    3: {
        # PR /99it Phase C3 — v2 changelog promised these four;
        # BM specced them; finally landed here.
        "castlyst.com", "castitreach.com", "realitytalentsearch.com",
        "castingcrane.com", "castingfrontier.com",
        "mandy.com", "stage32.com",
    },
}


# PR /99it Phase C3 — trusted-apply-URL boost (PR BM spec finally landed).
#
# When a Tier 4 (social) listing's applyUrl points to one of these
# domains, the listing earns +WEIGHTS["trusted_apply_domain"] AND the
# social-only score cap is lifted from 40 → SOCIAL_ONLY_TRUSTED_APPLY_CAP
# (75). The legitimacy floor on a casting call is the apply form, not
# the discovery surface.
#
# Curation rules:
#   - Only operate-the-form domains qualify (you click and the actual
#     casting-call application loads, no hub/redirect step)
#   - linktr.ee / linkin.bio are explicitly excluded (hub shells, not
#     forms) — see _is_aggregator_hub() below
#   - Industry-vetted CD platforms: castitreach, castingcrane,
#     castingnetworks, projectcasting, backstage, castingfrontier,
#     stage32, mandy. Most overlap TRUSTED_DOMAINS but kept distinct
#     here so a Tier-4-on-social-discovered listing that links to one
#     gets the +30 even when the discovery source is just an IG post.
TRUSTED_APPLY_DOMAINS = {
    "castitreach.com", "castingcrane.com", "castingnetworks.com",
    "projectcasting.com", "backstage.com", "castingfrontier.com",
    "stage32.com", "mandy.com", "auditionsfree.com", "lacasting.com",
}


# Explicit deny-list for hub/redirect shells. A social post whose
# applyUrl is linktr.ee/foo isn't applying TO linktr.ee — it's redirecting
# elsewhere, and that elsewhere could be anything. Treat as untrusted
# until the redirect target itself is one of TRUSTED_APPLY_DOMAINS.
AGGREGATOR_HUB_DOMAINS = {
    "linktr.ee", "linkin.bio", "beacons.ai", "bio.link", "lnk.bio",
    "carrd.co", "msha.ke",
}


# When the applyUrl matches TRUSTED_APPLY_DOMAINS, social-only listings
# lift past the default 40 cap — corroborated-by-form is a stronger
# signal than corroborated-by-second-social-post. 75 was BM's spec
# (tested in scout-trusted-apply-BM.test.ts):
SOCIAL_ONLY_TRUSTED_APPLY_CAP = 75


SOCIAL_DOMAINS = {
    "instagram.com", "tiktok.com", "facebook.com", "fb.com",
    "x.com", "twitter.com", "threads.net",
}


RED_FLAG_PATTERNS = [
    r"pay.*fee",
    r"admin.*fee",
    r"secure your spot",
    r"registration.*cost",
    r"send.*money",
    r"upfront.*payment",
    r"headshot.*package.*required",
    r"pay to audition",
    r"pay.*apply",
]


BUZZWORD_PATTERNS = [
    r"once[-\s]in[-\s]a[-\s]lifetime",
    r"life[-\s]changing opportunity",
    r"guaranteed (?:fame|stardom|exposure)",
    r"too good to (?:miss|be true)",
    r"exclusive offer just for you",
]


def _domain(url: str) -> str:
    if not url:
        return ""
    return urlparse(url).netloc.lower().replace("www.", "")


def _source_tier(record: dict[str, Any]) -> int:
    tier_hint = record.get("sourceTier")
    if tier_hint in (1, 2, 3):
        return tier_hint
    src = _domain(record.get("sourceUrl", ""))
    apply_dom = _domain(record.get("applyUrl", ""))
    for tier, domains in TRUSTED_DOMAINS.items():
        if any(src.endswith(d) for d in domains) or any(apply_dom.endswith(d) for d in domains):
            return tier
    return 0


def _is_social_only(record: dict[str, Any]) -> bool:
    sources = record.get("sourcesSeen") or [record.get("sourceUrl", "")]
    domains = {_domain(s) for s in sources if s}
    if not domains:
        return False
    return all(any(d.endswith(soc) for soc in SOCIAL_DOMAINS) for d in domains)


def _check_red_flags(record: dict[str, Any]) -> list[str]:
    haystack = " ".join([
        record.get("description", "") or "",
        record.get("pay", "") or "",
        record.get("applyUrl", "") or "",
    ]).lower()
    return [pat for pat in RED_FLAG_PATTERNS if re.search(pat, haystack, flags=re.IGNORECASE)]


def _check_buzzwords(record: dict[str, Any]) -> list[str]:
    haystack = (record.get("description", "") or "").lower()
    return [pat for pat in BUZZWORD_PATTERNS if re.search(pat, haystack, flags=re.IGNORECASE)]


def _tier_to_score(tier: int) -> tuple[int, str]:
    if tier == 1:
        return WEIGHTS["tier_1_domain"], "tier 1 network domain"
    if tier == 2:
        return WEIGHTS["tier_2_domain"], "tier 2 aggregator domain"
    if tier == 3:
        return WEIGHTS["tier_3_domain"], "tier 3 specialist domain"
    return 0, ""


def score_record(record: dict[str, Any]) -> dict[str, Any]:
    reasons: list[str] = []
    red_flags = _check_red_flags(record)
    buzzwords = _check_buzzwords(record)

    score = 0
    tier = _source_tier(record)
    tier_pts, tier_reason = _tier_to_score(tier)
    if tier_pts:
        score += tier_pts
        reasons.append(tier_reason)

    if record.get("network"):
        score += WEIGHTS["network_field_set"]
        reasons.append("network field populated")
    if record.get("castingCompany"):
        score += WEIGHTS["casting_company_set"]
        reasons.append("casting company named")
    if (record.get("applyUrl") or "").startswith("https://"):
        score += WEIGHTS["apply_url_https"]
        reasons.append("apply url uses https")
    if tier and _domain(record.get("applyUrl", "")) in TRUSTED_DOMAINS.get(tier, set()):
        score += WEIGHTS["apply_url_matches_source_tier"]
        reasons.append("apply url matches source tier")
    if record.get("deadline"):
        score += WEIGHTS["deadline_parsed"]
        reasons.append("deadline parsed")
    if record.get("pay"):
        score += WEIGHTS["pay_disclosed"]
        reasons.append("pay/compensation disclosed")
    if len((record.get("description") or "").strip()) >= 80:
        score += WEIGHTS["description_length_ok"]
        reasons.append("description >= 80 chars")
    if buzzwords:
        score += WEIGHTS["buzzword_present"] * len(buzzwords)
        reasons.append(f"buzzwords matched ({len(buzzwords)})")

    is_social_only = _is_social_only(record)
    if is_social_only:
        score += WEIGHTS["social_only_source"]
        reasons.append("social-only source - capped at admin review")

    # PR /99it Phase C3 — trusted-apply-URL boost. Even if discovery was
    # social, if the apply form lands on a legitimate CD intake the
    # listing earns +30 and we lift the social-only cap. linktr.ee /
    # linkin.bio hubs explicitly excluded.
    apply_domain = _domain(record.get("applyUrl", ""))
    apply_is_hub = any(apply_domain.endswith(h) for h in AGGREGATOR_HUB_DOMAINS)
    apply_is_trusted = (
        not apply_is_hub
        and any(apply_domain.endswith(d) for d in TRUSTED_APPLY_DOMAINS)
    )
    if apply_is_trusted:
        score += WEIGHTS["trusted_apply_domain"]
        reasons.append(f"applyUrl on trusted form ({apply_domain})")
    elif apply_is_hub:
        reasons.append(f"applyUrl is a hub redirect ({apply_domain}) - no trust boost")

    sources_seen = record.get("sourcesSeen") or []
    distinct_domains = {_domain(s) for s in sources_seen if s}
    if len(distinct_domains) >= 2:
        score += WEIGHTS["multi_source_corroboration"]
        reasons.append("corroborated across multiple sources")

    score = max(0, min(100, score))
    if is_social_only:
        # PR /99it Phase C3 — social-only-with-trusted-apply cap is 75
        # (BM spec). Without the trusted-apply signal, the original 40
        # cap holds — social posts without a legit apply form are
        # admin-review territory.
        cap = SOCIAL_ONLY_TRUSTED_APPLY_CAP if apply_is_trusted else 40
        score = min(score, cap)

    if red_flags:
        decision = "quarantined"
        tier_bucket = "quarantined"
        public_visible = False
        admin_required = False
    elif score >= 85 and not is_social_only:
        decision = "auto_approve"
        tier_bucket = "high"
        public_visible = True
        admin_required = False
    else:
        decision = "pending_admin_review"
        tier_bucket = "medium" if score >= 60 else "low"
        public_visible = False
        admin_required = True

    out = dict(record)
    out.update({
        "trustScore": score,
        "trustTier": tier_bucket,
        "decision": decision,
        "trustReasons": reasons,
        "redFlags": red_flags,
        "buzzwordsMatched": buzzwords,
        "publicVisible": public_visible,
        "adminApprovalRequired": admin_required,
        "moderatedAt": datetime.now(timezone.utc).isoformat(),
        "status": decision,
    })
    return out


def score_batch(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [score_record(r) for r in records]


def normalise_and_score(records: list[dict[str, Any]], output_dir: Path) -> dict[str, int]:
    scored = score_batch(records)

    auto = [r for r in scored if r["decision"] == "auto_approve"]
    review = [r for r in scored if r["decision"] == "pending_admin_review"]
    quarantined = [r for r in scored if r["decision"] == "quarantined"]

    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "auto_listings.json").write_text(json.dumps(auto, indent=2))
    (output_dir / "review_listings.json").write_text(json.dumps(review + quarantined, indent=2))

    print(f"✅ Auto-approve: {len(auto)}")
    print(f"⏳ Pending review: {len(review)}")
    print(f"\U0001f6ab Quarantined:  {len(quarantined)}")

    return {"auto": len(auto), "review": len(review), "quarantined": len(quarantined)}


if __name__ == "__main__":
    import sys
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "output" / "normalised_listings.json"
    records = json.loads(src.read_text())
    normalise_and_score(records, output_dir=src.parent)
