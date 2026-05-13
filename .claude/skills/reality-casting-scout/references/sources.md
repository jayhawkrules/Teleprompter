# Reality Casting Scout — Source Manifest

> Canonical list of casting sources scraped by `scripts/scrape_sources.py`. Tier 1 = official networks. Tier 2 = industry aggregators. Tier 3 = specialist platforms. Tier 4 = social (manual QA only — never scraped automatically).

Last reviewed: 2026-05-11.

## Tier 1 — Official networks (auto-trust)

| Network | Casting URL | Update frequency | Notes |
|---|---|---|---|
| ABC | https://abc.com/casting | Weekly | Bachelor / Bachelorette franchise hub |
| Bravo | https://www.bravotv.com/be-on-bravo | Continuous | Real Housewives, Below Deck, Top Chef |
| Netflix | https://www.netflix.com/jobs/casting | Monthly | International + dating shows |
| CBS | https://www.cbs.com/casting/ | Continuous | Big Brother, Survivor, Amazing Race |
| NBC | https://www.nbc.com/casting | Continuous | The Voice, America's Got Talent |
| MTV | https://www.mtv.com/casting | Weekly | The Challenge, Real World |
| Discovery | https://www.discovery.com/casting | Monthly | Naked & Afraid, Deadliest Catch |
| TLC | https://www.tlc.com/casting/ | Weekly | 90 Day Fiancé, Sister Wives |
| HBO | https://www.hbo.com/casting | Quarterly | Smaller volume but high-trust |
| Hulu | https://www.hulu.com/casting | Monthly | The Kardashians extended universe |
| Fox | https://www.fox.com/casting | Weekly | The Masked Singer, Hell's Kitchen |
| Peacock | https://www.peacocktv.com/casting | Monthly | Couples Therapy, Love Island US |
| Paramount+ | https://www.paramountplus.com/casting/ | Monthly | RuPaul's Drag Race franchise |

## Tier 2 — Industry aggregators (auto-trust if trustScore >= 85)

| Aggregator | Listings URL | Update frequency | Notes |
|---|---|---|---|
| Project Casting | https://www.projectcasting.com/casting-calls/reality-tv | Hourly | Highest-volume; quality varies; require multi-signal scoring |
| Backstage | https://www.backstage.com/casting/reality-tv/ | Daily | Paywall on application but listings public |
| Casting Networks | https://www.castingnetworks.com/talent/jobs?type=reality | Daily | Used by union productions |
| Auditions Free | https://www.auditionsfree.com/category/reality-tv/ | Daily | Open submissions; medium trust |
| LA Casting | https://www.lacasting.com/jobs?type=reality | Daily | Industry-standard for LA productions |

## Tier 3 — Specialist platforms

| Platform | URL | Notes |
|---|---|---|
| Castlyst | https://castlyst.com/casting-calls | Smaller, vetted producer pool |
| Cast It Reach | https://castitreach.com/casting-calls | Used by Magical Elves, Truly Original |
| Reality Talent Search | https://realitytalentsearch.com/calls | UK-leaning |

## Tier 4 — Social (manual QA only, never auto-published)

| Handle | Platform | Why monitored |
|---|---|---|
| @castingrealitytv | Instagram, TikTok | High signal-to-noise; first to post some casting calls |
| @castingwithkeicon | Instagram, TikTok | Long-running casting director-run account |
| @aintthatsomethingentertainment | Instagram, Facebook | Production company posts |

**Hard rule:** social-only sources are capped at `pending_admin_review` regardless of trust score. They only auto-publish when corroborated by a Tier 1 or Tier 2 listing of the same `showTitle` in the same run.

## Adding a new source

1. Confirm the URL is publicly accessible (no login wall).
2. Confirm robots.txt allows reasonable scraping.
3. Add a row to `SOURCES` in `scripts/scrape_sources.py` with tier + parser name.
4. If the existing parsers don't fit, add a new `parse_<name>()` function and reference it from `SOURCES`.
5. Add a row to the table above.
6. Run a one-off `python scrape_sources.py --tier <new_tier> --max 5` to sanity-check.
