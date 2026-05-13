# Jurisdiction Watchlist — Regulatory Currency Checks

Legal controller of record for the portfolio is **Toronado Entertainment, LLC (USA)** for all apps except the Producing Hollywood site (owned by Producing Hollywood). Primary user base is United States; primary secondary market is the United Kingdom; users are accepted worldwide.

Because we accept worldwide users, GDPR (UK + EU) is the **dominant** regulatory regime — it is generally the strictest baseline. Default policy: comply with UK GDPR + EU GDPR for all users globally; layer US state laws on top for US residents.

---

## UK GDPR + DPA 2018 (DOMINANT — worldwide users)

- Applies whenever a UK resident is among accepted users (we always accept UK)
- Key requirements: data controller disclosure, legal basis, retention periods, user rights (access, erasure, portability, objection, restriction), ICO complaint right
- Current status: ICO guidance under review following Data (Use and Access) Act 2025 (in force 19 June 2025)
- Watch item: DUAA s.112 introduced limited cookie-consent exceptions for strictly-necessary + statistical (analytics) + appearance/preference cookies — ICO finalising guidance through Q1 2026
- **RED flag:** Referencing "Data Protection Act 1998" (superseded), "EU-US Privacy Shield" (invalidated 2020), "GDPR" without "UK GDPR" on a UK-facing page
- **YELLOW flag:** Missing reference to DUAA 2025 if cookie page last updated before June 2025

## EU GDPR (DOMINANT — any EU user accepted)

- Different supervisory authority structure than UK; post-Brexit adequacy decisions differ
- Sites that accept EU users must name a representative in the EU OR explicitly limit
- Check: Does the Privacy Policy reference **both** UK GDPR and EU GDPR if EU users are accepted?

## United States — Federal

### FTC Negative Option / Click-to-Cancel Rule (subscription/billing apps)
- Final rule effective July 2025
- Cancellation must be at least as easy as signup, through the same medium
- Must disclose recurring billing BEFORE collecting billing info; express informed consent required
- Applies to: The Production Shelf (when subscriptions added), any app with paid tiers

### COPPA — children under 13
- Applies if any feature is directed to children or knowingly collects data from children under 13
- ARTAS, Mythie: flag if minors language is missing

## United States — State Privacy Laws

| State | Law | Key trigger |
|---|---|---|
| California | CCPA/CPRA | annual policy update required; sensitive PI category; opt-out of sharing for cross-context behavioural ads; **2026 regs require disclosure of categories of PI disclosed to service providers** |
| Virginia | VCDPA | in force |
| Colorado | CPA | in force |
| Connecticut | CTDPA | in force |
| Utah | UCPA | in force |
| Texas | TX DPSA | in force July 2024 |
| Florida | FDBR | in force July 2024 — applies to large data brokers |
| Oregon | OCDPA | in force July 2024 |
| Montana | MTCDPA | in force October 2024 |
| Iowa, Tennessee, Delaware, NH, NJ, MN, MD, IN, KY, RI | Various | in force or rolling-effective through 2026 |

Watch item (RED): Privacy Policy still claims "only California users have these rights" — wrong for 2026; multiple states now mirror CCPA-style rights.

## United Kingdom — Consumer Protection

### UK Consumer Rights Act 2015
- Consumer contract terms must be fair, transparent, and prominent
- Unenforceable: excessive cancellation charges, unbalanced rights, unilateral price increases without notice

### PECR (UK Cookie Regulation)
- Non-essential cookies require opt-in consent before firing
- DUAA 2025 s.112 introduced exceptions (strictly-necessary, statistical, preference) — ICO finalising guidance, **do not remove banners yet**
- Default rule: treat analytics as requiring consent until ICO update lands
- Marketing/advertising cookies: always require consent

## Other jurisdictions to detect on coverage-gap event

If a user signs up from any of these and the app does not currently cover them, fire `jurisdiction_coverage_gap`:

| Region | Law to research before publish |
|---|---|
| Canada | PIPEDA + Quebec Law 25 |
| Brazil | LGPD |
| Australia | Privacy Act 1988 + 2024 reforms |
| Japan | APPI |
| South Korea | PIPA |
| India | DPDP Act 2023 |
| Switzerland | nFADP |
| EEA non-EU (Iceland, Liechtenstein, Norway) | GDPR via EEA |
| Singapore | PDPA |
| South Africa | POPIA |

Default coverage-gap response: extend the GDPR-equivalent rights to the user (strictest baseline), then queue jurisdiction-specific language as a 🔧 manual task.

---

## Retired references — RED flag any of these on a live page

- EU-US Privacy Shield (invalidated 2020)
- Data Protection Act 1998 (superseded by DPA 2018)
- Privacy Shield Framework
- "Cookie law" without reference to PECR
- "GDPR" without "UK GDPR" on a UK-facing page
- "Safe Harbor"
- Pre-2023 CCPA-only wording on US-facing pages (CPRA changed the rights set)
