# UI, theme and components

## 1. Theme

Defined once in `src/index.css` inside Tailwind's `@theme` block, so every colour is available as a
utility class (`bg-ink-850`, `text-gold-400`, `border-line`, …). The whole site is dark.

| Token group | Values | Used for |
|-------------|--------|----------|
| `ink-950 … ink-600` | `#07061a` → `#2e2866` | Page background, cards, borders (deep navy, from the dashboard mockup) |
| `brand-200 … brand-900` | `#ddd6fe` → `#3b1785` (violet, `brand-500 = #8b5cf6`) | Primary buttons, active nav, charts, balance card gradient |
| `gold-200 … gold-600` | `#ffefb8` → `#b98207` | Accents from the webinar deck: ranks, crowns, "Join Now", key amounts |
| `fg`, `muted`, `subtle` | `#f4f2ff`, `#a6a2cf`, `#6f6a9e` | Text: primary, secondary, tertiary |
| `line` | violet at 16% | Borders and dividers |
| `success`, `danger`, `warning`, `info` | green, rose, amber, sky | Status only (never used as chart series colours) |

Fonts (loaded in `index.html`): **Montserrat** 600–900 for display headings (`font-display`,
uppercase on the website) and **Plus Jakarta Sans** for everything else.

Shared classes in `index.css`:

| Class | Effect |
|-------|--------|
| `.card` / `.card-pad` | Rounded translucent card with border / standard padding |
| `.hero-gradient` | Violet gradient used by the balance card and CTAs |
| `.gold-text`, `.violet-text` | Gradient text |
| `.glow-title` | Neon glow for website headings (gold words inside use a filter glow) |
| `.grid-bg`, `.gold-line` | Decorative grid background, gold divider |
| `.input` | Standard text input style |
| `.no-print` | Hidden when printing (reports) |

To re-brand: change the hex values in `@theme`; components pick them up automatically.

## 2. Component library (`src/components/ui`, import from `components/ui`)

| Component | Props (main) | Notes |
|-----------|--------------|-------|
| `Button` | `variant` primary \| gold \| outline \| ghost \| danger \| success, `size` sm \| md \| lg \| icon, `loading`, `to` (router link), `href` | Renders `<button>`, `<Link>` or `<a>` |
| `Card`, `CardHeader` | `title`, `subtitle`, `action` | |
| `StatCard` | `label`, `value`, `hint`, `icon`, `tone` violet \| gold \| green \| blue \| red \| pink | KPI tile |
| `Input`, `Select`, `Textarea` | `label`, `error`, `hint`, `required`, `icon`, `right` (Input), `options` + `placeholder` (Select) | Accessible labels via `useId` |
| `FileField` | `label`, `file`, `onChange(file)`, `existing` | Styled file picker |
| `Toggle` | `checked`, `onChange`, `label`, `description` | Switch |
| `Spinner`, `PageLoader`, `EmptyState`, `ErrorState`, `Notice` | | Loading / empty / error / callout states |
| `StatusBadge` | `status`, `label?` | Colour by status (pending, approved, rejected, paid, lapsed…) |
| `Modal` | `open`, `onClose`, `title`, `subtitle`, `footer`, `size` sm \| md \| lg \| xl | Bottom sheet on mobile, centred on desktop, Esc to close |
| `ConfirmModal` | `onConfirm({ reason, input })`, `reasonLabel`, `requireReason`, `inputLabel`, `requireInput`, `variant` | Replaces browser confirm/prompt |
| `DataTable` | `columns [{ key, header, render?, align? }]`, `rows`, `loading`, `empty`, `onRowClick`, `dense` | Horizontal scroll on small screens |
| `Pagination` | `page`, `pages`, `total`, `onChange` | |
| `PageHeader` | `title`, `subtitle`, `icon`, `actions` | Top of every panel page |
| `Tabs` | `tabs [{ value, label, count? }]`, `value`, `onChange` | Scrollable on mobile |
| `CopyButton` | `text`, `label` | Clipboard + toast |
| `KeyValue` | `items [[label, value]]` | Two-column details list |
| `ProgressBar` | `value` 0–100, `tone` violet \| gold \| green | |

App-specific components (`src/components/common`):

| Component | Purpose |
|-----------|---------|
| `Logo`, `LogoMark` | iSkillMatrix wordmark and icon |
| `Money` | ₹ amount that hides when the member toggles "hide amounts" |
| `BadgeMedal` | Medal/crown for an achievement badge (locked state supported) |
| `WalletArt` | Wallet illustration on the balance card |
| `IncomeBreakdown` | Six income types: proportion bar + labelled list + total |
| `TreeView` | Lazy-loading unilevel tree (expand to load children; "Focus" to re-root) |
| `ChartTooltip` | Tooltip body for Recharts |
| `FileLink` | Opens a private upload (stored in Cloudinary) via `/api/files/:ref`, which checks permission |
| `PasswordInput` | Password field with show/hide |
| `Avatar` | Initials avatar |

## 3. Charts

Built with Recharts, following these rules:

- **One measure per chart, one y-axis.** Admin "Daily collection" (₹) and "Daily registrations" (count)
  are two separate charts, never a dual axis.
- Single-series charts use brand violet, thin 2 px lines, rounded bar tops, a hover tooltip with a
  dashed crosshair (area) or highlighted column (bars). No legend for a single series — the title names it.
- **Income type colours** (fixed order, never re-assigned) were validated for colour-blind safety
  against the card surface `#120f2e` (worst adjacent CVD ΔE 9.4, normal-vision ΔE 19.3):

| Income type | Colour |
|-------------|--------|
| Active | `#9085e9` |
| Passive | `#199e70` |
| Weekly | `#d95926` |
| Monthly bonus | `#3987e5` |
| Non-working | `#c98500` |
| Royalty | `#d55181` |

  Defined in `src/lib/constants.js` (`INCOME_TYPES`). Every coloured mark is also labelled in text,
  so meaning never depends on colour alone. If you add a 7th type, re-validate the palette.

## 4. Responsive behaviour

- Designed mobile-first; checked at ~390 px and 1440 px widths.
- Member panel on phones: top bar + bottom navigation bar (Home, Team, Earning, Wallet, More), cards
  stack in one column, quick-action circles in a 4-column row — matching the provided mockup.
- Tables scroll horizontally inside their card instead of squeezing columns.
- Modals become bottom sheets on phones.

## 5. Accessibility

- Every input has a visible label tied with `htmlFor`/`id`; icon-only buttons have `aria-label`.
- Focus rings on all interactive elements (`focus-visible:ring`).
- Status is shown as text in badges, not colour alone.
- Text colours meet contrast on the dark surfaces (`fg`, `muted` for body text; `subtle` only for hints).

## 6. Printing

Reports use `window.print()`; elements with `.no-print` (filters, buttons) are hidden and the page
switches to a white background, so "Save as PDF" in the print dialog gives a clean report.
