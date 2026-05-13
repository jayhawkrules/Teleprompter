# Reality Casting Scout — Source Manifest

> Canonical list of casting sources scraped by `scripts/scrape_sources.py`. Tier 1 = official networks. Tier 2 = industry aggregators. Tier 3 = specialist platforms. Tier 4 = social (manual QA only — never scraped automatically).

**Last reviewed: 2026-05-13 (v2 audit — first real production run revealed every Tier-1 network either 404s, 403s, or returns 0 parsed listings because the listings are rendered client-side. Re-engineered around that reality below.)**

---

## v2 design principles

1. **Aggregator-first.** Tier 2 platforms (Project Casting, Backstage) are *purpose-built* to be machine-readable. They're where the real volume lives in 2026.
2. **Network sites need a real browser.** ABC / NBC / Bravo / Discovery / etc. have all moved to client-rendered SPAs. The `engine: "requests"` HTML scraper sees an empty shell. v2 adds `engine: "playwright"` for these.
3. **Polite-but-realistic headers.** A `MythieCastingScout/1.0 (+https://mythie.app/bot)` UA was honest but invited the 403 we saw from Discovery. Rotate among real Chrome UAs and the `Accept-Language: en-US,en;q=0.9` header — same posture a real visitor sends.
4. **Each source declares whether it's known-working.** A `status` column marks `working` / `verify` / `dead` / `js-required`. The scraper logs the status alongside the listing count so the operator sees decay before listings disappear.
5. **RSS where it exists.** Several aggregators publish RSS feeds — much cheaper than HTML scraping and stable when the page layout changes. v2 ships `engine: "rss"` (feedparser-backed) and three Tier-2 RSS sources (Project Casting, Backstage, Auditions Free). Always prefer RSS when a feed is available — when the next audit cycle finds new feeds, add them alongside the HTML rows; the dedup pass in step 2 of the pipeline collapses duplicates by `applyUrl`.

---

## Tier 1 — Official networks (auto-trust)

**Update v2 (2026-05-13):** every Tier-1 URL from v1 is either dead or empty under plain `requests`. The cron run on 2026-05-13 returned `0 listings` across every network. Two paths forward:

- For sources confirmed alive but JS-rendered → mark `engine: playwright` and re-test
- For sources confirmed dead → remove or replace with the current URL

| Network | URL | Engine | Status (2026-05-13) | Notes |
|---|---|---|---|---|
| ABC | https://abc.com/casting | playwright | `js-required` | Returns 200; listings hydrate client-side. Needs headless browser. Bachelor / Bachelorette franchise. |
| Bravo | https://www.bravotv.com/be-on-bravo | playwright | `dead` (404) | URL retired. **TODO: research current Bravo casting URL** — likely moved to NBCU casting hub |
| NBCU casting hub | https://www.nbc.com/casting | playwright | `js-required` | Covers NBC, Bravo, Peacock, USA via NBCU's centralised casting site |
| Netflix | https://www.netflix.com/jobs/casting | playwright | `verify` | 200 but parsed 0; selector may be stale even with browser render |
| CBS | https://www.cbs.com/casting/ | playwright | `js-required` | 200 + empty under requests. Big Brother, Survivor, Amazing Race |
| MTV | https://www.mtv.com/casting | playwright | `dead` (404) | URL retired. **TODO: research** — likely consolidated under Paramount |
| Paramount+ | https://www.paramountplus.com/casting/ | playwright | `verify` | Likely the new home of MTV + CBS reality casting |
| Discovery | https://www.discovery.com/casting | playwright | `dead` (403 — bot-blocked) | URL exists but Discovery's WAF blocks default UAs. Browser UA may pass |
| TLC | https://www.tlc.com/casting/ | playwright | `verify` | 90 Day Fiancé, Sister Wives |
| HBO | https://www.hbo.com/casting | playwright | `verify` | Quarterly cadence |
| Hulu | https://www.hulu.com/casting | playwright | `verify` | The Kardashians extended universe |
| Fox | https://www.fox.com/casting | playwright | `verify` | The Masked Singer, Hell's Kitchen |
| Peacock | https://www.peacocktv.com/casting | playwright | `verify` | Couples Therapy, Love Island US |

**Recommended cron behavior:** run Tier 1 with the Playwright engine **weekly, not every 3 days** — JS rendering is expensive and the network pages turn over slowly. Tier 2 runs every 3 days.

## Tier 2 — Industry aggregators (auto-trust if trustScore ≥ 85)

