---
name: telnyx-messaging-setup
description: Use whenever a portfolio app needs to send SMS — promotional blasts, transactional notifications (2FA, order confirmations, casting-call alerts), or two-way messaging — via Telnyx. Covers the full setup contract: number + Messaging Profile + 10DLC campaign per traffic class, env-var naming, boot-time hardening that refuses to start in production without the required secrets, STOP/HELP webhook handler, delivery-receipt handler, and code-enforced compliance (brand + STOP instruction in every promotional body). Disambiguates transactional vs promotional traffic and the separate-number-per-class rule. Reference implementation at ~/GitHub/artas-sms. Complements payment-webhook-safety (signature verification, idempotency) and vendor-onboarding-walkthrough (initial Telnyx account setup). Keywords - Telnyx, SMS, 10DLC, A2P, messaging profile, STOP, HELP, opt-out, TCPA, CTIA, delivery receipt, DLR, signature verification, promotional, transactional, blast, two-way SMS.
version: 1.0.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Telnyx Messaging Setup

The pattern for wiring any portfolio app into Telnyx without leaving an open relay, getting a number deactivated for non-compliance, or routing marketing blasts through a number that also serves voice + customer-care texts.

Always load `safe-edit-policy` first.

## When to use

- A new app needs to send SMS — promotional, transactional, or both
- An existing app's Telnyx setup is missing webhook signature verification, STOP handling, or compliance enforcement
- Migrating subscribers from another SMS provider (Brilliant Mobile, Twilio, etc.)
- Adding a second number to an app that already has voice/general SMS so promotional traffic doesn't contaminate the main line's reputation

## When NOT to use

- The app only needs voice calling — use Telnyx's voice setup directly, this skill is messaging-only
- The app uses a different SMS provider and there's no plan to migrate — don't speculative-port
- Internal-only messaging (e.g. ops alerts to one phone number); over-engineering doesn't apply at that scale

## The disambiguation that matters first

**Separate the traffic classes onto separate numbers and separate Messaging Profiles. Always.**

| Traffic class | Examples | Number | Messaging Profile | 10DLC campaign type |
|---|---|---|---|---|
| **Voice + general 1:1 texts** | Inbound customer questions, owner replies, voicemail | The main number, kept on a "Conversational" or no-10DLC profile if low volume | `general` | None (P2P-shape) or Low-Volume Mixed |
| **Transactional** | 2FA codes, password reset, order confirmations, casting-call match alerts | A dedicated transactional number | `transactional` | "Account Notifications" or "Customer Care" |
| **Promotional** | Marketing blasts, weekly newsletters, drop announcements | A dedicated promotional number | `promotional` | "Marketing" / "Mixed Marketing" |

**Why this matters:**

1. A STOP on a marketing message must NOT silence the voice line or transactional alerts the user needs. Different numbers = different opt-out scopes.
2. Carrier reputation is per-number. If a marketing campaign gets carrier-filtered, you don't want 2FA codes from the same number going to the spam folder.
3. 10DLC campaign types have different throughput tiers. Transactional gets faster lanes than marketing; mixing them caps everything at the slowest tier.
4. TCPA consent records are scoped per campaign. Mixing transactional and promotional into one number muddies the consent paper trail.

**For ARTAS specifically (reference case):** the main ARTAS number stays on voice + general inbound/outbound texts. The artas-sms tool uses a separate `TELNYX_FROM_NUMBER` for promotional blasts. If transactional alerts are added later, that gets a third number.

## The env contract (canonical)

Every Telnyx-using app in the portfolio uses the same env var names. Don't invent variants per app.

```
TELNYX_API_KEY                 # v2 API key from portal
TELNYX_PUBLIC_KEY              # Ed25519 public key for webhook signature verification
TELNYX_MESSAGING_PROFILE_ID    # The Messaging Profile this app uses (one per traffic class)
TELNYX_FROM_NUMBER             # E.164, e.g. +15555550100 — the sender for THIS traffic class
RAILWAY_ENVIRONMENT            # "production" or "development" (Railway sets this; local dev sets it manually)
```

If the app handles multiple traffic classes from the same process (rare; usually a sign you should split), suffix:

```
TELNYX_FROM_NUMBER_TRANSACTIONAL=+15550000001
TELNYX_FROM_NUMBER_PROMOTIONAL=+15550000002
TELNYX_MESSAGING_PROFILE_ID_TRANSACTIONAL=...
TELNYX_MESSAGING_PROFILE_ID_PROMOTIONAL=...
```

