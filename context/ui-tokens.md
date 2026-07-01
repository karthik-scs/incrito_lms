# UI Tokens

Design tokens for incrito LMS. All colors, typography, spacing, and component values used throughout the UI. Use these exact values in every component — never hardcode colors or use raw Tailwind color classes.

---

## How to Use

This project uses **Tailwind CSS v4**. All design tokens are defined using the `@theme` directive in `app/globals.css`. No `tailwind.config.ts` needed for colors or tokens.

Tailwind v4 automatically generates utility classes from `@theme` variables:

- `--color-accent` → `bg-accent`, `text-accent`, `border-accent`
- `--color-surface` → `bg-surface`, `text-surface`, `border-surface`

```tsx
// Correct — uses generated utility classes
className="bg-surface text-text-primary border-border"

// Also correct — references CSS variable directly when needed
style={{ color: 'var(--color-text-primary)' }}

// Never — hardcoded hex values
className="bg-[#F6F7FB] text-[#101828]"

// Never — raw Tailwind color classes
className="bg-purple-500 text-gray-600"
```

---

## globals.css — Complete Token Definition

```css
@import "tailwindcss";

@theme {
  /* Font */
  --font-sans: "Inter", sans-serif;

  /* Page and surface backgrounds */
  --color-background: #f6f7fb;
  --color-surface: #ffffff;
  --color-surface-secondary: #f9fafb;
  --color-surface-tertiary: #f2f5f7;
  --color-surface-muted: #f4f5fb;

  /* Borders */
  --color-border: #e7eaf3;
  --color-border-light: #e5e7eb;
  --color-border-muted: #dfe1e7;

  /* Text */
  --color-text-primary: #101828;
  --color-text-secondary: #6a7282;
  --color-text-muted: #99a1af;
  --color-text-dark: #364153;
  --color-text-darker: #36394a;
  --color-text-darkest: #111827;
  --color-text-black: #131316;
  --color-text-slate: #272835;
  --color-text-slate-medium: #666d80;

  /* Primary accent — purple */
  --color-accent: #0545b0;
  --color-accent-dark: #2b1cb5;
  --color-accent-light: #f3e8ff;
  --color-accent-muted: #faf5ff;
  --color-accent-foreground: #ffffff;

  /* Success — green */
  --color-success: #10b981;
  --color-success-alt: #00bc7d;
  --color-success-dark: #007a55;
  --color-success-darker: #009966;
  --color-success-light: #d0fae5;
  --color-success-lightest: #ecfdf5;
  --color-success-foreground: #007a55;

  /* Info — blue */
  --color-info: #61a8ff;
  --color-info-dark: #155dfc;
  --color-info-medium: #2b7fff;
  --color-info-light: #dbeafe;
  --color-info-lightest: #eff6ff;
  --color-info-foreground: #155dfc;
  --color-info-muted: #94a2c5;

  /* Warning — orange */
  --color-warning: #ff8904;
  --color-warning-foreground: #ffffff;

  /* Error — red */
  --color-error: #ef4444;
  --color-error-foreground: #ffffff;

  /* Dark overlays */
  --color-overlay: #111827;
  --color-overlay-dark: #131316;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

---

## Dark Mode

Dark mode is a `.dark` class on `<html>`, toggled by `components/theme/ThemeToggle.tsx` and persisted to `localStorage`. It overrides the same CSS variables defined in `@theme` above — every component already uses `bg-surface`, `text-text-primary`, etc., so nothing in component code needs a `dark:` variant; the variable just resolves differently.

```css
/* app/globals.css */
.dark {
  --color-background: #0d0e14;
  --color-surface: #16171f;
  --color-surface-secondary: #1c1d27;
  --color-surface-tertiary: #1a1b24;
  --color-surface-muted: #1e1f29;

  --color-border: #2b2c38;
  --color-border-light: #33343f;
  --color-border-muted: #2e2f3a;

  --color-text-primary: #f3f4f6;
  --color-text-secondary: #9aa1b0;
  --color-text-muted: #7c8392;
  --color-text-dark: #cbd2dc;
  --color-text-darker: #d4d6e0;
  --color-text-darkest: #f9fafb;
  --color-text-black: #f5f5f6;
  --color-text-slate: #c7c8d4;
  --color-text-slate-medium: #9ea4b3;

  --color-accent-light: #2a1f47;
  --color-accent-muted: #241c38;
  --color-accent-dark: #3d2bc9;

  --color-success-dark: #34d399;
  --color-success-darker: #2dd4a8;
  --color-success-light: #103326;
  --color-success-lightest: #0d2a20;
  --color-success-foreground: #34d399;

  --color-info-light: #142b4d;
  --color-info-lightest: #11233d;
  --color-info-foreground: #7fb1ff;
  --color-info-muted: #6b7794;

  --color-overlay: #05060a;
  --color-overlay-dark: #030305;
}
```

`--color-accent` itself, the success/info/warning/error base colors, and the podium/chart-axis hardcoded hex values are unchanged in dark mode — they're saturated enough to read on both backgrounds. Only the "light tint" variants (`*-light`, `*-lightest`, `*-muted`) and text colors needed dark-mode equivalents, since those were designed as subtle tints against a white surface.

---

## Color Usage Guide

### Page Layout

| Element              | Token                  |
| -------------------- | ---------------------- |
| Page background      | `bg-background`        |
| Card / panel surface | `bg-surface`           |
| Secondary surface    | `bg-surface-secondary` |
| Muted surface        | `bg-surface-muted`     |
| Default border       | `border-border`        |
| Light border         | `border-border-light`  |

### Typography

| Element                       | Token                            |
| ----------------------------- | -------------------------------- |
| Headings, primary content     | `text-text-primary` (#101828)    |
| Secondary labels, captions    | `text-text-secondary` (#6A7282)  |
| Placeholder, muted, timestamp | `text-text-muted` (#99A1AF)      |
| Dark labels                   | `text-text-dark` (#364153)       |

### Accent (Primary Purple)

Used for: primary buttons, active nav items, progress fill, role accent, focus rings.

| Element                  | Token                    |
| ------------------------ | ------------------------ |
| Primary button bg        | `bg-accent`              |
| Primary button text      | `text-accent-foreground` |
| Light badge bg           | `bg-accent-light`        |
| Subtle/muted bg          | `bg-accent-muted`        |
| Active nav item          | `text-accent`            |
| Focus ring               | `ring-accent`            |

### Progress / Completion Colors

Progress bars and completion rings use color stops based on percentage:

| Completion Range | Color  | Token                                   |
| ---------------- | ------ | --------------------------------------- |
| 80–100%          | Green  | `text-success` / `bg-success-lightest`  |
| 60–79%           | Blue   | `text-info` / `bg-info-lightest`        |
| Below 60%        | Orange | `text-warning`                          |

### Status Badges

| Status       | Background             | Text                      |
| ------------ | ---------------------- | ------------------------- |
| Published    | `bg-success-lightest`  | `text-success-foreground` |
| Draft        | `bg-surface-secondary` | `text-text-secondary`     |
| Archived     | `bg-surface-muted`     | `text-text-muted`         |
| Scheduled    | `bg-info-lightest`     | `text-info-foreground`    |
| Completed    | `bg-success-lightest`  | `text-success-foreground` |
| Cancelled    | `bg-surface-muted`     | `text-text-muted`         |
| Submitted    | `bg-info-lightest`     | `text-info-foreground`    |
| Graded       | `bg-success-lightest`  | `text-success-foreground` |
| Overdue      | `bg-error` opacity-10  | `text-error`              |

### Premium Plan Badge

Used anywhere Intensive Pro-only access needs to read as a premium upsell, not just a generic lock (locked modules/lessons, certificate plan-access tags, the roadmap plan indicator): `bg-premium-light` / `text-premium-foreground`, medium `Badge` size, with a `Crown` icon (`lucide-react`) — `<Badge variant="premium" size="md"><Crown size={13} className="mr-1 inline" />Intensive Pro</Badge>`. Gold, not the generic `accent`/`info` badge colors, so it visually reads as a plan upsell rather than a status label.

### Role Badges

| Role            | Background             | Text                      |
| --------------- | ---------------------- | ------------------------- |
| Mentor          | `bg-accent-light`      | `text-accent`             |
| Student         | `bg-info-lightest`     | `text-info-foreground`    |
| Admin           | `bg-surface-secondary` | `text-text-secondary`     |
| Cohort Manager  | `bg-success-lightest`  | `text-success-foreground` |
| Custom Role     | `bg-warning` opacity-10| `text-warning`             |

### Activity Dots (Notification Feed)

| Activity Type       | Outer ring             | Inner dot            |
| ------------------- | ---------------------- | -------------------- |
| Enrollment          | `bg-success-light`     | `bg-success-alt`     |
| Class attended      | `bg-info-light`        | `bg-info`            |
| Assignment graded   | `bg-accent-light`      | `bg-accent`          |
| Certificate issued  | `bg-warning` opacity-20| `bg-warning`         |
| New class scheduled | `bg-info-light`        | `bg-info-medium`     |

Dot size: 8px inner circle, 16px outer ring.

### Leaderboard Podium Colors

| Position | Color                 |
| -------- | --------------------- |
| 1st      | `#FFD700` (Gold)      |
| 2nd      | `#C0C0C0` (Silver)    |
| 3rd      | `#CD7F32` (Bronze)    |

