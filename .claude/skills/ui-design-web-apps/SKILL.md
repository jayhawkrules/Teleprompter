---
name: ui-design-web-apps
version: 2
description: A comprehensive Claude skill for designing production-grade web application UIs. Grounded in UX research, cognitive science, and real-world product best practices. Use this skill whenever designing interfaces, component systems, flows, or screen layouts for web apps. Covers flow design, component standards, navigation, state design, accessibility, motion, responsiveness, SaaS-specific patterns, and a full pre-ship checklist.
---

# Web App UI Design Skill
## Research-Grounded. Flow-First. User-Centred.

This skill encodes the best available UX research, cognitive psychology, and real-world product design principles for web application interfaces. Every rule traces back to a behavioural pattern, usability study, or validated design system from a leading product team (Linear, Stripe, Vercel, Notion, Figma).

**Use this skill when:** designing screens, flows, components, navigation, forms, onboarding, empty states, error handling, notifications, SaaS upgrade paths, or any interactive UI element for a web application.

**Reference products to study**: Linear (speed, keyboard-first), Stripe Dashboard (data clarity, trust), Vercel (developer UX, density), Notion (flexibility, empty states), Figma (canvas UI, collaboration states).

---

## 1. How People Actually Use Web Apps

### Attention & Scanning
- Users scan in **F-patterns** (NNGroup, 2017) for list/text-heavy pages and **Z-patterns** for sparse layouts. Place the most critical element at the start of the reading path — top-left on LTR layouts.
- **Foveal vision** covers only ~2° of the visual field. Users build a mental model through rapid eye movements (saccades), not a full-page read. Visual hierarchy must guide the eye, not compete with it.
- **Hick's Law**: Decision time increases logarithmically with choices. Every additional option on screen costs cognitive time. Aim for ≤5 primary choices per view. Every option that can be hidden behind "Advanced" or "More" should be.
- **The 5-second rule**: If a user cannot identify what a screen does in 5 seconds, the layout has failed. Test every screen against this constraint.

### Memory & Cognition
- **Miller's Law**: Working memory holds 7 ± 2 items. Never present more than 7 primary navigation items. Group related items into labelled chunks.
- **Recognition over recall** (Nielsen): Users remember better when prompted than when recalling unaided. Always show options — dropdowns, autocomplete, filter chips — rather than asking users to type from memory.
- **Cognitive load types**: Intrinsic (task complexity — unavoidable), extraneous (bad UI — eliminate entirely), germane (learning — support it). Your job is to eliminate every source of extraneous load. Never add a step the task doesn't require.
- **Change blindness**: Users miss changes that happen without visual transition. Always animate state changes — a 150ms fade is enough to signal that something happened.