**Anti-pattern: `TELNYX_PHONE_NUMBER`.** "Phone number" is ambiguous (sender? recipient? account number?). Always `TELNYX_FROM_NUMBER`.

## Boot-time hardening (non-negotiable in production)

The webhook MUST refuse to boot in production if signature verification can't work. An unverified webhook is an opt-out forgery surface: any attacker who guesses the URL can mark arbitrary subscribers as opted-out, or worse, replay a STOP from a known number to disable a legit user's transactional alerts.

```python
def _require_production_env() -> None:
    if os.getenv("RAILWAY_ENVIRONMENT") != "production":
        return
    required = ["TELNYX_API_KEY", "TELNYX_PUBLIC_KEY", "TELNYX_MESSAGING_PROFILE_ID"]
    missing = [v for v in required if not os.getenv(v, "").strip()]
    if missing:
        raise RuntimeError(
            "Refusing to start in production: missing required env vars: "
            + ", ".join(missing)
        )
    if not os.getenv("TELNYX_FROM_NUMBER", "").strip():
        log.warning(
            "TELNYX_FROM_NUMBER not set — opt-outs will be recorded but STOP/HELP "
            "replies will be skipped. Set after 10DLC number provisioning completes."
        )

_require_production_env()
```

**Why `TELNYX_FROM_NUMBER` is warn-only:** 10DLC number provisioning can lag deploy by days to weeks (especially right after a new brand registration). The webhook can still record `OptOut` rows without it — the OptOut is committed before the reply attempt — it just skips the STOP/HELP confirmation send. Refusing to boot would block opt-out recording, which is worse than skipping a confirmation reply.

**Why all three required vars are hard-required:** without `TELNYX_PUBLIC_KEY` the webhook is unsigned-accept; without `TELNYX_API_KEY` or `TELNYX_MESSAGING_PROFILE_ID` the STOP/HELP reply path crashes on first inbound — exactly the path that must never crash.

Test that all five boot scenarios behave correctly: dev passes silent, prod-all-missing raises with all 3 named, prod-partial raises with the specific missing var named, prod-warn-only passes with a logged warning, prod-fully-configured passes silent.

## Compliance enforcement (code-level, not policy-level)

Shared `compliance.py` module, imported by both the sender AND the AI generator:

```python
def assert_compliant(body: str) -> None:
    if not body or not body.strip():
        raise ComplianceError("Message body is empty")
    if len(body) > 160:
        raise ComplianceError(f"Message is {len(body)} chars, exceeds 160-char single-segment limit")
    if not has_brand(body):
        raise ComplianceError(f"Message must include brand name '{brand_name()}'")
    if not has_stop_instruction(body):
        raise ComplianceError("Message must include opt-out instruction")
```

**Promotional messages MUST contain:** brand name + STOP instruction + <=160 chars (single segment).
**Transactional messages MUST contain:** brand name + <=160 chars. STOP instruction is best-practice but not strictly required for true transactional one-offs; if you're unsure whether a message is transactional or promotional, treat it as promotional.

`assert_compliant()` runs in three places, all of which must agree:
1. AI generator (`scripts/generate_message.py`) — variants that fail get regenerated up to 3 times
2. Campaign creation (`scripts/send_blast.py --create`) — body checked before the Campaign row is persisted
3. Send loop start (`scripts/send_blast.py --campaign-id N`) — checked again before any Telnyx call, in case the row was edited in the DB after creation

## STOP / HELP webhook handler

```python
STOP_KEYWORDS = {"STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "STOPALL"}
HELP_KEYWORDS = {"HELP", "INFO"}

def _classify_keyword(text: str) -> str | None:
    first = (text or "").strip().split(maxsplit=1)[:1]
    if not first:
        return None
    token = first[0].upper().strip(".,!?")
    if token in STOP_KEYWORDS:
        return "STOP"
    if token in HELP_KEYWORDS:
        return "HELP"
    return None
```

**STOP handling sequence (order is load-bearing):**
1. Mark subscriber status = `opted_out` (idempotent — re-STOPs are fine)
2. Append a row to `opt_outs` with the raw inbound text + telnyx_message_id (legal evidence, never deleted)
3. Commit the DB transaction
4. THEN attempt to send the confirmation reply (wrapped in try/except — if Telnyx is down, the opt-out still stuck)

**The reply itself MUST come from the same number that sent the original message** (carriers strictly enforce this). That's another reason for one-number-per-traffic-class: the reply auto-routes via the per-class `TELNYX_FROM_NUMBER`.

## Delivery receipts (DLR)