These are the only hardcoded hex values allowed in components — all other colors must use token classes.

### Dashboard Chart Colors

| Chart                              | Color / Token                                              |
| ---------------------------------- | ---------------------------------------------------------- |
| Enrollments Over Time (line)       | `var(--color-accent)` stroke, 3px, fill rgba(124,92,252,0.15) |
| Assessment Pass Rate (bars)        | `var(--color-success)`                                     |
| Active Students (bars)             | `var(--color-info)`                                        |
| User Growth (admin dashboard, area)| `var(--color-accent)` stroke, 3px, fill opacity 0.15        |
| Enrollments Overview (admin, donut)| `var(--color-success)` / `var(--color-info)` / `var(--color-warning)` per segment |
| Top Courses by Enrollments (bars)  | `var(--color-accent)`                                       |
| Revenue Overview (bars)            | `var(--color-success)`                                      |
| Revenue Trend (line)               | `var(--color-info)` stroke, 3px                              |
| Chart grid lines                   | `1px dashed var(--color-border)`                           |
| Chart axis labels                  | `#9CA3AF`, 12px                                            |

"Users by Country" on the admin dashboard mockup is a world map; no mapping library is approved, so it's rendered as a simple bar-list using the same `bg-accent` progress-bar pattern instead.

---

## Typography Scale

