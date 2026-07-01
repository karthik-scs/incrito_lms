# UI Rules

Source of truth for all UI implementation in incrito LMS.

Always follow ui-tokens.md before introducing new styles.

---

# Core Principles

1. Build complete UI first using mock data.
2. Verify visually in browser.
3. Wire backend only after UI approval.
4. Reuse existing patterns before creating new ones.
5. Never hardcode colors.
6. Never use Tailwind default color classes.
7. Use design tokens exclusively.

---

# Typography

Font: Inter

```tsx
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});
```

Apply font at root layout.

Never use system fonts.

---

# Layout

Page Wrapper:

```tsx
max-w-[1440px] mx-auto px-8 py-8
```

Rules:

* Page width: 1440px
* Page padding: 32px
* Section gap: 32px
* Card spacing: 24px

---

# Navigation

**This section previously said "no sidebar, top navbar only" — corrected. Every dashboard mockup
(admin dashboard, trainer panel) uses a left sidebar, never a flat top navbar; only the auth pages
(login/signup/etc.) use the split gradient-panel layout documented separately. Sidebar is the actual
pattern for every authenticated/dashboard page.**

Sidebar (role-aware), left-fixed, `bg-surface`, `border-r border-border`:

* Logo at top
* Nav items vertically stacked, icon + label, active item gets `bg-accent-light text-accent` (rounded pill)
* User profile (avatar, name, role badge) pinned at the bottom

Each dashboard page's main content area has its own top bar inside the page (greeting, search, date-range selector, notification/settings/theme icons, avatar) — this is per-page content, not a second global nav.

Student Navigation:

* Dashboard
* My Courses
* Live Classes
* Assignments
* Assessments
* Community
* Leaderboard
* Progress
* Certificates

Mentor Navigation:

* Dashboard
* My Cohorts
* Sessions
* Calendar
* Discussions
* Announcements
* Analytics
* Settings

Admin Navigation:

* Dashboard
* Users
* Courses
* Cohorts
* Enrollments
* Reports
* Announcements
* Categories
* Tags
* Certificates
* Settings

---

# Cards

All major content must live inside cards.

```tsx
bg-surface
border border-border
rounded-2xl
p-6
```

Never use colored card backgrounds.

---

# Buttons

Primary:

```tsx
bg-accent
text-accent-foreground
rounded-md
px-4
py-2
```

Secondary:

```tsx
bg-surface
border
border-border
rounded-md
px-4
py-2
```

---

# Forms

Inputs:

```tsx
bg-surface
border
border-border
rounded-md
px-3
py-2
```

Focus:

```tsx
ring-1 ring-accent
border-accent
```

---

# Empty States

Every data-driven page must support:

* Empty data
* Loading
* Error state

Never leave blank screens.

---

# Dashboard Rules

Student Dashboard:

* Upcoming classes
* Pending assignments
* Progress summary
* Activity feed
* Leaderboard position

Mentor Dashboard:

* Upcoming classes
* Student overview
* Ungraded submissions
* Recent enrollments

Admin Dashboard:

* System statistics
* Analytics charts
* User growth
* Completion rates

---

# Course Components

Course Cards must contain:

* Thumbnail
* Title
* Mentor
* Status
* Module count
* CTA

---

# Assignment Components

Assignment Cards must contain:

* Title
* Due date
* Status
* Max marks
* Submission CTA

---

# Assessment Components

Assessment Cards must contain:

* Title
* Passing score
* Time limit
* Attempt count
* Status
* Start button

---

# Progress Components

Use token-based colors.

Progress ranges:

80-100

```tsx
bg-success
```

60-79

```tsx
bg-info
```

Below 60

```tsx
bg-warning
```

---

# Leaderboards

Use podium component.

Allowed hardcoded colors:

Gold

```css
#FFD700
```

Silver

```css
#C0C0C0
```

Bronze

```css
#CD7F32
```

No other hardcoded colors allowed.

---

# Charts

Use Recharts only.

Chart colors must come from tokens.

Never hardcode chart palettes.

---

# Icons

Use Lucide React only.

No mixed icon libraries.

---

# Accessibility

Required:

* Keyboard navigation
* Focus states
* Proper labels
* Semantic HTML
* Minimum touch target 44px

---

# Responsive Rules

Desktop First

Breakpoints:

* Mobile
* Tablet
* Desktop

No horizontal scrolling.

All tables must support responsive overflow.

---

# Component Ownership

Components:

* UI only
* No API calls
* No database logic
* No business rules

Pages:

* Data loading
* State management
* API integration

Backend:

* Business logic
* Validation
* Persistence

---

# Do Nots

* No Tailwind color classes
* No hardcoded hex values
* No gradients
* No fixed positioning
* No inline styles unless required
* No business logic in components
* No duplicated UI patterns
* No raw API errors shown to users
