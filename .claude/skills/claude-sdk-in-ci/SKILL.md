---
name: claude-sdk-in-ci
description: Use when adding Claude-powered automation to GitHub Actions, cron jobs, or any unattended pipeline in a portfolio repo. Wraps the Claude Code SDK (`claude -p --output-format json`) as a "super-intelligent Unix utility" — fed via stdin or args, returns structured JSON, can be piped/jq'd/scripted. Use cases - issue triage and labeling, Sentry/error-tracking digest, log spike summarization, release notes generation, Resend/Stripe webhook event classification, the CastHub1 self-heal 3-tier escalation, weekly portfolio digest. Includes cost guardrails (per-run token budget, model selection), failure-mode handling (timeout, retry, partial output), and the standard GitHub Actions secret pattern (ANTHROPIC_API_KEY). Keywords - claude -p, Claude Code SDK, headless Claude, agentic CI, GitHub Action Claude, label-issues, error-summary, log analysis, release notes, headless, unattended, automation, stdin, jq, structured output.
version: 0.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# Claude SDK in CI

The Claude Code SDK (`claude -p`) is what Anthropic uses internally for issue labeling, incident response, and CI workflows. It's the same engine as interactive Claude Code, but headless: takes a prompt, returns text or JSON, exits. Pipes in. Pipes out. Treat it as a Unix utility that happens to be intelligent.

Boris's pitch from Code with Claude 2026: *"You can read from a GCP bucket, read a giant log and pipe it in and tell Claude to figure out what's interesting about this log. You can fetch data from the Sentry CLI. You can pipe it in and have Claude do something with it."*

This skill turns that pitch into concrete, copy-pasteable Actions for the portfolio.

## When to use

- Adding any GitHub Action that needs LLM judgment (triage, classification, summarization, content generation)
- Replacing hand-rolled `jq` + regex pipelines that try to extract structure from logs/issues/errors
- Building the self-heal 3-tier escalation (CastHub1 PR-2/3/4 queue per [[project_self_heal_3_tier_spec]])
- Generating release notes, weekly digests, or status rollups
- Classifying Resend webhook events, CRM-ai inbound events, etc.

## When NOT to use