| Element                   | Size  | Weight | Line height | Color token               |
| ------------------------- | ----- | ------ | ----------- | ------------------------- |
| Logo text                 | 19px  | 700    | 28px        | `text-text-darkest`       |
| Stat number (dashboard)   | 30px  | 600    | 36px        | `text-text-primary`       |
| Section heading (cards)   | 16px  | 600    | 24px        | `text-text-primary`       |
| Nav item (active)         | 14px  | 500    | 20px        | `text-accent`             |
| Nav item (inactive)       | 14px  | 500    | 20px        | `text-text-dark`          |
| Body / primary content    | 14px  | 500    | 20px        | `text-text-primary`       |
| Card label / secondary    | 14px  | 500    | 20px        | `text-text-secondary`     |
| Trend badge text          | 12px  | 500    | 16px        | `text-success-darker`     |
| Timestamp / muted         | 12px  | 400    | 16px        | `text-text-muted`         |
| Chart axis labels         | 12px  | 400    | 15px        | `#9CA3AF`                 |

Font family: **Inter** — always imported via `next/font/google` in root layout. Never use system fonts.

---

## Spacing

| Token       | Value      | Usage                         |
| ----------- | ---------- | ----------------------------- |
| `gap-1`     | 4px        | Tight inline gaps             |
| `gap-2`     | 8px        | Badge and tag spacing         |
| `gap-3`     | 12px       | Form field gaps               |
| `gap-4`     | 16px       | Component internal gaps       |
| `gap-6`     | 24px       | Between sections in a card    |
| `gap-8`     | 32px       | Between page sections         |
| `p-4`       | 16px       | Small card padding            |
| `p-6`       | 24px       | Standard card padding         |
| `px-4 py-2` | 16px / 8px | Button padding                |
| `px-3 py-1` | 12px / 4px | Badge padding                 |

Page padding: `px-8 py-8` (32px). Max page width: `max-w-[1440px] mx-auto`.

---

## Component Tokens

### Cards

```
background:    bg-surface
border:        1px solid border-border   →   class: border border-border
border-radius: 16px                      →   class: rounded-2xl
padding:       24px                      →   class: p-6
box-shadow:    0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)
               →   class: shadow-sm
```

### Buttons

**Primary:**
```
bg-accent text-accent-foreground rounded-md px-4 py-2 text-sm font-medium
hover:bg-accent-dark transition-colors
```

**Secondary:**
```
bg-surface border border-border text-text-primary rounded-md px-4 py-2 text-sm font-medium
hover:bg-surface-secondary transition-colors
```

**Ghost:**
```
bg-transparent text-text-secondary rounded-md px-4 py-2 text-sm font-medium
hover:bg-surface-secondary transition-colors
```

**Danger:**
```
bg-error text-error-foreground rounded-md px-4 py-2 text-sm font-medium
hover:opacity-90 transition-opacity
```

### Input Fields

```
bg-surface border border-border rounded-md px-3 py-2 text-sm
text-text-primary placeholder:text-text-muted
focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent
```

### Badges

```
rounded-full px-2 py-0.5 text-xs font-medium
```

### Progress Bar

```
Track: h-1 rounded-full bg-border-light
Fill:  h-1 rounded-full — color by completion range (see Progress Colors above)
```

### Trend Badges (stat cards)

```
background: bg-success-lightest
text:       text-success-darker
border-radius: rounded-sm (4px — NOT pill)
padding:    px-2 py-0.5
font-size:  text-xs
font-weight: font-medium
```

### Logo

```
background:    linear-gradient(45deg, #0545b0 0%, #4A2EC5 100%)
border-radius: 10px (rounded-xl)
size:          36×36px
```

---

## Invariants

- Never use hex values directly in components — always use CSS variable tokens
- Font is Inter — always import via `next/font/google`, never system fallback
- Never use raw Tailwind color classes (`bg-purple-500`, `text-gray-600`) — use project tokens
- `--color-accent` (#0545b0) is the only purple — never use Tailwind's built-in purple scale
- Progress bars always use tokens based on completion range — never hardcoded colors
- All borders default to `--color-border` (#E7EAF3) — never `border-gray-*`
- The only acceptable hardcoded hex values: `#9CA3AF` for chart axis labels, and the 3 podium colors
- Card backgrounds are always `bg-surface` (white) — never colored card backgrounds
