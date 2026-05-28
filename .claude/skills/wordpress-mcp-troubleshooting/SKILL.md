---
name: wordpress-mcp-troubleshooting
description: Use whenever the WordPress.com MCP is in play on any portfolio site (realitytelevisionawards.com, toronadoentertainment.com, or any future WP site) and a content operation fails, behaves unexpectedly, or a manual paste from wp-admin appears to save but doesn't persist. Captures the documented Claude-MCP-client edit-scope limitation, the Classic-Editor-mangles-pasted-HTML trap, the wrong-page-paste foot-gun (verify post ID in URL), the anti-bot fetch issue, three recovery paths when pages.update fails, and the verify-via-MCP-after-wp-admin protocol so nothing ships into the wrong page silently. Battle-tested 2026-05-28 on the ARTAS Privacy Policy / Terms of Service edits. Keywords - WordPress, WordPress.com, Jetpack, MCP, pages.update, pages.create, permission denied, "not allowed to edit this post", Classic Editor, TinyMCE, Gutenberg, Code editor, Visual tab, Text tab, slug swap, manual paste, anti-bot 403, 406, activity log, claude-mcp-editor.
version: 1.1.0
author: Andrew Ward (jayhawkrules)
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]
---

# WordPress MCP Troubleshooting

The WordPress.com / Jetpack MCP integration looks like a clean REST API but has three load-bearing quirks that have eaten production legal-page edits more than once. This skill captures every one of them so a future session does not re-investigate from scratch.

Always load `safe-edit-policy` first.

## When to use

- A WordPress MCP operation returns "Sorry, you are not allowed to edit this post." or similar 401/403
- A manual wp-admin paste appears to save but the live URL shows the old content
- You need to update a legal page (PP, ToS, Refund) on a portfolio WP site
- You are about to send Andrew to wp-admin to paste raw HTML — read this first
- You want to verify which actual user the MCP is operating as
- You see a confusing "modified" timestamp that didn't bump after an edit

## When NOT to use

- The site is not on WordPress.com / Jetpack-connected (e.g., a custom WP install with no MCP)
- The edit is a brand-new page (no existing-page edit-scope issue applies)
- The MCP is working fine and the user just wants help with content — that's `voice-locker-per-app` or copywriting work

## The core finding: WordPress Privacy Policy page has special capability protection

**The single most common "permission denied" failure on a WordPress.com MCP edit is trying to update the page designated as the site's Privacy Policy in Settings → Privacy.** WordPress core protects that specific page with the `manage_privacy_options` meta-cap, which is checked at REST API write time and is separate from normal page-edit capabilities. The MCP user (even with Administrator role on the local site) cannot satisfy this check, so the update fails with `"Sorry, you are not allowed to edit this post."`.

The MCP CAN otherwise edit pre-existing pages just fine. This was confirmed 2026-05-28 by successfully updating the Home page (post ID 7, pre-existing since 2022) while the same operation on post ID 3 (the designated Privacy Policy page) failed.

**The fix is a 60-second wp-admin loop:**

1. **wp-admin → Settings → Privacy** (`<site>/wp-admin/options-privacy.php`)
2. **Change Your Privacy Policy Page** dropdown: change from "Privacy Policy" to **— Select —** (none); click Use This Page / Save
3. Now the MCP can `pages.update` that page normally
4. After the update lands, go back to Settings → Privacy and re-set the dropdown to Privacy Policy → Save

The same pattern applies to the **Page for Posts** and **Front Page** in Settings → Reading if they trigger similar protection (less common but worth checking if those pages also fail).

### What this is NOT