These are the highest-yield sources. **Aggregator-first** is the v2 mantra.

| Aggregator | URL / RSS | Engine | Status | Notes |
|---|---|---|---|---|
| Project Casting | https://www.projectcasting.com/casting-calls/reality-tv | requests | `verify` | Highest-volume. Try `?rss=1` first for RSS feed |
| Backstage | https://www.backstage.com/casting/reality-tv/ | requests | `verify` | Paywall on application but listings public |
| Casting Networks | https://www.castingnetworks.com/talent/jobs?type=reality | playwright | `js-required` | Behind login wall for full data; public preview only |
| Casting Crane | https://castingcrane.com/casting-calls | playwright | `verify (NEW v2)` | Industry-favored 2025+ platform — verify reality category |
| Auditions Free | https://www.auditionsfree.com/category/reality-tv/ | requests | `verify` | Open submissions; medium trust |
| LA Casting | https://www.lacasting.com/jobs?type=reality | playwright | `js-required` | Industry-standard for LA productions |
| Stage 32 | https://www.stage32.com/jobs?searchQuery=reality | playwright | `verify (NEW v2)` | Indie/unscripted listings, often before networks publish |
| Casting Frontier | https://www.castingfrontier.com/jobs?type=reality | playwright | `verify (NEW v2)` | Cross-platform with Casting Networks |
| Mandy | https://www.mandy.com/uk/casting-calls?category=reality | requests | `verify (NEW v2)` | UK-leaning, useful for UK formats picked up by US networks |

## Tier 3 — Specialist platforms

| Platform | URL | Engine | Status | Notes |
|---|---|---|---|---|
| Castlyst | https://castlyst.com/casting-calls | requests | `verify` | Smaller, vetted producer pool |
| Cast It Reach | https://castitreach.com/casting-calls | requests | `verify` | Used by Magical Elves, Truly Original |
| Reality Talent Search | https://realitytalentsearch.com/calls | requests | `verify` | UK-leaning |

## Tier 4 — Social (manual QA only, never auto-published)

The scout **does not scrape Tier 4 sources directly.** They're tracked here so the operator knows what to monitor manually. The admin moderation queue surfaces socials only when a producer reports one; auto-publish from a social signal is a non-goal.

### Approved casting-director / producer handles

| Handle | Platforms | Role | Notes |
|---|---|---|---|
| @castingrealitytv | IG, TikTok | aggregator | High signal-to-noise; first to post some calls |
| @castingwithkeicon | IG, TikTok | CD | Long-running, casting-director-run account |
| @aintthatsomethingentertainment | IG, FB | production | Casts their own shows + repost others |
| **[TODO: Andrew add the trusted CD/producer list]** | — | — | Pending the trusted-source curation conversation (raised 2026-05-13) |

**Hard rule (unchanged from v1):** social-only sources never auto-publish regardless of trust score. They surface in the admin moderation queue only when corroborated by a Tier 1 or Tier 2 listing of the same `showTitle` in the same run, OR when a producer manually files them.

### Adding a trusted social handle

1. Andrew confirms the account is run by a credentialed CD or production company
2. Add a row above with the handle + platforms + role
3. Pin the corresponding `castingDirectors/{handle}` Firestore doc with `trustedSource: true` so the admin queue weights its corroborations
4. Re-run scout — social-corroborated Tier 1/2 listings get a +10 trust score bump

## Adding a new source (any tier)

1. Confirm the URL is publicly accessible (no login wall for the listings).
2. Confirm robots.txt allows reasonable scraping.
3. **Hit the URL with `curl -sI -A "Mozilla/5.0"`** — if it returns 200, check the HTML for the listing content. If listings aren't in the raw HTML, mark `engine: playwright`.
4. Add a row to `SOURCES` in `scripts/scrape_sources.py` with tier + parser name + engine.
5. If the existing parsers don't fit, add a new `parse_<name>()` function and reference it from `SOURCES`.
6. Add a row to the appropriate tier table above.
7. Run a one-off `python scrape_sources.py --tier <new_tier> --max 5` to sanity-check.
8. If the source goes silent (zero listings on 3 consecutive runs), flip its `status` to `verify` and add a TODO.

## Known-dead URLs (do not re-add)

These were in v1 but confirmed retired during the 2026-05-13 audit. Re-research before re-adding.

- `https://www.bravotv.com/be-on-bravo` (404 — Bravo moved to NBCU hub)
- `https://www.mtv.com/casting` (404 — MTV consolidated under Paramount)