Wire `message.sent` (provisional accepted by carrier) and `message.finalized` (delivered or final-failed) to update the `Send` audit row, keyed by `telnyx_message_id`. Without DLR storage you can't answer "did the campaign actually land" — only "did Telnyx accept the request."

```python
if event_type == "message.finalized":
    errors = payload.get("errors") or []
    to_block = (payload.get("to") or [{}])[0]
    status = to_block.get("status") or "finalized"
    if errors or status in ("delivery_failed", "sending_failed"):
        send.status = "failed"
        send.error_message = "; ".join(str(e) for e in errors)[:1000] if errors else status
    else:
        send.status = "delivered"
        send.delivered_at = datetime.utcnow()
```

## 10DLC throughput respect

Default `SEND_RATE_MPS=10`. Standard 10DLC campaigns (T1 tier, ~6K msg/day) tolerate ~10 messages/sec. Higher tiers (T2/T3) allow more, but don't crank `SEND_RATE_MPS` until Telnyx has actually confirmed your campaign tier upgrade — over-rate sends get carrier-filtered silently (delivered status from Telnyx, but the message never reaches the handset).

For 100K recipients at 10 MPS that's ~2h 47m wall-clock per campaign. Larger sends should be queued (Redis/Celery/Railway cron) rather than run as a single long-lived process.

## Provisioning sequence (do these in order)

1. **Brand registration** — Telnyx portal → Messaging → 10DLC → register the legal entity (Toronado Entertainment, LLC, or the specific brand). Takes 1–3 business days for The Campaign Registry (TCR) approval.
2. **Campaign registration** — once brand is approved, register a campaign per traffic class. Marketing campaigns get more scrutiny; transactional approves faster.
3. **Number purchase** — buy a number per traffic class. Don't share numbers across classes.
4. **Messaging Profile** — create one Profile per traffic class. Assign the number(s) and the matching 10DLC campaign.
5. **Public key** — Messaging → Public Key → copy. This is what gets pasted into `TELNYX_PUBLIC_KEY`.
6. **Webhook URL** — set on the Messaging Profile (NOT the number). Format: `https://<app-domain>/webhook/telnyx`. Enable events: `message.received`, `message.sent`, `message.finalized`.
7. **Deploy with hardening on** (`RAILWAY_ENVIRONMENT=production`). If any required env var is missing, the deploy will fail closed — that's the desired behavior.

## Reference implementation

`~/GitHub/artas-sms` is the canonical reference. Copy-shape the following files when bootstrapping a new app:

- `compliance.py` — brand + STOP + length enforcement, shared module
- `db/models.py` — Subscriber, Campaign, Send (audit log, unique per campaign+subscriber), OptOut (append-only)
- `webhook/app.py` — `_require_production_env()`, STOP/HELP routing, DLR handler, signature verification via `telnyx.Webhook.construct_event`
- `scripts/send_blast.py` — rate-limited send loop, compliance check at both create and send time
- `scripts/generate_message.py` — Claude-backed AI variant generation with compliance retry loop
- `scripts/import_csv.py` — E.164 normalization via `phonenumbers`, dedupe, opt-in metadata preservation
- `.env.example` — canonical env var names + production-hardening comment block
- `railway.json` + `Procfile` — Railway config matching the stack

## Common failure modes (and how to spot them)

| Symptom | Likely cause |
|---|---|
| Webhook 200s but no opt-out recorded | Signature verification disabled (unsigned-accept path); `TELNYX_PUBLIC_KEY` empty |
| First STOP crashes the webhook | Missing `TELNYX_MESSAGING_PROFILE_ID` or `TELNYX_API_KEY` (boot hardening would have caught this) |
| Telnyx accepts messages but recipients never receive | Carrier filtering — usually 10DLC campaign not yet approved, or `SEND_RATE_MPS` exceeded the campaign tier |
| Marketing blast tanks the main number's reputation | Traffic classes were not separated onto different numbers |
| STOP on marketing also silences 2FA | Same number serving both classes — split immediately |
| `phone_number` errors on Telnyx API | Env var named `TELNYX_PHONE_NUMBER` instead of `TELNYX_FROM_NUMBER`; rename it |

## Related skills

- `payment-webhook-safety` — same signature-verification + idempotency contract, applied to payments. Read both before writing any webhook.
- `vendor-onboarding-walkthrough` — initial Telnyx account setup, brand registration, API key creation
- `legal-compliance-guardian` — annual TCPA / CTIA / CAN-SPAM audit of opt-in records and consent paper trail
- `monetization-readiness-review` — if SMS is part of the conversion funnel, audit alongside the rest of the revenue path