### Behaviour & Interaction
- **Fitts's Law**: Acquisition time = log₂(2D/W). Make important elements large and close to the likely cursor/thumb position. Primary CTAs belong large and centred on mobile, top-right on desktop (proximity to cursor end position).
- **The 44×44px touch target rule** (Apple HIG): Minimum touch target on mobile for all interactive elements — buttons, links, form controls, toggles, icon buttons.
- **Error recovery over error prevention** (Nielsen heuristic #5): Users make mistakes. Design for recovery — undo, confirm, inline correction — not for blocking every possible path with validation walls.
- **The peak-end rule** (Kahneman): Users judge experiences by the peak moment and the final moment, not the average. Onboarding and task completions are the two moments most worth investing in.
- **The Zeigarnik effect**: People remember incomplete tasks better than complete ones. Use progress indicators and checklists in onboarding — partial completion creates motivation to finish.

### Trust & Credibility
- **The halo effect**: A polished, professional UI signals product reliability. Visual quality is a proxy for product quality in users' minds.
- **Progressive disclosure builds trust**: Asking for too much upfront (long forms, permission requests without context) breaks trust. Collect data incrementally as users engage with value.
- **Reciprocity**: Give value before asking for something. Show the product working before gating it. Offer a free trial, a free tier, or a demo mode — then ask for payment or registration.

---

## 2. Visual Hierarchy & Density

Getting visual weight right is the difference between a UI that feels clear and one that feels overwhelming. Every element on screen has a weight. The sum of all weights must create a clear reading order.

### The Five Levels of Visual Weight
1. **Highest**: Primary CTA — filled accent colour, largest button, most padding
2. **High**: Page title, section headings — `--text-xl` max in web apps, heavier weight
3. **Medium**: Body content, card titles — `--text-base`, standard weight
4. **Low**: Metadata, labels, secondary text — `--text-xs` / `--text-sm`, muted colour
5. **Lowest**: Dividers, borders, empty containers — barely perceptible surface separation

**Rule**: If two elements feel the same weight, one of them needs to change. Visual hierarchy only works through contrast.

### Density Modes
Web apps should offer or default to one density based on use case:

| Mode | Line height | Padding | Font | Use for |
|---|---|---|---|---|
| **Comfortable** | 1.6 | `--space-4` to `--space-6` | `--text-base` (16px) | Consumer apps, settings, forms |
| **Compact** | 1.4 | `--space-2` to `--space-3` | `--text-sm` (14px) | Data tables, CRMs, dashboards |
| **Dense** | 1.3 | `--space-1` to `--space-2` | `--text-xs` (12px) | Code editors, spreadsheets, terminal UIs |

Never mix density modes within a single view. Pick one and commit.

### Colour in UI (The Restraint Rule)
Colour in a web app UI is not decoration — it is a signal. Use it only to:
- **Indicate state**: success (green), error (red), warning (amber), info (blue)
- **Draw attention to a single primary action** (accent colour on primary button only)
- **Encode data** in charts and visualisations

**Do not use colour to:**
- Make sections "feel different" from each other
- Decorate backgrounds or cards without semantic meaning
- Create visual interest where good typography and spacing would serve better

**The one-accent rule**: In any single viewport, only ONE non-neutral accent colour should appear in UI chrome (buttons, active states, badges). Additional colours are reserved for status signals and data visualisation only.

### Typography in Web Apps
Web apps cap display type at `--text-xl` (24–36px). There are no heroes, no splash text, no editorial moments — just functional hierarchy:

```
Page title        --text-xl, font-weight: 600    One per page. The "where am I" anchor.
Section heading   --text-lg, font-weight: 600    Groups of related content.
Subheading        --text-base, font-weight: 600  Cards, form sections, list headers.
Body              --text-base, font-weight: 400  All descriptive content.
UI chrome         --text-sm, font-weight: 400    Buttons, nav links, labels.
Metadata          --text-xs, font-weight: 400    Timestamps, counts, secondary labels.
```

- Use **weight** to create hierarchy, not size. A bold `--text-base` heading and a regular `--text-base` body read as different levels without changing the font size token.
- **Never use more than 4 distinct text styles** on a single screen.
- **Muted colour for secondary text**: `--color-text-muted` for metadata, timestamps, and helper text. `--color-text-faint` only for decorative/placeholder text.

---

## 3. Flow Design Principles

### Task Flow Architecture: The Non-Negotiables
Every user task has a **start → progress → completion** arc. Design all three states explicitly.

```
START              PROGRESS              COMPLETION
─────────────────────────────────────────────────────
Empty state        Loading skeleton      Success state
Onboarding step    In-progress form      Confirmation
Entry point        Validation feedback   Undo window
Error landing      Retry prompt          Next-step CTA
```

**Never create a dead end.** Every screen needs a clear next action AND a clear escape route (back, cancel, close). If a user is confused about what to do next, the design has failed.

### The Primary Action Rule
One primary action per screen. When all buttons look equally important, none of them are.

| Button type | Visual | Count | Position |
|---|---|---|---|
| **Primary** | Filled accent colour | 1 per screen | Top-right of header, or bottom-right of form |
| **Secondary** | Outlined or ghost | 2–3 max | Adjacent to primary |
| **Destructive** | `--color-error` background | 1 | Separated from primary by space |
| **Tertiary** | Text-only link | Any | Inline or footer area |

**Do this, not that:**
- ✅ `[Cancel]  [Save changes]` — secondary left, primary right
- ❌ `[Save changes]  [Delete]  [Cancel]  [Preview]` — four equal-weight actions

### Progressive Disclosure
Never front-load complexity. Reveal depth as users need it:
- Show only what's needed for the current step
- Advanced settings → collapsible section, "Advanced options ▾" toggle
- Long forms → multi-step wizard (max 4 fields per step)
- Secondary filters → "More filters" slide-out drawer
- Dangerous actions → behind a confirmation step or requires typing to confirm

**Research basis**: Nielsen (1994) — users are overwhelmed by too many simultaneous options. Show the minimum viable set first; earn the right to show more.

### Onboarding Flow
The first 3 minutes determine 30-day retention (Mixpanel, 2023). Onboarding is a product feature, not a form.

1. **Value demonstration first** — show the product working before asking for data (interactive demo, pre-populated state)
2. **Minimise time to first value** — the fastest path from signup to "aha moment"
3. **Checklist-driven progression** — persistent "3 of 5 steps complete" tracker exploits the Zeigarnik effect
4. **Skip is always available** — never force optional setup to completion
5. **Empty state = invitation** — first view must explain what goes here and invite action with a CTA
6. **Contextual tips over tooltips** — embed guidance inside the UI (inline help text, subtle callouts) rather than a separate tutorial overlay

---

## 4. Navigation Architecture

### Which Pattern to Use

| Pattern | Use when | Avoid when |
|---|---|---|
| **Left sidebar** | 5+ primary sections, complex hierarchy, frequent section switching | Simple 2–4 section apps |
| **Top navigation** | Marketing pages within the app, fewer than 5 sections | Deep hierarchies, data-dense dashboards |
| **Bottom tab bar (mobile)** | 3–5 primary sections | More than 5 sections |
| **Hamburger drawer (mobile)** | Many secondary navigation items | Primary navigation needing constant visibility |
| **Contextual toolbar** | Tool-based apps (canvas, editor) | General navigation |

### Sidebar Best Practices
- **Sticky at all times** — never let the sidebar scroll with page content
- **Collapsible to icon-only** at 56–64px wide, preserving navigation without blocking space
- **Active state**: Background fill + left accent bar OR filled pill — never colour alone (accessibility)
- **Section labels**: Group with uppercase 11px labels and dividers (`Team`, `Projects`, `Settings`)
- **Badge counts**: Show unread/pending counts on items. Red badge = alert, neutral badge = count
- **Width**: 220–260px expanded. Always specify `min-width` to prevent collapse on resize
- **User avatar + name**: Bottom of sidebar for quick access to account/settings

### Information Architecture Levels
```
Level 1: Sidebar section (Projects, Team, Billing)
Level 2: Page within section (All Projects, Archived)
Level 3: Record/item (Project "Apollo")
Level 4: Sub-tab within record (Overview, Activity, Settings)
```

Breadcrumbs are mandatory at Level 3+. Format: `Projects > Apollo > Settings` — ancestors are links, current page is plain text.

### Command Palette (Cmd+K / Ctrl+K)
Expected in any app with 10+ actions. Power users will reach for it immediately.

Structure:
- Top: Recent actions and frequently used items
- Grouped by category: `Go to...`, `Create...`, `Search...`, `Settings`
- Keyboard-navigable: Arrow keys + Enter to select, Escape to dismiss
- Fuzzy search across all actions, routes, and records
- Keyboard shortcut shown next to common actions

---

## 5. Component Design Standards

### Buttons

```
Size       Height   H-Padding    Font          Use case
────────────────────────────────────────────────────────
Large      44px     20px         --text-sm     Mobile primary, modal CTA
Default    36px     16px         --text-sm     Standard desktop
Small      28px     10px         --text-xs     Table actions, dense toolbars
Icon-only  36×36px  8px all      N/A           Toolbars — requires aria-label + tooltip
```

States every button must have:
- **Default**: Base fill/outline
- **Hover**: Lightened/darkened variant of fill (`--color-primary-hover`)
- **Active/pressed**: Deeper variant (`--color-primary-active`) — 80ms transition
- **Focus-visible**: 2px ring, 3px offset, `--color-primary`
- **Loading**: Spinner replaces icon (not label) + label becomes "Saving..." — button stays enabled width
- **Success**: Brief checkmark animation (500–700ms) then returns to default
- **Disabled**: 40% opacity, `cursor: not-allowed`, `aria-disabled="true"` — always provide a tooltip explaining why

### Form Design
**Research basis**: Baymard Institute (2023) — form errors are the single largest cause of task abandonment in web apps. These rules are all evidence-based.

**Labels**
- Always above the input — never inside (placeholder disappears on type, fails WCAG 2.1)
- Use sentence case ("First name", not "FIRST NAME")
- Required fields: no asterisk in the label — instead, mark optional fields with "(optional)"
- Helper text: below the label in `--color-text-muted`, before input focus — not inside placeholder

**Validation**
- Validate on `blur` (field loses focus), not on `input` (keystroke) — keystroke validation is anxious and disruptive
- Exception: password strength meters update on input (expected, not anxious)
- Error message goes directly below the field, in `--color-error`, with an error icon
- Error message must say what to do, not what went wrong: "Enter a valid email (e.g. name@example.com)" not "Invalid email"
- On form submission failure: scroll to and focus the first invalid field, announce errors to screen readers via `aria-live="assertive"`

**Layout**
- Single column for most forms — two-column only for clearly paired short fields (First name / Last name)
- Group related fields with `<fieldset>` + `<legend>`: address block, payment details, personal info
- Autofocus the first field on load (reduces time-to-start)
- Show/hide password toggle on all password inputs
- Input type correctness: `type="email"`, `type="tel"`, `type="number"`, `type="url"` — triggers correct mobile keyboards and browser autofill
- Character counters on length-limited fields (textarea, bio, title)

**Multi-step forms**
- Show a persistent step indicator at the top: `Step 2 of 4: Payment details`
- Progress bar (or numbered steps) so user knows how much remains
- Validate each step before advancing — don't surface step 3 errors on step 1
- "Back" never loses the user's entered data

### Tables
Tables are where complex apps win or lose users.

- **Sticky column headers**: Always. Users lose context when the header scrolls away.
- **Row selection**: Checkbox in first column. On selection, a contextual bulk-actions toolbar appears above the table.
- **Sortable columns**: Click column header to sort. Arrow indicator shows direction. Sorted column has a subtle background tint.
- **Row hover**: Subtle highlight (`--color-surface-dynamic`) revealing contextual action buttons on the right
- **Row actions**: Icon buttons (edit, duplicate, delete) appear on hover. Never always-visible unless there's only one action.
- **Bulk actions toolbar**: Appears when ≥1 row selected. Contains the most common multi-row actions. Shows count: "3 items selected".
- **Pagination**: For navigable data. Show: `← Previous  Page 3 of 12  Next →` + rows-per-page selector.
- **Infinite scroll**: For feeds and activity logs where position doesn't matter.
- **Column resizing**: Expected in dense data apps — provide drag handles on column borders.
- **Empty state**: Never blank. "No results for 'apollo'. [Clear search]" with the query shown.
- **Numeric data**: Right-align. `font-variant-numeric: tabular-nums` for decimal alignment.
- **Date/time columns**: Relative for recent ("3 hours ago"), absolute for older ("12 Apr 2026") — use a tooltip to show the other format on hover.

### Cards

- **Consistent row height**: Use `align-items: stretch` in grid containers so cards in the same row always align.
- **Clickable cards**: Wrap entire card in `<a>`. Hover: `box-shadow` elevation step up (`--shadow-sm` → `--shadow-md`).
- **Internal hierarchy**:
  - Eyebrow/label: `--text-xs`, `--color-text-muted`
  - Title: `--text-base` to `--text-lg`, `font-weight: 600`
  - Metadata row: `--text-xs`, `--color-text-muted`, icons at 14px
  - Body: `--text-base`, `--color-text`, max 3 lines with `line-clamp`
  - Actions: bottom-right or revealed on hover
- **Status indication**: Use a small coloured dot, a badge, or a background tint — never a thick coloured left border.
- **Bento grid**: For dashboards and feature showcases, vary card sizes (1-wide, 2-wide, tall) to create rhythm. All cards share the same border-radius and surface level.

### Modals & Drawers

| Type | Width | Use for |
|---|---|---|
| **Confirmation modal** | 400px | "Are you sure?" — 2 actions max |
| **Form modal** | 480–560px | Short forms (≤5 fields) |
| **Detail modal** | 640–720px | Record preview, image viewer |
| **Right drawer** | 400–480px | Longer forms, filters, detail panels |
| **Full-screen sheet** | 100% | Mobile full-screen forms, deep editing |

**Universal requirements for all overlays:**
- Visible × close button (top-right)
- Close on Escape key
- Close on backdrop click (modals only, not drawers — accidental tap risk)
- Trap focus inside while open
- Return focus to trigger element on close
- Backdrop: `background: oklch(0 0 0 / 0.4)` + optional `backdrop-filter: blur(4px)` for depth
- Never nest modals — if an action inside a modal opens another modal, restructure the flow

### Tooltips & Popovers

| Type | Trigger | Max content | Use for |
|---|---|---|---|
| **Tooltip** | Hover + long-press | 80 chars | Label for icon buttons, short clarifications |
| **Popover** | Click/tap | Any | Rich content, forms, menus, colour pickers |

Tooltip rules:
- 300ms delay before show (prevents flicker during cursor movement)
- Arrow pointing to trigger element
- Never put critical information in a tooltip — screen readers may not announce it
- On mobile: tooltip → popover (hover doesn't exist)

### Notifications & Toasts

A notification is NOT a toast. Keep these patterns distinct:

**Toast** (temporary, bottom or top-right, auto-dismisses in 4–6s):
- For: background confirmations, system status updates, non-critical feedback
- "Project saved", "Link copied", "Import complete"
- Never use for errors that require action — they disappear before users respond
- Always include a manual dismiss button
- Stack up to 3 toasts; newer stacks on top

**Inline success/error** (permanent until user acts):
- For: form submission results, validation errors
- Replaces the form on success — don't navigate away if the user might want to make another change

**Notification centre** (bell icon, persistent log):
- For: team events, system alerts, activity that happened while user was away
- Badge count on bell icon (dot for any unread, number when >1)
- Mark all as read action
- Notification anatomy: avatar/icon + action summary + relative timestamp + deep link

**Banner** (full-width, dismissible, persists until dismissed):
- For: degraded service, offline status, billing warnings, important announcements
- Position: below the top nav, above page content
- One banner maximum at a time. If two compete, show the higher severity one.

---

## 6. SaaS-Specific Patterns

These patterns are unique to SaaS and subscription products and deserve explicit treatment.

### Upgrade & Paywall Patterns
The moment a user hits a limit is a conversion moment — handle it with care, not aggression.

- **Soft paywalls** outperform hard blocks: show the locked feature, blur it, and offer upgrade inline
- **Contextual upgrade CTAs**: Upgrade prompt appears at the exact moment of value — "You've used 3 of 5 projects. Upgrade for unlimited." — not in the nav or footer
- **Feature gates**: Show locked features in navigation (greyed, with a lock icon or "Pro" badge) — users should see what they're missing
- **Usage meters**: Show consumption progress visually — "7 of 10 team members used ████████░░ 70%" — near the relevant feature
- **Trial expiration**: Countdown banner ("Your trial ends in 3 days") — not a modal blocker. Offer upgrade, not just a warning.
- **Downgrade protection**: When a user tries to downgrade, show what they'll lose concretely — not a generic "are you sure?" modal

### Team & Permissions
- **Role hierarchy**: Owner > Admin > Member > Viewer — never more than 4 levels
- **Permission indicators**: Show what each role can do in a simple matrix table
- **Invite flow**: Email input → role selector → optional message → Send invite. Show pending invites separately from active members.
- **Access denied**: Explain clearly what is blocked and who to contact (not just "403 Forbidden")
- **Audit log**: Every settings change is logged with actor, timestamp, and what changed

### Billing & Plans
- **Current plan highlight**: In pricing tables, the user's current plan has a distinct visual treatment (bordered, labelled "Current plan")
- **Annual vs monthly toggle**: Annual should be the default selection (show savings: "Save 20%")
- **Invoice history**: Table of past invoices, each downloadable as PDF, with status (Paid/Failed)
- **Payment method**: Card brand logo + last 4 digits + expiry. "Update payment method" link prominent when failing.
- **Cancellation flow**: Never a single click. Multi-step: ask why → offer a pause or downgrade → confirm → send confirmation email. The goal is retention, not obstruction.

---

## 7. State Design (The Full Spectrum)

Every component exists in multiple states. Design all of them — the happy path is only one of many.

### The Complete State Matrix
For any data-loading component, design these states:

```
State          When                        What to show
──────────────────────────────────────────────────────────────
Loading        Waiting for data            Skeleton loader
Empty (first)  No data, never had any      Invitation + CTA
Empty (search) No results for query        Query shown + clear filters
Error          Request failed              Friendly message + retry
Partial        Some data loaded            Show what loaded, skeleton rest
Success        Data loaded                 The designed happy path
Stale          Data may be outdated        Refresh indicator (subtle)
Offline        No network connection       Offline banner + cached data
```

### Loading States
- **Skeleton loaders over spinners** for all content that takes >200ms
- Skeleton exactly mirrors the component shape (circular for avatars, varying-width bars for text, full-width rectangle for images)
- Shimmer: `background: linear-gradient(90deg, var(--color-surface-offset) 25%, var(--color-surface-dynamic) 50%, var(--color-surface-offset) 75%)` at 200% width, animated left to right over 1.5s
- **Optimistic updates**: Update UI immediately on user action, confirm/rollback from server. Users perceive instant response even when the server takes 300ms.
- Full-page loading: skeleton the entire layout (header, sidebar, content area) — never a centred spinner on white

### Empty States
Empty states are first impressions. Design them as carefully as the hero feature.

**Anatomy:**
1. **Visual**: icon at 48px, or a small illustration — not a stock photo
2. **Headline**: specific and warm — "No projects yet" not "Nothing here"
3. **Body**: 1–2 lines explaining what goes here
4. **CTA**: the primary action to resolve the emptiness

**Empty state types:**
- **First use** (user has never created anything): Invitation tone. "Create your first project to get started."
- **Post-filter/search** (no results for current query): Show the query. "No results for 'apollo'." + "Clear filters" link
- **Error empty** (data failed to load): "We couldn't load your projects." + retry button + "If this keeps happening, [contact support]"
- **Completed state** (inbox zero, all tasks done): Celebrate it! "You're all caught up ✓"

### Error States

| Error type | Where | Pattern |
|---|---|---|
| Form validation | Inline, below field | `--color-error` + icon + specific message. Appears on blur. |
| Network / server | Toast + inline retry | "Something went wrong. [Try again]" — never just "Error" |
| 404 / not found | Full-page state | Explain what happened. Link back to safe location. |
| Permission denied | Full-page or inline | Explain what's blocked. "Contact your admin to request access." |
| Offline | Persistent top banner | "You're offline — changes will sync when reconnected." Banner, not modal. |
| Rate limited | Inline | "You've reached the limit. Upgrade to continue." or show when limit resets. |
| Session expired | Modal (non-closeable) | "Your session expired. Please sign in again." Preserve their unsaved context. |

**Error message formula**: `[What happened] + [Why, if helpful] + [What to do]`
- ❌ "Error 422"
- ❌ "Something went wrong"
- ✅ "We couldn't save your changes — your session expired. [Sign in again] — your work is preserved."

### Success States
- **Inline success** for forms: Replace form with checkmark + "Changes saved" message. After 3s, restore form in its new state.
- **Toast** for background operations: "Export ready — [Download]"
- **Theatrical celebration** for key milestones: first project, first payment, plan upgrade — confetti, animated checkmark, custom illustration. This is the peak moment (peak-end rule).
- **Undo window**: For destructive actions, show a toast with an undo option for 5–8 seconds before the action is committed. "Project deleted. [Undo]"

---

## 8. Accessibility as UX

Accessibility is not a separate concern — it is a dimension of quality. These rules make the app better for everyone.

- **Keyboard navigation**: Tab order must follow visual reading order. Interactive elements: Tab to reach, Enter/Space to activate, Escape to dismiss.
- **Focus indicators**: Always visible via `:focus-visible`. 2px solid `--color-primary` + 3px offset. Never remove the outline without a designed replacement.
- **Colour is never the only signal**: Error/success/warning/info states must have an icon OR text label in addition to colour. Approximately 8% of men are colour-blind and cannot reliably distinguish red from green.
- **ARIA only when native HTML won't do it**: `<button>` is always better than `<div role="button">`. Prefer semantic elements — they come with behaviour built in.
- **Live region announcements**: `aria-live="polite"` for dynamic content updates (search results appearing, loading complete). `aria-live="assertive"` for error messages that require immediate attention.
- **Icon-only buttons**: Always require an `aria-label` and a tooltip. "Close", "Edit", "Delete" — never assume the icon alone communicates.
- **Contrast minimums**: Body text 4.5:1 (WCAG AA), large text 3:1. `--color-text-muted` must still meet 4.5:1 — it often doesn't in default palettes, check it.
- **Skip link**: "Skip to main content" as the first focusable element on every page. Visually hidden until focused.
- **Reduced motion**: Wrap all non-essential animations in `prefers-reduced-motion: reduce` — base.css handles this globally, but verify animation-heavy components.
- **Form labels**: Every `<input>` must have an associated `<label>` (using `for`/`id` or `aria-labelledby`). Never rely on placeholder text as a substitute.

---

## 9. Micro-Interactions & Motion

**Research basis**: MIT Media Lab (1997) — animations between 100–500ms feel instantaneous and purposeful. Above 1000ms, users perceive waiting. Animations must communicate, not decorate.

### Motion Principles
1. **Motion communicates**: every animation tells the user something — "this appeared", "this moved here", "this is loading", "you succeeded"
2. **Elements move from somewhere to somewhere**: modals don't appear from nothing, they scale up from a point. Drawers slide from an edge. Toasts enter from the corner they'll occupy.
3. **Nothing teleports**: instant state changes are jarring. Even a 100ms opacity transition grounds the user.

### Timing Reference

| Interaction | Duration | Easing |
|---|---|---|
| Button hover state | 120ms | `ease-out` |
| Button active/press | 80ms | `ease-in` |
| Dropdown / menu open | 150ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Modal open | 200ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Modal close | 150ms | `ease-in` |
| Drawer open | 250ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Toast enter | 250ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Toast exit | 200ms | `ease-in` |
| Page / route transition | 180ms | `ease-in-out` |
| Skeleton → content reveal | 300ms | `ease-out` |
| Tab switch | 200ms | `ease-in-out` |
| Number count animation | 600ms | `ease-out` |

**The spring easing `cubic-bezier(0.16, 1, 0.3, 1)`** feels physical and deliberate — slightly overshooting and settling. Use for all elements entering the screen.

### Animate vs. Don't Animate

**Always animate:**
- Modals, drawers, dropdowns entering/exiting
- Toast notifications
- Skeleton → content transitions (fade + slight upward shift)
- Number and count changes
- Tab switches (sliding indicator)
- Accordion open/close
- Progress bar fills

**Never animate:**
- Hover colour transitions above 180ms (feels sluggish)
- Content that loads in <50ms (animation would be slower than the load)
- Background decorative elements that draw the eye from content
- Loading spinners on buttons (use skeleton or inline indicator instead)

**Respect `prefers-reduced-motion`:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. Responsiveness for Web Apps

### Breakpoint Architecture
```
375px   — Mobile S (iPhone SE, baseline mobile design target)
390px   — Mobile M (iPhone 14 / 15)
430px   — Mobile L (iPhone 14 Plus, la
rger Android)
768px   — Tablet (iPad portrait)
1024px  — Desktop S (13" laptop)
1280px  — Desktop M (standard monitor, primary design target)
1440px+ — Desktop L (large/wide monitor)
```

**Design mobile-first**, then expand. A complete mobile experience forces discipline that improves the desktop version.

### Layout Transformations

| Desktop pattern | Mobile equivalent |
|---|---|
| Left sidebar nav | Bottom tab bar (≤5 items) or hamburger drawer |
| Multi-column card grid | Single-column stacked cards |
| Data table | Card-based list OR horizontal scroll with scroll indicator |
| Side-by-side comparison | Tabbed interface |
| Persistent filter sidebar | Slide-up filter sheet (triggered by "Filters" button) |
| Hover-revealed row actions | `...` context menu button per row (always visible) |
| Inline short form | Full-screen form overlay |
| Multi-panel master/detail | Single panel — list navigates to full detail screen |
| Tooltip on hover | Long-press popover or always-visible label |

### Mobile-Specific Rules
- **Touch targets**: 44×44px minimum. Padding counts toward the target — small icons can be small visually but large in their hit area.
- **Thumb zones**: Primary actions must be reachable by thumb. Bottom-anchored CTAs on forms. Bottom tab bar for primary nav.
- **`:active` states are mandatory**: Every tappable element needs a visible `:active` state (darker background, slight scale reduction). Without it, users think their tap didn't register.
- **Never rely on hover**: Any UI that requires hover to discover or activate must have a tap alternative.
- **Bottom sheet / slide-up**: Preferred over modals on mobile for forms, filters, and confirmations. Slides up from bottom with drag handle. Dismissible with downward swipe.
- **Prevent iOS input zoom**: Inputs must have `font-size: 16px` minimum — iOS zooms in when font size is smaller.
- **Swipe gestures**: Swipe-to-delete and swipe-to-archive are expected patterns on mobile list items. Always show a confirmation or an undo toast.

---

## 11. Performance as UX

**Research basis**: Google (2018) — a 1-second delay reduces conversions by 7%. Amazon found a 100ms delay costs 1% of revenue. Performance is a UX feature.

### Perceived Performance (More Controllable Than Actual Performance)
Users perceive performance based on feedback, not raw timing. These techniques make apps feel faster than they are:

- **Optimistic updates**: Apply the UI change immediately on user action; confirm/rollback from server in background. Linear.app built its entire reputation on this.
- **Skeleton screens**: Show structural layout before data arrives. Users perceive skeleton load time as 20% shorter than equivalent spinner load time (NNGroup).
- **Progressive content loading**: Render above-fold content first. Defer charts, activity feeds, and secondary panels.
- **Prefetch on hover**: On navigation link hover, begin prefetching the route. Adds ~300ms of head start before the click.
- **Instant feedback**: Every tap/click must produce a visual response within 100ms — even if that's just a button active state. Silence = broken.
- **Avoid layout shifts**: Set explicit `width` and `height` on all images and media. Reserve space for async content with skeleton placeholders.

### Core Web Vitals Targets for Web Apps
- **LCP (Largest Contentful Paint)**: < 2.0s — the main content area must be visible
- **INP (Interaction to Next Paint)**: < 150ms — every interaction should produce visible feedback fast
- **CLS (Cumulative Layout Shift)**: < 0.05 — nothing should jump around as the page loads

---

## 12. Designing for Trust & Adoption

### Patterns That Build Trust
- **Transparency on limits**: Show users exactly where they stand — storage used, API calls remaining, plan limits, team member count. Uncertainty about limits breeds anxiety.
- **Data ownership**: Export options visible and easy to find. "Your data is yours" messaging near billing settings.
- **Activity history / audit log**: Let users see what changed, when, and by whom. This is especially important in team apps.
- **Contextual permission requests**: Ask for permissions at the moment they're needed, with explanation. "To send notifications, we need permission. [Allow]" — not on first launch.
- **Social proof in context**: Usage counts, testimonials, and case studies near the decision point (inside the upgrade flow) — not only on the marketing landing page.
- **Sync status indicator**: "All changes saved" / "Saving..." / "Last saved 3 min ago" — users need to know their work is safe.

### Patterns That Destroy Trust
- Irreversible operations without warning or undo
- Dark patterns: pre-checked opt-ins, misleading button placement, confusing cancellation flows
- Unexplained data requests ("We'd like access to your contacts" — why?)
- Silent failures: user takes an action, nothing happens, no feedback
- Inconsistent behaviour: same component behaves differently in different sections
- Surprise charges or plan changes not communicated in advance
- "Are you sure?" without explaining the consequence

---

## 13. The 10 Nielsen Heuristics — Applied to Web Apps

| # | Heuristic | Web App Application |
|---|---|---|
| 1 | **Visibility of system status** | Sync status ("Saved 2m ago"), loading skeletons, progress bars, upload progress, CI/CD status indicators |
| 2 | **Match the real world** | Domain language, not technical jargon. Dates in natural language ("3 days ago", not "2026-05-09T14:32:00Z"). Familiar icons before labels. |
| 3 | **User control & freedom** | Undo everywhere possible. Cancel in every flow. Back button never breaks. Escape dismisses overlays. |
| 4 | **Consistency & standards** | Same component = same behaviour everywhere. Platform conventions honoured (Cmd+S saves, Cmd+Z undoes, Cmd+K opens palette). |
| 5 | **Error prevention** | Confirm before destructive actions. Disable submit until required fields valid. Warn on unsaved changes before navigating away. |
| 6 | **Recognition > recall** | Labels on icon buttons. Show applied filters as removable chips. Remember last used view/sort/filter. Autocomplete > free-text. |
| 7 | **Flexibility & efficiency** | Keyboard shortcuts for power users. Bulk actions. Command palette. Saved views. Customisable dashboard layouts. |
| 8 | **Aesthetic & minimal design** | Every element earns its place. No decorative chrome. Remove anything a user hasn't needed in a month of observation. |
| 9 | **Recognise & recover from errors** | Human language. Specific cause. Actionable resolution. Never error codes. Never "Something went wrong." |
| 10 | **Help & documentation** | Contextual help (empty state copy, inline tooltips, helper text). Search-first help centre. In-app guided tours for complex features. |

---

## 14. Design Decision Checklist

Use this before finalising any screen or shipping any feature.

### Flow & Structure
- [ ] Is there ONE clear primary action on this screen?
- [ ] Can the user see where they are in any multi-step flow?
- [ ] Is there always a clear escape route (back / cancel / close)?
- [ ] Have all states been designed: loading, empty (first-use), empty (no results), error, offline, success?
- [ ] Does every dead-end state offer a next action?

### Clarity & Hierarchy
- [ ] Can a new user identify what this screen does in 5 seconds?
- [ ] Are primary actions labelled with text (not icon-only)?
- [ ] Are error messages specific and actionable (not "Something went wrong")?
- [ ] Are no more than 4 distinct text styles used on this screen?
- [ ] Is the visual weight hierarchy clear — is it obvious what to look at first?

### Accessibility
- [ ] Do status signals use icon or text in addition to colour?
- [ ] Are all touch targets ≥ 44×44px?
- [ ] Is keyboard navigation complete and in visual order?
- [ ] Does colour contrast meet WCAG AA (4.5:1 for body, 3:1 for large text)?
- [ ] Do all icon-only buttons have `aria-label` and a tooltip?
- [ ] Does the focus ring appear correctly on all interactive elements?

### Motion & Feedback
- [ ] Does every action produce visible feedback within 100ms?
- [ ] Is a skeleton shown for content loading > 200ms?
- [ ] Are transitions animated at appropriate duration (150–300ms)?
- [ ] Does `prefers-reduced-motion` disable non-essential animations?

### Responsiveness & Mobile
- [ ] Does the layout function correctly at 375px?
- [ ] Do all interactive elements have `:active` states?
- [ ] Is primary navigation accessible without hover?
- [ ] Are inputs at least 16px font size (prevents iOS auto-zoom)?

### Typography & Colour
- [ ] Is no display-scale type used (web apps cap at `--text-xl`)?
- [ ] Is there a maximum of ONE accent colour in UI chrome per viewport?
- [ ] Is `--color-text-muted` passing 4.5:1 contrast on all surfaces it appears on?

### Performance
- [ ] Are images lazy-loaded with explicit `width` and `height`?
- [ ] Is there no content that shifts position after load (CLS)?
- [ ] Is the initial page load under 2.0s LCP target?

### Dark Mode
- [ ] Does the design function in both light and dark mode?
- [ ] Are shadows appropriate for dark surfaces (may need `opacity` adjustment)?
- [ ] Do all surface layers remain visually distinct in dark mode?

---

## 15. Common Web App Flow Templates

### Settings Page
```
Layout:  Two-column — 220px left tab nav | flex-1 right content panel
Header:  Page title "Settings" + current section breadcrumb
Nav:     Vertical tab list: Account, Profile, Team, Billing, Notifications, Security, API, Danger Zone
Content: Section heading + 1-line description + form fields
Footer:  Sticky "Save changes" button anchored to bottom of content panel
Mobile:  Nav collapses to full-width section list; tap section → content (back arrow returns to list)
```

### Onboarding Flow
```
Step 0:  (before registration) Interactive demo or product tour — value first
Step 1:  Welcome screen — product name, one-line value prop, "Get started →"
Step 2:  1–2 essential setup fields (workspace name, role)
Step 3:  Create first item (guided, example pre-filled, easy to edit)
Step 4:  Invite teammates (skippable with prominent skip link)
Step 5:  Dashboard — now populated with their created item + checklist sidebar
Ongoing: Checklist widget in sidebar showing remaining setup steps
```

### List + Detail (Master / Detail)
```
Desktop: Left panel 320–400px (list, searchable, filterable) | Right panel (detail view, fills remaining)
         Selecting a list item updates the right panel without page navigation
Mobile:  List screen → tap row → full-screen detail view (back arrow at top-left)
         Detail view has a bottom action bar for primary actions
```

### Confirmation Modal (Destructive Action)
```
Title:   Specific ("Delete 'Apollo' project?") — never generic ("Confirm action")
Body:    Consequence in plain language: "This will permanently delete the project and all its data. This cannot be undone."
Input:   (For high-stakes actions) "Type 'Apollo' to confirm" — prevents accidental deletion
Actions: [Cancel] (ghost)  [Delete project] (--color-error fill)
         Cancel on left, destructive on right — both clearly labelled
```

### Auth Flow
```
Sign up:   Email + password → email verification → onboarding flow
Sign in:   Email + password. "Forgot password?" link below password field.
           Social login options (Google, GitHub) above the divider.
SSO:       "Sign in with SSO" link below. Enter company email → redirect.
MFA:       After password: "Enter the 6-digit code from your authenticator app"
           Backup code link below the input.
Reset:     Email input → "We've sent a reset link to [email]" → link → new password form
```

### Checkout / Upgrade Flow
```
Step 1:  Plan selection (current plan highlighted, upgrade plan pre-selected)
Step 2:  Billing period toggle (Annual pre-selected, show savings amount)
Step 3:  Payment details (card number, expiry, CVC, billing name)
         Show accepted card logos. Stripe Element for PCI compliance.
Step 4:  Order summary (plan, price, next billing date) → [Subscribe / Upgrade]
Success: Confirmation screen + "You're now on [Plan name]" + receipt email sent
```

### Notification Centre (Bell Icon Panel)
```
Header:  "Notifications" title | "Mark all as read" link
Filter:  All | Unread | Mentions | Team
Items:   Avatar + "[Actor] [action] in [context]" + relative time + blue dot (unread)
         Tap item → navigate to the relevant record, mark as read
Footer:  "View all activity" → full notification log page
Empty:   "You're all caught up" + subtle illustration
```
