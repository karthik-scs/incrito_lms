# incrito LMS — Changelog

Cohort-based LMS built as a Next.js 16 + Tailwind v4 frontend with a separate Node.js/Express 5 + Prisma 7 + PostgreSQL + Redis API. This file tracks every notable change so far, newest first. See `context/progress-tracker.md` for the running build log and `context/build-plan.md` for the phase roadmap.

---

## [0.26.0] - 2026-07-01

### Changed
- Chat permission matrix tightened: Admin can now only message Cohort Managers and Mentors — no direct Admin↔Student interaction at all, in either direction. Students no longer see an Admins tab in "New Chat."
- Mentor↔Student contacts are now visible-but-locked (each side can see who their cohort's mentor/students are, with a lock icon and "coming soon" tooltip) instead of hidden entirely.
- "New Chat"'s Students tab is labeled "Cohort Members" for Students specifically, since it's just their own classmates.

## [0.25.0] - 2026-07-01

### Added
- Chat rebuilt from per-cohort group rooms to 1:1 direct messages with a real, server-enforced role-based permission matrix: Mentor↔Cohort Manager only if they share a cohort; Cohort Manager↔Student only within a managed cohort; Student↔Student only within the same cohort. Mentor↔Student direct messaging and voice/video calling are explicitly deferred (premium, design later) — not built this round.
- "New Chat" directory with role-separated tabs (Admins/Cohort Managers/Mentors/Students), each tab showing only who the current user is actually allowed to message.
- Polls and Events in Premium Communities — creation restricted to Admin/Mentor/Cohort Manager, voting/viewing open to all members.

### Removed
- Cohort Group chat — replaced entirely by 1:1 direct messages. Existing message history was preserved (not deleted), just no longer reachable through the new UI.

---

## [0.24.0] - 2026-07-01

### Added
- Real global search in the topbar — searches Courses (everyone), Communities (ones you can see), and Users (Admin only), debounced dropdown with click-to-navigate.
- "Open Community" button on each Admin Community management card — the actual missing link to the community feed (the backend already supported Admin posting/commenting; there was just no way to click through to it).

### Fixed
- Notification "Mark as read" now actually removes the notification from the dropdown instead of just re-styling it in place.
- Removed the non-functional date-range pill from the dashboard greeting banner (no filtering was ever wired to it).

---

## [0.23.0] - 2026-07-01

### Added
- Admin can now open and discuss in any course's Standard discussion — fixed the underlying course-roadmap endpoint that previously 403'd for anyone without a real student enrollment (which Admin never has). Added a "Discussion" link on each Admin Courses card.
- Admin Announcements — create and broadcast real announcements (title, message, audience: Everyone/Students/Mentors/Cohort Managers), fanned out as real notifications to every matching user. List, recipient counts, delete.
- Admin Reports — real platform analytics: summary stat cards, Course Performance table, Cohort Performance table, both with CSV export.

---

## [0.22.0] - 2026-06-30

### Added
- Admin Dashboard now renders real platform data and analytics — every stat card, chart, and feed is computed from actual database rows (user growth, enrollment completion buckets, top courses, recent activity, and revenue derived from paid-course enrollments). No mock/static numbers remain on this page.
- Admin Users page: Role/Status filters, an avatar in the User column, and a single combined Edit modal (name, email, mobile, role, status, optional password reset) replacing the old inline Suspend/Activate link.
- Calendar gained Day/Week/Month views with a switcher (previously week-only).
- Premium communities can now have a cover/thumbnail image.
- Courses Settings tab in Admin Settings (Category + Tags management) — the standalone Categories/Tags pages and sidebar items were removed.
- Total IP (Incrito Points) pill in the student topbar, summed across all enrolled cohorts.

### Changed
- "XP" renamed to "IP (Incrito Points)" everywhere it's displayed.
- Admin sidebar's Community icon changed from `MessageSquare` to `Globe` (was visually too close to the Chat icon).
- The platform's bootstrap admin account is now hidden from the Users list and protected from edits via any user-management endpoint.

### Fixed
- Reply/comment input boxes in the premium community feed and Standard discussion were collapsing to a narrow box instead of filling the row.

---

## [0.21.0] - 2026-06-30

### Added
- Premium Community system — admin-created, membership-gated communities, separate from the per-cohort Standard discussion. New `Community`/`CommunityMember` models; admins (or anyone with the new `community:manage` permission) create communities and add/remove members of any role (student, mentor, cohort manager); only added members (and Admin) can see or post in a community.
- Emoji reactions everywhere — replaced the fixed 3-value `ReactionType` enum with a real `emoji` string field, backed by a small `EmojiPicker`. Used on posts and comments in both the new premium community and the existing Standard discussion (the old heart "Like" button is now a fixed-emoji shortcut over the same system).
- Comment editing and deletion (own comments only) in both the premium community and Standard discussion, with an "· edited" indicator.
- @mentions — type `@` in any composer/reply/edit box to autocomplete and tag a community or cohort member; rendered as a styled `@Name` tag.
- Voice notes and file/media attachments in the premium community composer, reusing the existing chat voice-note recorder and discussion-attachment upload.
- New Admin sidebar item and page (`/admin/community`) for managing communities and their membership.
- `/community` now shows two sections: Premium Communities (only ones you're a member of) and Course Discussions; Admin sees every community regardless of membership.

---

## [0.20.0] - 2026-06-30

### Fixed
- Admin `Sidebar`'s active-nav-item check was an exact path match, so "Courses" lost its highlight the moment you navigated into a sub-page like the manage-curriculum view (`/admin/courses/[slug]`). Now matches on path prefix (`pathname === href || pathname.startsWith(href + "/")`) for every role's nav items, not just Courses.
- Removed the "View Roadmap" map-icon link from the Admin Courses list — it pointed at the student-only `/courses/[slug]/roadmap` page, which 403s for anyone without a real student `Enrollment`. Roadmap is a per-student concept; Admin/Mentor/Cohort Manager have no use for it on this page.

---

## [0.19.0] - 2026-06-29

### Added
- A course can now award more than one certificate — `CourseCertificate` allocations, each unlocked either by whole-course 100% completion or by completing a specific set of modules. New admin `CourseCertificatesPanel` (course curriculum page) manages allocations; the student certificate page shows one card per allocation with its own unlock state, view/download/share.
- Module and lesson reordering — collision-safe `PATCH /api/modules/reorder` / `PATCH /api/lessons/reorder`, wired into the admin curriculum page via native HTML5 drag-and-drop (grip handles, optimistic reorder).
- The admin curriculum page's modules list is now a real accordion (independent collapse/expand per module).
- Certificate Designer: a real "Add Image" toolbar button (free-floating image layers, independent of the background image), plus a visual pass toward a more modern, professional canvas-editor look (recessed canvas stage, grouped toolbar, consistent panel headers).

### Changed
- `Certificate`'s uniqueness constraint became `(userId, cohortId, courseCertificateId)` instead of `(userId, cohortId)`, since a student can now hold more than one certificate for the same cohort. Migrated with a full data backfill — every existing course/certificate kept its original template assignment.

### Fixed
- Confirmed (no code change needed) that `CourseTabs`' Certificate-tab active-state highlight already worked correctly.

### Found, not yet fixed
- `Progress.completionPercentage` can go stale relative to a course's current lesson count if lessons are added after a student's progress was last recomputed — flagged during certificate-eligibility testing, not addressed this round.

---

## [0.18.0] - 2026-06-29

### Added
- Certificate Designer (`/admin/certificates/[id]/design`) — a real canvas editor for certificate templates: upload a background, add text/variable/image/QR-code layers, drag to position (percentage-based, resolution-independent), save. Variables: student name, course title, cohort name, certificate number, issue date, instructor name.
- Real PDF download for certificates — previously honestly disabled ("PDF rendering isn't built"). Now rasterizes the actual designed certificate (`html2canvas` + `jsPDF`, dynamically imported) and downloads a real PDF.
- Real QR codes on certificates, generated client-side (`qrcode` package) pointing at each certificate's own public verification URL.
- "View Certificate" in the Certificate History table now opens a popup (`CertificateViewModal`) instead of navigating away.

---

## [0.17.0] - 2026-06-29

### Added
- Single-tunnel public access — `next.config.ts` now proxies `/api/*` and `/uploads/*` to the Express API, so one ngrok tunnel covers the whole app (frontend + API + uploaded files) instead of needing a separate public address per port, which the free ngrok plan doesn't support (one reserved domain only).

### Fixed
- Login through the public link appeared to just refresh the page instead of navigating anywhere — Next dev's hot-reload client was being blocked as cross-origin when loaded from a tunnel domain, which broke client-side hydration entirely (the login form fell back to a native HTML submit). Fixed via `allowedDevOrigins` in `next.config.ts`.
- The same symptom on the LAN IP (`192.168.1.37`) had two causes: the IP wasn't in `allowedDevOrigins` either, and even after that, the actual login request 500'd because Express's CORS check rejected the `Origin` header the browser sent (curl doesn't send one, which is why earlier testing missed this). Added the LAN IP to both `allowedDevOrigins` and `CORS_ORIGIN`.
- A stale Turbopack cache was causing every `app/(auth)/*` route (login, signup, forgot-password) to 404 locally — fixed by clearing `.next`.
- A real crash in the Discussion page: rendering a reply (not a top-level comment) threw `Cannot read properties of undefined (reading 'length')` on `comment.replies` — replies-of-replies are never fetched (one level of threading by design), but the check accessed `.length` before checking depth. Fixed the condition order and made the type honestly optional.

---

## [0.16.0] - 2026-06-29

### Added
- Student/Mentor/Cohort Manager dashboards (`/dashboard`) — previously 404'd for every non-Admin role despite the sidebar linking there. One self-service `GET /api/me/dashboard` endpoint, real data per role (continue-learning + upcoming live classes + notifications for students; cohorts + live classes + pending grading for mentors; cohorts + at-risk/completion stats + recent enrollments for cohort managers).

### Fixed
- Uploaded avatars (and any other uploaded file) silently failed to render in the browser — `PUBLIC_API_URL` was pointed at the ngrok tunnel domain so the Zoom webhook would work, but that same variable also builds every uploaded-file URL, and ngrok's free tier shows a browser-warning HTML page instead of the real file to any browser-originated request, which an `<img>` tag has no way to bypass. Split into `PUBLIC_API_URL` (back to localhost, used for files) and `PUBLIC_WEBHOOK_URL` (the ngrok domain, used only for the Zoom webhook).

---

## [0.15.0] - 2026-06-28

### Added
- Admin Cohort Management page rebuilt to match a referenced mockup — stat cards (Total Enrolled, Active Cohorts, Avg. Grade Rate, At-Risk Students, all from real `Progress` data), status/category filter tabs with live counts, search, and a grid/list view toggle.
- Cohorts can now have multiple cohort managers (`CohortManagerAssignment` join table replaces the single `cohortManagerId` column) — manageable from both the create/edit modal (`MultiSelect`) and a new "Cohort Managers" card on the cohort detail page.
- `CohortStatus` expanded to Active/Upcoming/Completed/Cancelled/Archived (was Scheduled/Active/Completed/Cancelled).
- File attachments on discussion comments and chat messages (image/video/PDF/Word/Excel), plus voice notes in chat recorded directly in the browser via the native `MediaRecorder` API.
- A "Members" panel in chat showing every student/mentor/manager belonging to the active cohort.
- Support nav item moved directly below Community in the student sidebar.

### Fixed
- `AssessmentAttempt`'s missing `onDelete: Cascade` — deleting a quiz with any attempts on it threw a foreign-key error instead of cleanly removing them (same class of bug as the earlier `Submission`/`Assignment` cascade fix).

---

## [0.14.0] - 2026-06-28

### Added
- Quiz attempt count is now visible to students — "Attempt X of Y" on each quiz row and inside the quiz modal, with the retake button disabled once exhausted (the limit itself was already enforced server-side).
- Generic upload infrastructure (`server/src/lib/uploads.ts`, `components/ui/FileUploadField.tsx`) — real file uploads with instant preview, replacing "paste a URL" fields for: course thumbnails (previously had no UI field at all), lesson thumbnails, admin resources, assignment submissions, and certificate template designs. Each category gets its own folder under `uploads/`.

### Fixed
- Avatar upload's "Internal server error" — `multer`'s file-size-limit error wasn't handled by `errorHandler.ts`, so it fell through to a generic 500 with no explanation. Now responds with a clear message ("That file is too large."), and the limit itself was raised from 2MB to 5MB.

---

## [0.13.0] - 2026-06-28

### Added
- Multi-account Zoom integration: new `ZoomAccount` model + Settings → "Live Class API" tab (credentials stored in the database, not env vars). `pickZoomAccount` automatically rotates across accounts once one hits its concurrent-meeting limit (default 2, a Zoom Business plan's limit).
- Public `POST /api/webhooks/zoom?account=<id>` — HMAC-signature-verified, handles `meeting.started`/`meeting.ended` (auto status transitions, no manual "end" step needed) and `recording.completed` (downloads the MP4 and stores it locally under `/uploads/recordings`, instead of just linking to Zoom's own hosted copy).
- Real in-app Zoom joining scaffolded via `@zoom/meetingsdk` (`ZoomMeetingEmbed` + `GET /api/lessons/:id/zoom-signature`) — falls back to a "Join in new tab" button when a Meeting SDK key/secret (a different Zoom app type from the Server-to-Server OAuth credentials) isn't configured for that account.
- Live class hosts are no longer restricted to the Mentor role — Admin, Mentor, and Cohort Manager can all be picked as host.

### Changed
- `isLiveNow` no longer cuts a session off at its scheduled end time — it's joinable for as long as `status` is `LIVE` (set by the webhook or manually), removing the need to guess/enforce an end time at all.
- Removed the single-account `ZOOM_ACCOUNT_ID`/`ZOOM_CLIENT_ID`/`ZOOM_CLIENT_SECRET` env vars — superseded by the database-backed `ZoomAccount` table.

### Known limitation
- The Zoom Server-to-Server OAuth app the user configured is missing the `meeting:write:meeting`/`meeting:write:meeting:admin` scopes needed to actually create meetings (confirmed via Zoom's own error response) — needs to be added in the Zoom Marketplace app config before real (non-mock) meeting creation will work.

---

## [0.12.0] - 2026-06-28

### Added
- `Lesson.thumbnailUrl` — admin lesson form gained a "Thumbnail" URL field (with live preview) for `VIDEO` lessons, shown as the poster before/between plays on both `YouTubePlayer` and the native `<video>` fallback.
- Assignments built end-to-end: reworked `Assignment` from cohort-scoped to course/module/lesson-scoped (mirroring `Assessment`), new `assignment.*` backend module (create/update/delete, student submit, mentor grade-with-feedback), `ASSIGNMENT_GRADED` notification now actually fires, leaderboard points now fold in best quiz/assessment scores and graded assignment marks (previously a flat 10-points-per-lesson only).
- `components/admin/LessonContentModal.tsx` — a "Content" button on every lesson row opening a Quizzes/Assignments/Resources management modal (nested quiz/question builder, assignment + submissions/grading view, resource CRUD) — closes the previous gap where quizzes and resources had real backends but no admin UI at all.
- Student `LessonSidebar` gained a third "Assignments" tab (`AssignmentModal`) — submit text or a file link, see mentor feedback inline once graded.
- `components/lessons/ResourceViewer.tsx` — resources are now viewed in-app (image/video/PDF/DOCX/EXCEL), with no app-rendered download link, replacing the previous plain download-icon link.

### Fixed
- YouTube branding (title, channel name, "Watch on YouTube", suggested videos) was reappearing on every pause/buffer/end, not just before the first play — a prior fix only covered the pre-first-play case. `YouTubePlayer`'s cover is now keyed off the live `playing` boolean instead of a one-time `started` flag.
- Missing `onDelete: Cascade` on `Submission.assignment` — deleting an assignment with submissions threw a foreign-key error instead of cleanly removing them.

---

## [0.11.0] - 2026-06-28

### Added
- `components/layout/AdminLayout.tsx` — reusable shell for every authenticated/dashboard page: fixed sidebar, sticky topbar, scrollable content area. Wired into the admin dashboard; future dashboard pages reuse it instead of recomposing the shell.
- Sidebar collapse: chevron toggle, icon-only `w-20` collapsed state (square favicon mark instead of the full wordmark `Logo`), `Tooltip` (now supports `side="right"`) on every nav item and the profile avatar when collapsed. State persists to `localStorage`.
- Chat icon in the topbar, alongside Settings and Notifications.
- `components/dashboard/ProfileMenu.tsx` — click-to-open profile dropdown (Profile/Log out) replacing the plain avatar; Log out calls the real logout endpoint and redirects to `/login`.
- `components/dashboard/WelcomeBanner.tsx` — the "Welcome back" greeting + date range, now page content rather than part of the fixed topbar.

### Fixed
- Sidebar scrolled away with the page instead of staying fixed — same root cause as an earlier `AuthLayout` bug: no `h-screen overflow-hidden` on the outer container. `AdminLayout` now constrains height at the top level so only `<main>` scrolls.
- Search/Settings/Notifications were inside the scrollable content, so they scrolled out of view. Moved to a sticky topbar (`DashboardTopbar`) rendered outside the scroll container by `AdminLayout`.

### Changed
- `DashboardTopbar` no longer renders the greeting — split into the topbar (icon row only) and `WelcomeBanner` (page content, scrolls normally), per follow-up feedback that "welcome back" should sit below the fixed bar, not inside it.

### Fixed (collapsed sidebar, from a follow-up screenshot)
- Collapse toggle button rendered in its own row below the logo instead of beside it — both now share one row regardless of collapsed state.
- A horizontal scrollbar appeared at the bottom of the collapsed nav list. Cause: `nav` had `overflow-y-auto`, and CSS forces *both* overflow axes non-visible once either one is — the right-side tooltips' layout boxes extending past the narrow collapsed width were enough to trigger it. Removed `overflow-y-auto` entirely (current nav lists are short enough not to need it, and no scroll was wanted here anyway).
- Collapsed icons looked left-aligned instead of centered, and tooltips felt unreliable (the real hover hitbox was the narrow left-aligned icon, not where it visually appeared to be centered). Cause: `Tooltip`'s `inline-flex` wrapper doesn't stretch to fill its flex-column parent. Added a `className` prop to `Tooltip` so `Sidebar` can pass `"w-full"`, making the wrapper actually span the row before its `justify-center` centers the icon.

### Fixed (still off-center, from a second follow-up screenshot)
- Icons still weren't centered: `justify-center` had been left on the `Link` itself, which was never given the width to need any centering (the wrapper had `w-full`, but the `Link` inside it didn't). Moved `justify-center` onto the `Tooltip` wrapper — the actual flex container — matching the pattern already used for the avatar below it.
- Active nav item's background had no breathing room around the icon (`px-0`). Changed to `px-3 py-2.5` so `bg-accent-light` renders as a proper padded pill.
- Logo wasn't lined up with the nav icons/avatar below it: the header row's `justify-between` (logo left, button right) pinned the logo to the left edge regardless of how the button itself was positioned. Made the toggle button `position: absolute` over the row instead of a flex sibling, freeing the logo to use `justify-center` and land exactly on the same center line as everything below it.

### Fixed (collapse felt laggy)
- `transition-[width] duration-150` on the sidebar was animating `width` directly, forcing a layout reflow every frame — and with 5 Recharts widgets on the dashboard each redrawing on resize via `ResizeObserver`, that meant 5 chart redraws firing repeatedly across the animation instead of once. Removed the transition; collapse/expand is now an instant, single resize.

### Changed
- Collapsed nav icon size increased from `18` to `22`.
- `Sidebar` footer now has a Log out icon button next to the avatar/name (expanded), or by itself in place of the avatar (collapsed). Extracted `lib/logout.ts` so the logout fetch+redirect logic is shared between `Sidebar` and `ProfileMenu` instead of duplicated.

---

## [0.10.0] - 2026-06-27

### Added
- Admin dashboard (`/admin/dashboard`), matching `context/design/admin dashboard.png`: `Sidebar` + `DashboardTopbar`, a 4-up stat card row (Total Users/Active Courses/Total Cohorts/Total Enrollments), and 7 widgets across 3 rows — `UserGrowthChart`, `EnrollmentsOverviewChart`, `QuickActions`, `PlatformHealth`, `TopCoursesChart`, `UsersByCountry`, `RecentActivity`, `RevenueOverviewChart`, `RevenueTrendChart`. Installed `recharts` (already approved in library-docs.md, just not installed yet) for the 5 chart widgets; all colors come from CSS variable tokens, never hardcoded hex. All data is mock/static — built ahead of its normal Phase 16 slot at the user's request, no admin analytics API exists yet.
- `components/layout/Sidebar.tsx` — role-aware left sidebar nav (Student/Mentor/Cohort Manager/Admin), active-route highlighting, user profile footer.
- `components/dashboard/` — `DashboardCard` (shared card chrome), `StatCard`, and the 9 widgets listed above.
- Login now redirects `Admin` users to `/admin/dashboard` specifically (other roles still go to the generic `/dashboard`, which doesn't exist yet — pre-existing gap, unrelated to this change).

### Changed
- **`ui-rules.md` corrected**: it previously said "no sidebar, top navbar only," which never matched any dashboard mockup (admin dashboard and trainer panel both use a left sidebar). Updated the Layout/Navigation sections to document the sidebar as the actual pattern for every authenticated page; auth pages keep their separate split gradient-panel layout.
- Deleted `components/layout/Navbar.tsx` (the original top-nav component) — built earlier from the since-corrected rule, never actually used by any page. Replaced by `Sidebar.tsx`.
- `ui-tokens.md`'s Dashboard Chart Colors table extended with the 5 new chart/token mappings.

### Known limitation
- "Users by Country" is a world map in the mockup; rendered here as a simple bar-list instead, since no mapping library is approved in library-docs.md.
- No browser automation tooling (Playwright, chromium-cli) is available in this environment, so the page wasn't verified with an actual rendered screenshot — only a clean build + 200 response. Worth a manual visual check.

---

## [0.9.0] - 2026-06-27

### Added
- Reset Password split into two steps: a standalone "Verify OTP" button checks the code via a new non-consuming `POST /api/auth/check-password-reset-code` endpoint before the new-password fields appear; a "Verified ✓" indicator confirms success.
- 60-second "Resend OTP" cooldown on Reset Password (separate from Verify OTP's existing 45-second one).
- `verification.service.ts` now exposes `checkCode` (validates without consuming) alongside `consumeCode` (validates and marks spent), sharing the same lookup/expiry/attempt-limit logic. The final `reset-password` call still does the real one-time-use consumption — the "Verify OTP" button is a UX convenience, not the security boundary.
- Flow-guard against direct URL access: `lib/authFlowGuard.ts` sets a short-lived (15 min) `sessionStorage` flag right before a legitimate redirect into Verify OTP or Reset Password (from Signup, from Login's "please verify your email" redirect, or from Forgot Password). Both gated pages check the flag on mount and redirect back to the page that should precede them if it's missing, expired, or for a different email.
- `components/ui/InlineAlert.tsx` — badge-style one-line notice (error/success variants) shown on Signup/Forgot Password when the flow guard redirects a visitor back.

### Changed
- Reset Password's copy and layout now reflect the two-step flow (OTP section followed by a password section that only renders once verified).

---

## [0.8.0] - 2026-06-27

### Fixed
- Logo rendering oversized/stretched on the gradient auth panel and in the navbar. Root cause (in order of discovery): first attempt sized it via Tailwind classes (`h-7 w-auto`) that weren't reliably present in the compiled CSS; second attempt passed only a `height` number to `next/image` and relied on its static-import width inference, which was equally unreliable. Final fix: both `width` and `height` passed as explicit numbers computed from each PNG's real pixel dimensions (read directly from the IHDR chunk — logo files are 4786×1259, `login_page_icon.png` is 1536×1024), removing any inference step. Verified at the rendered-HTML level (`width="99" height="26"`), not just a successful build.
- The Signup page's cube illustration had the same bug one level deeper: `width={144}` was set as a prop but an inline `style={{ width: "auto", height: "auto" }}` silently overrode it (inline style always wins over the HTML attribute), so it rendered at its native 1536×1024 size — which is what was forcing the left panel's own scrollbar. Fixed with explicit `width`/`height` numbers and matching `px` styles.
- Left panel of `AuthLayout` showed a scrollbar track at the column boundary even after the image-size fix, because it had `overflow-y-auto` as a (then-unnecessary) safety net. Changed to `overflow-hidden` — it's decorative and sized to fit, so clipping is an acceptable fallback that never shows a scrollbar. The right (form) panel keeps `overflow-y-auto` since it can genuinely need to scroll on a short viewport.
- Removed a stray `import { authorize } from "@/server/src/middleware/authorize"` that had appeared in `AuthLayout.tsx` — unused, and architecturally wrong (Express server middleware has no business in a Next.js layout component). Likely an IDE auto-import gone wrong.
- Form validation previously only ran on submit. Added `onBlur` validation (checks a field when you leave it) plus live re-validation on every keystroke once a field has been touched, across Login, Signup, Forgot Password, and Reset Password.
- Phone number field accepted any character until submit-time validation caught it. Changed to `type="tel"` with non-digit characters stripped on every keystroke and `maxLength={10}` — typing a letter is now simply impossible rather than just flagged afterward.
- Static "must contain..." password caption replaced with a live `components/ui/PasswordStrengthHints.tsx` checklist (5 rules, check/✕ icon per rule, updates every keystroke) on Signup and Reset Password. Exports the shared `PASSWORD_RULES` array so the live hints and submit-time validation can't drift apart.
- Diagnosed two recurring "Internal Server Error" incidents to a stale Turbopack dev cache (`.next/`), not application code — confirmed by comparing a fresh `next build` (correct) against the live `next dev` process's served output (stale). Also learned that deleting `.next` while a `next dev` process is still running can break *that* running process; clear it only between restarts, not while one is live.

---

## [0.7.0] - 2026-06-27

### Added
- Full signup email-verification flow: `signup` now creates the account as `status: INVITED` and issues an OTP instead of logging in immediately; only `POST /api/auth/verify-email` issues tokens (auto-login on success).
- OTP-based forgot/reset password flow: `request-password-reset` and `reset-password` endpoints, with every other active session revoked (Postgres + Redis) once a password is reset.
- `VerificationCode` Prisma model (`EMAIL_VERIFICATION` | `PASSWORD_RESET` purposes, code, expiry, consumed-at, attempt count) and `User.emailVerifiedAt`, migrated as `phase1_email_verification_password_reset`.
- Centralized password policy (min 8 characters, 1 uppercase, 1 lowercase, 1 digit, 1 symbol) in `server/src/validators/password.validators.ts`, shared by signup and reset-password validation.
- No email/SMS provider is wired yet, so every OTP is a fixed `OTP_STATIC_CODE` env var (defaults to `123456`) — documented in code and here as a local-development-only placeholder that must be replaced before this is exposed beyond localhost.
- Three new pages: Verify OTP (`/verify-otp`, 6-box code input + resend cooldown), Forgot Password (`/forgot-password`), Reset Password (`/reset-password`) — matching their respective `context/design/` mockups.
- Signup page rebuilt to match its mockup: full name (split into firstName/lastName client-side before posting), email, phone (`+91` prefix + 10-digit input), password, confirm password.
- Real brand assets wired in from `app/assets/`: `components/layout/Logo.tsx` (theme-aware, picks the light- or dark-background logo variant), `app/icon.jpg` replacing the default Next.js favicon, the cube illustration on Signup's gradient panel.
- `app/page.tsx` (`/`) now redirects straight to `/login` — no separate landing page, per product requirement.
- Bootstrap admin password refreshed to `Admin@2024` (compliant with the new password policy); the seed script's admin upsert now actually overwrites the password/status on every run instead of leaving an existing account untouched.

### Verified
- Full flow exercised end-to-end via curl: signup → wrong-OTP rejected → login-while-unverified blocked with a machine-readable reason → correct-OTP verifies and auto-logs-in → password-reset request → weak-password rejected (422, one message per failed rule) → compliant reset succeeds → login with the new password succeeds.

---

## [0.6.0] - 2026-06-24/27

### Added
- Working light/dark mode, app-wide: `components/theme/ThemeToggle.tsx` toggles a `.dark` class on `<html>`, persists the choice to `localStorage`, and falls back to OS preference on first visit. A `beforeInteractive` script in `app/layout.tsx` applies the stored theme before paint to avoid a flash of the wrong theme.
- `.dark` overrides for every color token in `app/globals.css`, documented in a new "Dark Mode" section of `context/ui-tokens.md` (which previously had no dark-mode values defined at all).
- `components/ui/Tooltip.tsx` — token-styled hover tooltip, replacing the unstyleable native `title` attribute on `ThemeToggle`.

### Changed
- Login page: moved "Don't have an account? Sign up" below the Sign In button (was top-right); removed the "Or sign in with" social-login section entirely (deleted the now-unused `components/icons/BrandIcons.tsx`); changed the left-panel headline to "Learn. Practice. Verify. Get Hired".

### Fixed
- Theme toggle changed the icon but not the actual page colors — traced to a stale `next dev` Turbopack cache that hadn't picked up the new `.dark` CSS rule (confirmed by comparing compiled CSS chunks directly; the production build had it, the dev cache didn't).

---

## [0.5.0] - 2026-06-24

### Added
- `lucide-react` installed (ui-rules.md mandates "Lucide only" for icons; nothing was installed yet).
- Login page redesigned to pixel-match `context/design/login page.png`: icon-led feature list, icon-prefixed inputs, password show/hide toggle, "Your Progress" stat card, security footnote.
- First Next.js UI slice, built UI-first against mock/caller-supplied data: Login and Signup pages, `Navbar` (role-aware via a `role` prop), `Footer`, `PageWrapper`, `CourseCard`/`CourseGrid`, `CohortCard`. All registered in `context/ui-registry.md`.

---

## [0.4.0] - 2026-06-24

### Added
- Express API (`server/`) with a route → controller → service layered architecture: full auth (signup/login/refresh/logout), users, roles (incl. custom-role + permission management), courses, cohorts, categories, tags.
- JWT + bcrypt + Redis auth: short-lived access token carrying `roleId`/`roleName`/`permissions[]`, opaque bcrypt-hashed refresh token in an httpOnly cookie (`sessionId.rawToken`), Redis-backed per-session revocation, refresh-token rotation on every `/refresh` call. `authorize()` middleware checks permission keys (not role names), so the dynamic custom-role system needs no special-casing.
- Seed script: 4 system roles (Student, Mentor, Cohort Manager, Admin) + permissions + one example custom "Support" role + a bootstrap admin account.
- `requestLogger` middleware (logs every `METHOD path -> status`).

### Fixed
- Prisma 7's `PrismaClientOptions` requires a driver adapter — there's no bare `new PrismaClient()` mode anymore. Installed `@prisma/adapter-pg` and instantiate via `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`.
- CORS rejecting requests once `next dev` fell back to port 3001 (3000 was occupied by a stale process) — `CORS_ORIGIN` changed from a single string to a comma-separated list (`corsOrigins`), checked against the request's actual `Origin` header.
- Login requests hanging indefinitely with no local Redis running — `ioredis` was queueing commands while disconnected instead of failing fast. Set `enableOfflineQueue: false` so rate-limit/session-revocation checks reject immediately and fail open as designed.

### Changed
- Used a single root `package.json` for both Next.js and Express dependencies instead of a separate `server/package.json` — simpler, and matches `architecture.md`'s "monolith" framing more directly.

---

## [0.3.0] - 2026-06-24

### Added
- Architect-style planning pass after reviewing all 14 UI mockups in `context/design/` against a full-platform feature request (RBAC, cohort management, live classes/calendar, assignments/quizzes/resources, 2-tier community, leaderboard, certificates, mentor 1:1 booking). The mockups revealed scope not in any original context doc: live revenue charts on the admin dashboard, an "Upgrade to Premium" community flow, a full support-ticketing system, mentor ratings/feedback forms, course categories/tags, announcements distinct from notifications, and social login buttons.
- `build-plan.md` rewritten from 12 to 17 phases (+1 deferred: social/OAuth login) to incorporate everything the mockups revealed.

### Changed
- Renamed `Batch` → `Cohort` everywhere — schema (model, enum, every FK field), all 9 context docs, `ui-registry.md`'s component entries — since every mockup says "Cohort," never "Batch."
- Confirmed: payments are modeled (pricing fields, a future Plan/Subscription/Payment shape) but the actual charge is stubbed, no real gateway yet; chat will be DB-backed + polling, not websockets, when it's built.

---

## [0.2.0] - 2026-06-24

### Added
- Full Prisma 7 domain schema: `Role`/`Permission`/`RolePermission` (dynamic RBAC — system roles plus admin-created custom roles), `User`, `Session`, `Course`/`Module`/`Lesson`, `Cohort`/`Enrollment`, `LiveClass`/`Attendance`, `Assignment`/`Submission`, `Assessment`/`Question`/`QuestionOption`/`AssessmentAttempt`/`AttemptAnswer`/`AttemptAnswerOption`, `Progress`/`LeaderboardEntry`, `Certificate`, `Notification`, `Post`/`Comment`/`Reaction` (community, scoped per cohort).
- Initial migration applied against a local PostgreSQL instance.

### Fixed
- Prisma 7 is a major jump from older conventions: the datasource URL now lives in `prisma.config.ts`, not `schema.prisma`; `.env` isn't auto-loaded (needs `import "dotenv/config"` in `prisma.config.ts`); the client generator now outputs TypeScript source to `app/generated/prisma` instead of installing into `node_modules/@prisma/client`.

---

## [0.1.0] - 2026-06-24

### Added
- Tailwind v4 design tokens from `context/ui-tokens.md` wired into `app/globals.css` via the `@theme` directive, replacing the default `create-next-app` template.
- Inter font loaded via `next/font/google` in `app/layout.tsx`, replacing Geist — required by `ui-tokens.md`'s "Inter only, never system fallback" rule.

---

## Known placeholders (not yet real)

- **OTP delivery**: every signup/password-reset code is a fixed value (`OTP_STATIC_CODE`, default `123456`) — no email/SMS provider is wired. Must be replaced with real delivery + random codes before any non-local exposure.
- **Payments**: schema-only: course pricing and Premium-tier gating exist as a plan, but there's no real payment gateway integration yet.
- **Favicon dark-mode swap**: the favicon is static; it doesn't follow the in-app theme toggle (only one icon asset exists, no transparent dark variant).
- **Database/Redis**: both point at local instances (`localhost`) for active development, not cloud-hosted ones yet.
- **Social/OAuth login**: buttons removed from Login; deferred, not scheduled into a phase yet.
- **Generic `/dashboard`**: doesn't exist. Only `/admin/dashboard` is built; Student/Mentor/Cohort Manager logins redirect to a 404 today.
- **Admin dashboard data**: every number/chart on `/admin/dashboard` is mock/static — there's no analytics aggregation API behind it yet.
- **Admin sidebar links**: most items (Users, Courses, Cohorts, Enrollments, Reports, Announcements, Categories, Tags, Certificates, Settings) point at routes that don't exist yet — only Dashboard is real.

See `context/build-plan.md` for the full 17-phase roadmap and `context/progress-tracker.md` for granular, in-progress notes.