Earlier hypotheses that turned out to be wrong (kept here so future sessions don't re-investigate):

- ❌ "Claude MCP can't edit pre-existing pages" — false; it can. Tested by successfully updating Home page (ID 7).
- ❌ "Claude MCP has narrower scope than older Anthropic/ClaudeAI MCP" — false; the activity-log `mcp_client_name` difference is real but doesn't gate edit capability. Both clients can edit pages.
- ❌ "Local WP user role needs promotion (e.g., `claude-mcp-editor` → Administrator)" — false; the MCP authenticates against a different WP user (mapped from the WP.com primary connection user, not whatever local user has a similar name). Role promotion on a side-channel user does nothing.

### Other capability-protected pages worth knowing

WordPress core or popular plugins designate certain pages with extra protection:

| Page designation | Setting location | Capability required | Symptom |
|---|---|---|---|
| Privacy Policy | Settings → Privacy | `manage_privacy_options` | "Not allowed to edit this post" on MCP update |
| Page for Posts | Settings → Reading | (none typically; usually editable) | Rare; check if PP fix pattern doesn't apply |
| WooCommerce Shop / Cart / Checkout / My Account pages | WooCommerce → Settings → Advanced → Page Setup | varies; sometimes locked by WooCommerce's `manage_woocommerce` | Updates may silently fall back to default content |
| Custom-post-type Privacy notice (Rank Math) | Rank Math → General → Misc | (Rank Math's own cap filter) | Possible but unverified |

## Diagnosing "not allowed to edit this post" in one minute

When `pages.update` fails with `"Sorry, you are not allowed to edit this post."`, the question is whether the failure is page-specific (protected by WordPress core / a plugin) or environment-wide (MCP misconfigured).

```
1. mcp__claude_ai_WordPress_com__wpcom-mcp-content-authoring  pages.update
   id: <failing page id, e.g. Privacy Policy = 3>
   meta: { "_diag_test": "page-specific-or-env" }
   user_confirmed: true
   → expected: fails with "not allowed"

2. mcp__claude_ai_WordPress_com__wpcom-mcp-content-authoring  pages.update
   id: <a different unrelated existing page, e.g. About or Home>
   meta: { "_diag_test": "page-specific-or-env" }
   user_confirmed: true
   → if SUCCEEDS: failure is page-specific (privacy-policy designation, WooCommerce page, plugin lock)
   → if ALSO FAILS: environment-wide (MCP token problem, capability gap, plugin intercepting all REST writes)
```

If step 2 succeeds (the common case), check whether the failing page is designated in **Settings → Privacy** or **Settings → Reading**. If yes, apply the 60-second un-designate → MCP-update → re-designate loop documented above.

If step 2 also fails: tell the user to reconnect the WordPress.com MCP from claude.ai → Settings → Connectors. Per Andrew's operational reference, session expiry can present as "tool not found" or as widespread permission errors. Reconnecting refreshes the OAuth handshake.

## Recovery paths

### Path 0 — Un-designate the protected page (use this FIRST for Privacy Policy failures)

If `pages.update` failed because the page is the designated Privacy Policy (or similar protected page), the fastest fix is 60 seconds in wp-admin:

1. wp-admin → Settings → Privacy → Change page assignment to **— Select —** → Save
2. MCP `pages.update` on that page → now works
3. wp-admin → Settings → Privacy → re-assign back → Save

This preserves the page ID, slug, URL, revisions, and all metadata. Use Paths A–C below only if the page is NOT a designated WordPress-protected page.

### Path A — Wp-admin manual paste (when MCP is genuinely blocked)

Two foot-guns kill this path on the first attempt:

**Foot-gun 1: Classic Editor plugin.** Check via `wpcom-mcp-site plugin.list`. If `Classic Editor` is status=active (it is on realitytelevisionawards.com), the editor is **TinyMCE, not Gutenberg**. The Gutenberg "Code editor" shortcut (`Cmd+Shift+Option+M`) does not work. Instead, the editor box has a **Visual | Text** tab toggle in the top-right corner — click **Text** to get the raw-HTML mode. Pasting into the Visual tab will run your HTML through TinyMCE's autop / cleanup and produce mangled `<p class="p1">`, `<span class="s1">`, smart-quoted, `\r\n`-suffixed garbage.

**Foot-gun 2: Wrong-page paste.** Andrew accidentally pasted Privacy Policy content into the Terms of Service page (different page ID) on 2026-05-28. Always have him verify the wp-admin URL contains the expected `?post=<ID>` BEFORE pasting. Page IDs to know on ARTAS:
- Privacy Policy = post ID 3
- Terms of Service = post ID 9114
- Home = post ID 7

**Correct procedure:**
1. wp-admin URL must show `?post=<expected-id>&action=edit`
2. If Classic Editor is active: click **Text** tab (not Visual)
3. If Gutenberg is active (no Classic Editor plugin): top-right ⋮ → **Code editor**
4. Select all, paste, Update
5. **VERIFY via MCP**: re-fetch the page via `pages.get` and confirm `modified` timestamp bumped + content contains the new section. If `modified` is unchanged, save did not persist — common causes: Andrew didn't actually click Update; the page is locked by another session; security plugin intercepted; or Andrew was looking at a draft revision rather than the live page.

### Path B — Slug-swap recreation via MCP (zero wp-admin pasting)

When you don't trust the wp-admin path or want future edits to work via MCP, recreate the page so the new one is MCP-owned (and therefore MCP-editable):

```
1. MCP pages.create:
   - slug: "<canonical-slug>-new" (e.g. "privacy-policy-new")
   - title: "Privacy Policy"
   - content: <full new HTML>
   - status: publish
   - user_confirmed: true

2. Andrew in wp-admin → Pages → original page → change slug to "<canonical-slug>-archived-<date>" → Update

3. MCP pages.update on the new page → change slug from "<canonical-slug>-new" to "<canonical-slug>"

4. WordPress's slug-redirect plugin (or core 301-handling) typically points the old slug at the new one — verify with curl

5. All FUTURE edits to that page work via MCP because it was MCP-created
```

Trade-off: the page's database ID changes. Any internal references that hardcoded the old ID break. Slug-based references (canonical URLs, sitemap, menus that point by name) are unaffected.

### Path C — Grant broader scope at WordPress.com

Long-term fix. Go to `https://wordpress.com/me/security/connected-apps`. Find "Claude" (or "Anthropic/Claude") in the list. Options:
- **Disconnect and reconnect** — fresh OAuth handshake may prompt for broader scopes
- **Permission detail page** — may have a "grant edit access to existing content" toggle
- **Open a WordPress.com support ticket** asking for the Claude MCP to be granted parity with the older Anthropic/ClaudeAI client scope

This is the root-cause fix. Until WordPress.com upgrades the Claude MCP's default scope, Paths A and B are the operational workarounds.

## Verify-after-write protocol (always run after any WP write)

Wp-admin saves and MCP writes can both fail silently — the UI shows success but the database doesn't change, or it writes to a draft revision. After ANY write, run this verification triad:

```
1. mcp pages.get id=<page-id> include_fields=["modified", "content"]
   → check `modified` timestamp is newer than your write timestamp
   → check `content` contains an unambiguous marker from your new text

2. mcp wpcom-mcp-site activity.get per_page=5
   → look for a post__updated / post__published entry with your page's ID
   → check actor.is_wp_admin (true=manual) vs actor.is_mcp_agent (true=via MCP)
   → check actor.mcp_client_name to confirm which MCP wrote it

3. (Optional) curl with a real User-Agent
   → e.g. `curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" <url>`
   → headless WebFetch UA returns 403/406 from Jetpack's anti-bot rule
   → grep for the marker phrase to confirm public rendering
```

If `modified` didn't bump, the save did not happen. Do not assume the public URL will show the new content just because the editor showed it before.

## Other quirks worth knowing

- **`author: 1` in MCP response is misleading.** The `author` field is the page's recorded author, often the original site admin user 1. It does NOT identify which user/MCP performed the current action. Use `activity.get` actor info for that.
- **`profile.get` returns WP.com identity, not local WP user.** It will always show the WordPress.com account the MCP is OAuth'd to (e.g. `andrewpward`, ID 5801844), not the local WP user that account is mapped to on the Jetpack site.
- **Anti-bot 403/406 on public URLs.** Headless / scripted UA fetches get blocked by Jetpack's anti-bot rule. Always read content via the MCP (authenticated) or use a real-browser UA string with curl. Public users with normal browsers are unaffected.
- **`users.list` is restricted to Automatticians.** You cannot enumerate local WP users via the MCP. Activity log + plugin list + creating test content are the diagnostic levers available.
- **`comment_status` defaults differ between create and update.** When you `pages.update` without specifying `comment_status`, it may flip from `closed` to the site default. Pass `comment_status: "closed"` explicitly on legal pages to be safe.
- **Smart quotes vs entities.** TinyMCE / Classic Editor converts `&#8220;` and `&#8221;` to literal smart quotes (`"` `"`) on save. This is fine visually but breaks string-matching diff tools. When verifying content via grep, check for both forms.

## Plugin landscape on realitytelevisionawards.com (2026-05-28)

Active plugins that matter for MCP / paste workflow:
- **Classic Editor** (1.7.0) — forces TinyMCE; affects all paste flows
- **Rank Math SEO + Rank Math SEO PRO** — may add meta-field requirements; not yet seen to block edits
- **WP Rocket** (3.21.0.1) — caching; may serve stale HTML for up to a few minutes after edit
- **Jetpack** (15.8) — required for MCP
- **Yoast Duplicate Post** (inactive) — would be useful for Path-B-style workflows if activated
- **WP .htaccess Editor** — can interact with redirect behavior

Inactive but available: Elementor, MailMunch, OptinMonster, Akismet, Mailchimp.

## Reference incident: ARTAS 2026-05-28

Context: needed to update Privacy Policy with SMS Program Data section for TCR campaign registration.

What happened (and what we initially got wrong):
1. Created new Terms of Service page (ID 9114) via MCP → succeeded
2. `pages.update` on existing Privacy Policy (ID 3) → failed `"Sorry, you are not allowed to edit this post."`
3. **Initial wrong diagnosis:** assumed the Claude MCP client had narrower scope than the older Anthropic/ClaudeAI client and couldn't edit pre-existing pages
4. Promoted local user `claude-mcp-editor` from Editor → Administrator → no effect (wasn't the issue)
5. Andrew tried a manual wp-admin paste → pasted into the WRONG page (Terms, ID 9114, not PP, ID 3) AND Classic Editor's Visual tab further mangled the HTML into `<p class="p1">`/`<span class="s1">` soup
6. Restored Terms via MCP `pages.update` → worked (already MCP-edited, so no protection issue)
7. **Diagnostic test that revealed the truth:** `pages.update` on Home page (ID 7, pre-existing wp-admin page from 2022) → **succeeded**. This invalidated the "MCP can't edit pre-existing pages" hypothesis.
8. **Real cause:** PP (ID 3) is the page designated in Settings → Privacy, which triggers WordPress core's `manage_privacy_options` capability check — separate from normal page-edit caps and not satisfied by the MCP user.

What we learned:
- **Always run the page-specific vs environment-wide diagnostic** before assuming a global MCP issue. One extra `pages.update` on an unrelated page saves an hour of misdiagnosis.
- WordPress core protects designated Privacy Policy pages specifically. Check Settings → Privacy before blaming the MCP.
- Classic Editor's Visual tab is a real HTML-mangler. Always Text tab for raw HTML pastes.
- Wrong-page paste is a real foot-gun. Verify `?post=<id>` in the wp-admin URL before pasting.

Resolution: 60-second un-designate → MCP update → re-designate loop. PP shipped with SMS Program Data section, TCR registration unblocked.

Skill v1.0 (the version committed before this diagnostic) had the wrong root-cause analysis. v1.1 (this version) reflects the corrected understanding.

## Related skills

- `legal-compliance-guardian` — governs WHAT goes into legal pages; this skill governs HOW it gets there
- `mcp-team-setup` — house MCP set per repo; doesn't cover WordPress.com MCP scopes specifically
- `safe-edit-policy` — verify-before-write contract that catches the wrong-page-paste case