- Anything safety-critical that needs deterministic output (use deterministic parsing)
- High-frequency hot paths (>100/min) — token cost will dominate
- Tasks a regex one-liner handles fine (don't over-engineer)
- Anything that needs to run on an air-gapped runner (SDK calls Anthropic API)

## The basic shape

```bash
echo "<input>" | claude -p "<instruction>" --output-format json
```

Output is JSON with `result`, `cost_usd`, `duration_ms`, `num_turns`. Pipe to `jq`:

```bash
echo "$LOG" | claude -p "Identify the 3 most-frequent error signatures. Return JSON array of {signature, count, severity}." --output-format json \
  | jq -r '.result' \
  | jq '.[] | select(.severity == "high")'
```

## Standard GitHub Actions setup

Every portfolio repo using `claude -p` in CI follows this pattern:

### Secret

`ANTHROPIC_API_KEY` set as a repo secret (or org-level for portfolio rollout). Per [[feedback_vendor_consolidation]] this is already the house key.

### Install step

```yaml
- name: Install Claude Code
  run: npm install -g @anthropic-ai/claude-code
  # or pin: npm install -g @anthropic-ai/claude-code@<version>
```

### Run step

```yaml
- name: Run Claude analysis
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    echo "${{ github.event.issue.body }}" \
      | claude -p "Classify this issue. Return JSON {category, severity, suggested_labels}." \
      --output-format json \
      > result.json
```

### Always pin a model and a budget

```yaml
run: |
  echo "$INPUT" | claude -p "$PROMPT" \
    --model claude-haiku-4-5-20251001 \
    --max-turns 3 \
    --output-format json
```

- **Model**: default to `claude-haiku-4-5-20251001` for triage/classification (cheap, fast, fine for these tasks). Step up to Sonnet only when accuracy demands it. Almost never Opus in CI — too expensive for unattended runs.
- **`--max-turns`**: caps the agent loop. For pure classification, `--max-turns 1` is enough. For tasks that need to read files, `--max-turns 3-5`.

## Recipes

### 1. Issue triage / auto-labeling

Boris's Anthropic example. Fires on `issues.opened`:

```yaml
name: Triage new issues
on:
  issues:
    types: [opened]
jobs:
  triage:
    runs-on: ubuntu-latest
    permissions:
      issues: write
    steps:
      - name: Install Claude Code
        run: npm install -g @anthropic-ai/claude-code
      - name: Classify and label
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          ISSUE_BODY: ${{ github.event.issue.body }}
          ISSUE_TITLE: ${{ github.event.issue.title }}
        run: |
          LABELS=$(echo "Title: $ISSUE_TITLE\n\nBody: $ISSUE_BODY" \
            | claude -p "Read this GitHub issue and return ONLY a JSON array of labels from: bug, feature, docs, ci, security, monetization, ux. No prose, just JSON." \
            --model claude-haiku-4-5-20251001 \
            --max-turns 1 \
            --output-format json \
            | jq -r '.result' \
            | jq -r 'join(",")')
          gh issue edit ${{ github.event.issue.number }} --add-label "$LABELS"
```

### 2. Error-tracking digest (the self-heal 3-tier path)

Maps to [[project_self_heal_3_tier_spec]] PR-2 (auto-PR tier). Cron-fired, reads new error groups from Firestore, asks Claude what to do:

```yaml
- name: Triage error groups
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    node scripts/fetch-error-groups.js > errors.json
    cat errors.json | claude -p "$(cat prompts/error-triage.md)" \
      --model claude-sonnet-4-6 \
      --max-turns 5 \
      --output-format json \
      > triage.json
    node scripts/dispatch-triage.js triage.json
```

`prompts/error-triage.md` lives in the repo, version-controlled, contains the policy: "tier 1 auto-PR for typos and null guards; tier 2 magic-link SMS for ambiguous; tier 3 GitHub issue for everything else."

### 3. Release notes generation

Fires on push to `main` matching a tag:

```yaml
- name: Generate release notes
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: |
    git log --oneline ${{ github.event.before }}..HEAD \
      | claude -p "Group these commits by theme (Features, Fixes, Chores). Write 1-line user-facing summaries. Skip dependency bumps. Output markdown." \
      --model claude-haiku-4-5-20251001 \
      --max-turns 1 \
      > RELEASE_NOTES.md
    gh release create v${{ github.run_number }} --notes-file RELEASE_NOTES.md
```

### 4. Resend / webhook event classification

For routing CRM-ai inbound events:

```bash
echo "$WEBHOOK_BODY" | claude -p "Classify this event as one of: signup, payment, cancellation, support, marketing, spam. Return JSON {category, confidence, action}." \
  --model claude-haiku-4-5-20251001 \
  --max-turns 1 \
  --output-format json
```

### 5. Weekly portfolio digest

Cron Monday morning, per [[project_marathon_session_2026_05_17]] operating rhythm:

```yaml
schedule:
  - cron: '0 13 * * 1'  # Monday 9am ET
```

```bash
# Pull last week's activity across all 23 repos
for repo in $(cat repos.txt); do
  gh -R "$repo" pr list --state merged --search "merged:>$(date -v-7d +%Y-%m-%d)" --json title,url,mergedAt
done > activity.json

cat activity.json | claude -p "Summarize the past week's shipped work across the portfolio. Group by repo. Flag any repo with zero merged PRs as 'stalled'. Output markdown." \
  --model claude-sonnet-4-6 \
  --max-turns 3 \
  > weekly-digest.md

# Email it via Resend
node scripts/send-digest.js weekly-digest.md
```

## Cost discipline

The portfolio runs many of these. Apply these rules:

1. **Pick the cheapest model that meets quality** — Haiku for classify/label, Sonnet for reasoning, Opus essentially never in CI.
2. **Cap `--max-turns`** — most CI tasks need 1, occasionally 3-5. Anything needing >10 turns should probably not be in CI.
3. **Pre-filter inputs** — don't pipe a 50MB log into Claude. Use `tail`, `grep`, `jq` first to narrow.
4. **Cache results** — if the same input fires the same workflow twice (PR push), check Actions cache first.
5. **Log `cost_usd` from JSON output** — track over time. If a workflow's cost climbs, audit it.

Standard cost-logging step:
```yaml
- name: Record cost
  run: |
    COST=$(jq -r '.cost_usd' result.json)
    echo "Run cost: \$$COST" >> $GITHUB_STEP_SUMMARY
```

## Failure modes + handling

| Failure | Detection | Recovery |
|---|---|---|
| API timeout | exit code non-zero | `set +e` → retry once → fall through to default behavior (e.g., apply no labels, don't fail the workflow) |
| Hit rate limit | `429` in stderr | Backoff + retry once; if still failing, log and skip |
| Invalid JSON output | `jq` parse error | Re-prompt with stricter "JSON ONLY no prose" instruction, or fall back to no-op |
| Empty result | `.result == ""` | Treat as "no opinion", apply no labels / take no action |
| Cost blew budget | `.cost_usd > $0.10` | Alert via PostHog/error-tracker; consider model downgrade |

Boilerplate:
```bash
RESULT=$(echo "$INPUT" | claude -p "$PROMPT" --output-format json 2>&1) || {
  echo "::warning::Claude SDK call failed: $RESULT"
  exit 0  # don't fail the workflow on Claude error
}
```

## Composability with shipping-efficiency-budget

[[shipping-efficiency-budget]] Pillar 1 says: collapse multiple cron workflows into one workflow-with-branched-jobs. Apply that here:

```yaml
on:
  schedule:
    - cron: '0 13 * * 1'   # weekly digest
    - cron: '0 */4 * * *'  # error triage every 4h
    - cron: '0 6 * * *'    # daily release notes draft

jobs:
  weekly-digest:
    if: github.event.schedule == '0 13 * * 1'
    # ...
  error-triage:
    if: github.event.schedule == '0 */4 * * *'
    # ...
  release-notes-draft:
    if: github.event.schedule == '0 6 * * *'
    # ...
```

One workflow file, three Claude-powered jobs, gated by `github.event.schedule`. Pairs with the existing CastHub1 `scheduled-jobs.yml`.

## Per-repo adoption priority

1. **CastHub1** — self-heal PR-2/3/4 directly uses this skill. Highest leverage.
2. **CRM-ai** — universal inbound webhook event classification fits perfectly.
3. **awardssubmission** (Aclamos) — Resend migration cleanup logs are a natural input.
4. **Any repo with GitHub Issues** — auto-triage is portable, low-cost, high-value.
5. **toronadoentertainment.com / Mythie marketing site** — weekly SEO digest, Lighthouse triage.

## Forbidden uses

- **Never** use Claude to merge PRs or push to main unattended.
- **Never** pipe secrets / API keys / PII into the prompt — they go to Anthropic's API.
- **Never** chain `claude -p` calls in a tight loop without budget caps.
- **Never** trust JSON output without `jq` validation — schema-check before acting on it.

## Related skills

- [[shipping-efficiency-budget]] — consolidate the cron workflows
- [[ci-gate-builder]] — for the surrounding CI structure
- [[error-tracking-system]] — provides the input data for the error-triage job
- [[claude-api]] — for non-SDK use (e.g., from app code via @anthropic-ai/sdk)
- [[safe-edit-policy]] — same no-fake-completion rules apply in CI

## Source of truth

- SDK reference: Boris Cherny, Code with Claude 2026 — "Claude Code SDK" segment (~22:00)
- Self-heal spec: `~/GitHub/CastHub1/docs/strategy/error-self-heal-3-tier-escalation-spec.md`
- House LLM vendor: per [[feedback_vendor_consolidation]], Anthropic only (no OpenAI fallback unless explicitly approved)
