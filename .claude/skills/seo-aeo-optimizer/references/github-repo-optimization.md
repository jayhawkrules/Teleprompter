# GitHub Repository Optimization (Phase 9)

Discoverability for the **repo itself** — distinct from the deployed app's SEO. GitHub repos are crawled by Google, surfaced in GitHub's own search, and increasingly cited by AI coding assistants (Cursor, Copilot, Claude Code) when answering "is there an open-source tool that does X?".

This phase only applies to **public** repos. Skip for private repos — no discoverability surface to optimize.

---

## Repo description (the short tagline)

| Field | Value |
|---|---|
| Rule | Description field is populated; ≤ 350 chars (GitHub's limit); keyword-rich; written as a sentence, not bullet points; no marketing fluff |
| Where | Repo home page → "About" panel (gear icon) → Description |
| Validator | `gh repo view <owner>/<name> --json description` (manual; not a CI check) |
| Common failures | Empty, "TODO write description", duplicated README first line verbatim |

Pattern: `[App] is a [category] for [audience] that [primary capability]. [Tech / deployment / status note].`

Example (Mythie / CastHub1):
> Mythie is a reality TV casting discovery app for filmmakers and aspiring cast members. Built on React + Firebase, deployed at mythie.app. Active development.

---

## Topics / tags

| Field | Value |
|---|---|
| Rule | At least 5 topics; ≤ 20 (GitHub's limit); lowercase, hyphenated; include both tech and domain terms |
| Where | Repo home page → "About" panel → topic chips |
| Common failures | Only tech topics (`react`, `typescript`) with no domain terms; or only domain terms with no tech terms — both narrow your discoverability surface |

Pick from three buckets:

1. **Tech stack** — `react`, `vite`, `typescript`, `firebase`, `tailwindcss`, `nextjs`, `stripe`, `capacitor`
2. **Domain / problem** — `casting-calls`, `reality-tv`, `film-festival`, `awards-submission`, `production-tools`
3. **Audience / use case** — `filmmakers`, `producers`, `indie-film`, `creator-tools`, `entertainment-industry`

Per-portfolio-app suggestions live in `templates/repo-topics.json` (if curated; otherwise the skill suggests based on `package.json` deps + the app's README).

---

## README.md structure for discoverability

GitHub's README is the canonical "what is this" surface. It is rendered on the repo home page, in search results, and on the user's profile if pinned. AI coding tools index it directly.

Required structure (in order):

1. **H1** — app name only (`# Mythie`). Do not add taglines to the H1; GitHub uses it as the page title.
2. **One-line description** — same as the GitHub "About" tagline. Italic or plain, not a heading.
3. **Badges row** (optional but recommended) — CI status, license, version, deployment URL. Use shields.io.
4. **Hero image or animated GIF** — show the app running. Place above the fold (first 800px) so it appears in the rendered preview card on social shares.
5. **Prominent live-app link** — `[Try it live](https://app.example.com)` within the first 3 lines after the hero. AI tools follow this when they cite the repo.
6. **"What it does"** — `## What it does` section. 3–5 bullets covering primary capabilities. Keyword-rich.
7. **"Who it's for"** — `## Who it's for` section. 1–2 sentences naming the target user.
8. **"Tech stack"** — `## Tech stack` bullets. Helps tech-search discoverability.
9. **Installation / quickstart** — even if the live app is the primary surface, include a 3-step local-dev quickstart.
10. **License** — `## License` with a link to `LICENSE` file. Repos without a license are not legally reusable and rank lower in search.

What NOT to put in the README:
- Marketing-only copy ("revolutionary", "best-in-class") — flagged by `safety-guardrails.md`.
- Invented stats or testimonials.
- Outdated screenshots (rotate on major UI changes; flag for human if last-updated > 6 months).
- Internal-only info (Firestore project IDs, API keys, vendor account numbers).

---

## CNAME file (only for GitHub Pages deployments)

| Field | Value |
|---|---|
| Rule | If the repo is deployed via GitHub Pages with a custom domain, `/CNAME` contains the bare domain (no protocol, no trailing slash) |
| Common failures | Includes `https://`, includes trailing `/`, points to wrong subdomain, missing entirely after a Pages redeploy |

Skip this if the app deploys to Firebase Hosting, Vercel, Railway, etc. — those have their own custom-domain panels.

---

## Pinned repos on the org/user profile

Out of scope for auto-fix, but flag for human review if the org profile (`github.com/jayhawkrules` or `github.com/[org]`) does not pin the user's revenue-bearing repos. Pinned repos appear in:
- The org/user profile page (top 6 slots)
- GitHub search results for the user's name
- Some AI tools' "what does this developer make?" responses

---

## Workflow

When the skill runs Phase 9 against a repo:

1. **Detect public/private** — `gh repo view --json visibility`. Skip if private.
2. **Audit current state** — pull description, topics, README first 50 lines.
3. **Pass/fail checklist** — Phase 9 is tracked as a binary checklist in the PR body, not folded into the 100-point page-score rubric. Repo metadata is per-repo (not per-page) so it doesn't fit the same scoring axis. The checklist:
   - [ ] Description populated (≤ 350 chars, sentence form)
   - [ ] ≥ 5 topics including both tech and domain terms
   - [ ] README has H1, one-line description, live-app link in first 3 lines, "What it does", "Who it's for", "Tech stack", and a LICENSE link
   - [ ] CNAME present and correct (GitHub Pages only)
4. **Generate proposed changes** — never auto-apply description / topic changes (they're metadata; the user controls them via UI or `gh repo edit`). README changes go in the PR.
5. **Surface manual tasks** — for description / topics, emit:
   > **MANUAL TASK**: Update repo description and topics at `https://github.com/<owner>/<repo>` → "About" gear icon. Suggested values: [...]
6. **PR README changes** — go through the standard PR flow per `safety-guardrails.md` (no auto-commit to main).

---

## Output

- README.md changes → PR (auto-commit only inside the feature branch)
- Description / topics / pinned-repos changes → **MANUAL TASK** in the PR body, never auto-applied via `gh repo edit` without explicit user authorization

---

## Common mistakes

1. **Auto-running `gh repo edit --description "..."`** — never. Description is owned by the user; suggest, don't impose.
2. **Stuffing topics with irrelevant tech** — GitHub down-ranks topic spam. Use ≤ 20 and keep each one accurate.
3. **Putting the live-app link in the footer of the README** — AI tools and casual readers don't scroll. Put it in the first 3 visible lines.
4. **Adding shields.io badges for vendors you don't actually use** — sets up later embarrassment when the badge 404s. Only add badges for live services.
5. **Forgetting the `LICENSE` file** — repos without one are not reusable. Default to MIT or Apache-2.0 unless the user has a stated reason to choose otherwise.
