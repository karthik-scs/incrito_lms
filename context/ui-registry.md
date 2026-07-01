# UI Registry

Living document. Updated after every component is built.

Before creating any component:

1. Check this registry first
2. Reuse existing patterns
3. Follow ui-rules.md and ui-tokens.md
4. Register every new component immediately after completion

---

## Auth Pages

All five auth pages share `components/layout/AuthLayout.tsx` (gradient left panel + top-right `ThemeToggle` + centered form area) rather than duplicating that shell five times. Verify OTP and Reset Password are flow-gated via `lib/authFlowGuard.ts` — see their entries below.

### Login

**Path:** `app/(auth)/login/page.tsx`

Status: Built. Email/password with icon-prefixed inputs, password show/hide toggle, inline validation. Posts to `/api/auth/login`. If the account isn't email-verified yet, marks the verify-otp flow entry and redirects. When the server returns `{ mfaRequired: true, mfaToken }` (user has MFA enabled), renders a `MfaStep` — 6 separate digit cells, paste-to-fill, auto-advance on input, clears+re-focuses on wrong code — that calls `POST /api/auth/mfa/challenge`; on success sets the access token and redirects normally. On success without MFA redirects to `/admin/dashboard` (Admin) or `/dashboard` (other roles).

### Signup

**Path:** `app/(auth)/signup/page.tsx`

Status: Built (Phase 1), matches `context/design/Signup page.png` — uses `AuthLayout`'s `showIllustration` to show the cube graphic (`app/assets/login_page_icon.png`) that mockup has and the others don't. Fields: full name (split into firstName/lastName client-side before posting — schema keeps both, UI shows one field per the mockup), email, phone (`+91` prefix + 10-digit input, sent as `mobileNumber`), password, confirm password — all inline-validated (password rules mirror the server's `passwordSchema`). Posts to `/api/auth/signup`, which no longer auto-logs-in; marks the verify-otp flow entry and redirects to `/verify-otp?email=...`. Reads `?notice=` and shows an `InlineAlert` badge if redirected back here by the flow guard.

### Verify OTP

**Path:** `app/(auth)/verify-otp/page.tsx`

Status: Built (Phase 1), matches `context/design/OTP verify Page.png`. **Flow-gated**: on mount, checks `hasValidFlowEntry("verify-otp", email)` (set by Login or Signup right before redirecting here) — if absent (i.e. someone navigated here directly by URL), redirects to `/signup?notice=verify-otp-direct-access` instead of rendering the form. Reads `email` from the query string, 6-box `OtpInput`, 45s resend cooldown with live countdown. Posts to `/api/auth/verify-email`; on success consumes the flow entry, the server issues tokens (auto-login), and the page redirects to `/dashboard`. "Resend OTP" posts to `/api/auth/resend-verification`.

### Forgot Password

**Path:** `app/(auth)/forgot-password/page.tsx`

Status: Built (Phase 1), matches `context/design/forget password page.png` (copy adjusted from "send a reset link" to "send a verification code" since the actual flow is OTP-based, per the explicit workflow, not an email link). Posts to `/api/auth/request-password-reset`, marks the reset-password flow entry, and redirects to `/reset-password?email=...` regardless of whether the account exists (doesn't reveal account existence). Reads `?notice=` and shows an `InlineAlert` badge if redirected back here by the flow guard.

### Reset Password

**Path:** `app/(auth)/reset-password/page.tsx`

Status: Built (Phase 1), restructured into two steps per follow-up feedback (the static `context/design/reset password page.png` mockup doesn't show an OTP field, but the explicit workflow requires verifying the code before resetting): (1) 6-box `OtpInput` + a standalone "Verify OTP" button posting to the new non-consuming `/api/auth/check-password-reset-code`; a 60s "Resend OTP" cooldown (posts to `/api/auth/request-password-reset` again) sits alongside it. (2) Only once verified do the New Password/Confirm Password fields (with live `PasswordStrengthHints`) and the final "Reset Password" button appear, which posts the email/code/password together to `/api/auth/reset-password` (the actual one-time-use consumption happens here, server-side, regardless of what the client believes — the "Verify OTP" step is a UX convenience, not the security boundary). **Flow-gated** the same way as Verify OTP: redirects to `/forgot-password?notice=reset-password-direct-access` if there's no valid `hasValidFlowEntry("reset-password", email)`.

---

## Sidebar (updated)

**Path:** `components/layout/Sidebar.tsx`

Student nav trimmed to exactly Dashboard/My Courses/Calendar/Community — Live Classes/Assignments/Assessments/Leaderboard/Progress/Certificates were dropped since they're reached through course tabs, not top-level destinations. "Support" now renders as the last item inside the same `<nav>` block as the role's own items (directly below Community for Student), not in its own section further down — moved there from between the nav list and the "Explore Programs" promo card. The "Explore Programs" promo card (Student role only, hidden when collapsed) still renders below the whole nav block, above the avatar/logout footer. Mentor/Cohort Manager kept their existing items and gained a "Chat" link; Admin unchanged structurally.

## Cross-Role Topbar Additions

**Paths:** `components/dashboard/NotificationDropdown.tsx`, `components/dashboard/DashboardTopbar.tsx`

`NotificationDropdown` replaces the topbar bell's previous do-nothing button — polls `GET /api/notifications` every 30s, shows an unread-count badge, and renders each notification with a contextual CTA derived from `metadata.action` (`join`/`watch` deep-link to the lesson, `view_certificate`/`view_discussion` deep-link to the right course tab) plus "Mark as read" and a dismiss ✕ — all inline in the dropdown, no separate notifications page, per explicit instruction. The topbar's Chat icon now links to `/chat`; Settings links to `/admin/settings` (Admin) or `/settings` (other roles, not yet built — pre-existing gap, unchanged by this round). Since `DashboardTopbar` is rendered once inside the shared `AdminLayout`, both updates apply to every role automatically.

**"Mark as read" now actually removes the notification from the dropdown** (`handleMarkRead`/`handleMarkAllRead` both `.filter()`/clear the local list, not just toggle an `isRead` flag in place) — it used to just re-style the entry (drop the unread highlight) while leaving it sitting in the feed, which read as broken since nothing visibly happened. The read state still persists server-side via the same `PATCH /api/notifications/:id/read` call; only the *active dropdown's* contents change, not the notification's existence in the database.

## Student Pages

First student-facing UI in the project — everything before this was Admin or Auth. Originally built frontend-only against `lib/mock/courseRoadmap.ts`/`lib/mock/myCourses.ts`; **all pages below are now wired to real backend endpoints** — the mock files are superseded (left in place, unused, rather than deleted). All reuse `AdminLayout` (genuinely role-generic despite the name — `Sidebar` already branches its nav per role).

### Dashboard

**Path:** `app/dashboard/page.tsx`

Status: Built, real data, no role left on a 404. `Sidebar` has linked every non-Admin role to `/dashboard` since it was first built, but the route itself didn't exist until now — only `/admin/dashboard` did. Fetches once from `GET /api/me/dashboard` (self-service, role-detected server-side off the JWT, no separate per-role endpoint to call) and renders one of three view components based on the response's `role` field: `StudentDashboardView` (continue-learning list, upcoming live classes, recent notifications, stat cards for enrolled/completed/upcoming/certificates), `MentorDashboardView` (their cohorts via `CohortMentor` with the same avg-completion metric the admin Cohort Management page shows, live classes they're hosting, submissions awaiting grading with a "Grade" link into `/admin/courses/{slug}` — a Mentor's `course:write` permission already lets them open that page), `CohortManagerDashboardView` (their cohorts via `CohortManagerAssignment`, at-risk/avg-completion stats, upcoming live classes, recent enrollments, a "Manage" link into `/admin/cohorts/{id}`). All three reuse the admin dashboard's existing `StatCard`/`DashboardCard`/`WelcomeBanner` — no new primitives invented for this.

### Calendar

**Path:** `app/calendar/page.tsx`

Status: Built, loosely follows `context/design/clander.png` adapted to real data, reading `GET /api/me/calendar` which aggregates `LiveClass` events across every cohort the user belongs to — explicitly not the originally-envisioned union with `MentorBooking`/`Event`/`Assignment.dueDate`, since only `LiveClass` has real data and models behind it. Now has **Day/Week/Month view switcher** (pill buttons) instead of week-only: a single `anchorDate` drives all three, with one generously-windowed fetch (±35 days around the anchor) sliced client-side per view rather than three separate API calls. Week is the original 7-column grid (events stacked per day, not pixel-positioned by time). Month is a real 6×7 grid padded to start-of-week, up to 2 event pills per day plus a "+N more" overflow label. Day is a chronological list for just that one date. Cohort/Mentor filter `Select`s derive their options from the fetched events themselves (no separate lookup endpoint). Today's Schedule and Upcoming-This-Week counts are real; Quick Actions' "Export Calendar"/"Sync with Google Calendar" are disabled with an explanatory `Tooltip` rather than faked, since neither integration exists.

### Community

**Path:** `app/community/page.tsx`

Status: Built — now two sections instead of one. "Premium Communities" (`GET /api/communities` — every admin-created community the current user is a member of; Admin sees all of them, not just ones they've been added to) renders first as a card grid linking into `/community/[id]`; "Course Discussions" below it lists every cohort the user belongs to, each card linking into that course's Discussion tab. A user who is in neither sees an empty state instead of either section.

**Role-aware data source for "Course Discussions"** (fixed after a real bug report — was always empty for Mentor/Cohort Manager): Students fetch `GET /api/me/courses` (`Enrollment`-based); Mentor/Cohort Manager instead fetch `GET /api/cohorts` and filter client-side to cohorts where they appear in `mentors`/`managers` — they have no `Enrollment` row at all, so the Student endpoint always returned empty for them. The effect waits for `useAuth()`'s `loading` to resolve before picking which endpoint to call, since branching on `user.role` before auth resolves would silently fall through to the Student path on first render.

### Premium Community (detail/feed)

**Path:** `app/community/[id]/page.tsx`

Status: Built. The actual community feed — header (name, description, member count), a post composer (title + `MentionInput` body, paperclip file-attach reusing `/api/uploads/discussion-attachment`, a mic button recording via the browser's native `MediaRecorder` and uploading to `/api/uploads/voice-note` on stop, same pattern Chat already used), then a list of `PostCard`s. Each post shows the author, content (with `@[userId:Name]` mentions rendered as styled accent-colored spans via `renderMentionText`), any attachment (image/video/audio inline, anything else as a "View attachment" link), an emoji `ReactionBar`, and an always-expanded comment thread. Comments support one level of replies, inline edit (swaps to a `MentionInput` in place, "Save"/"Cancel") and delete (own comments only — checked both client-side, by only showing the icons when `comment.author.id === userId`, and server-side), and their own emoji reactions. Membership is enforced server-side on every read/write (`community.service.ts#assertMemberOrAdmin`) — a non-member hitting this URL directly gets a 403 from the API, not just a hidden UI.

**Polls and Events** — "New Poll"/"New Event" buttons in the header, visible client-side only when `user.role` is Admin/Mentor/Cohort Manager (`CREATOR_ROLES`), with the real gate enforced server-side regardless. Poll creation: a question plus 2–8 dynamic option rows (add/remove). `PollCard` renders each option as a bar that fills by vote percentage, the user's own pick highlighted in accent, vote count and total shown — clicking any option calls `POST /api/communities/polls/:pollId/vote` (one vote per user per poll, re-voting changes your pick rather than adding a second). Event creation: title, required date/time, optional location and description. `EventCard` shows a month/day date-badge, formatted time, location pin, description, and creator. Both card types sit above the regular post feed in a 2-column grid, and both support delete (creator or Admin, mirroring the post/comment delete pattern already established).

### Community management (admin)

**Path:** `app/admin/community/page.tsx`

Status: Built. Card grid of every community (admin sees all, not membership-filtered) with member/post counts; create/edit modal (name, description, cover image); a "Members" modal per community listing current members with a remove button and a `Select` to add any platform user (any role — student, mentor, cohort manager) who isn't already a member. Deleting a community cascades its posts/comments/reactions (`onDelete: Cascade` on `Post.communityId`). New Admin sidebar item "Community" (`components/layout/Sidebar.tsx`), grouped with the other course/cohort/enrollment management items.

Each card has a prominent "Open Community" button (`Link` to `/community/[id]`, the actual feed page) — added after discovering the backend already let Admin post/comment/react in any community (verified via curl) but there was simply no UI path from this management page into the feed itself, and Admin's sidebar only points here, never at the general `/community` page non-admins use to browse in. Without this button, Admin had no click-through way to actually open and discuss in a community at all.

### Chat

**Path:** `app/chat/page.tsx`

Status: **1:1 direct messages**, redesigned to a 3-column-inspired layout (conversation list | active thread) per `context/design/chat page.png`, then refined after live user testing — the right-hand "About" panel from the first pass was removed entirely per follow-up feedback. Real role-based permission matrix unchanged; the old "Cohort Group" chat concept is still removed (1:1 only).

**Left column** — a compact header ("Chat" + a "+" new-chat button), filter pills (All / Unread only — the earlier "Mentor (Premium)" pill was removed as redundant), a live conversation search box (client-side filter on the other person's name), then the conversation list split into **Pinned**/**Recent** sections (Pinned only renders when at least one conversation is pinned). Each row shows a pin icon on hover (`PATCH /api/chat/:id/pin`, optimistic local update, per-user, backed by `ConversationParticipant.pinned`) and a gold "Premium" `Badge` with a crown **only when that specific Mentor↔Student pairing is currently locked** (`!conversation.canMessage`) — once a student actually holds Intensive Pro, the conversation just looks like any other thread; the badge is reserved for flagging "this needs Intensive Pro to continue," not as a permanent "you have premium" tag.

**`canMessage`** (new field on every conversation from `GET /api/chat/conversations`) is a *live* re-check of the exact same permission matrix `sendMessage` enforces (`chat.service.ts#canDirectMessage`) — not a narrower plan-only check, so it also self-corrects if e.g. a Cohort Manager is reassigned off a shared cohort, not just Mentor-plan downgrades. `sendMessage` independently re-checks this server-side too (previously only verified conversation membership), so a downgraded student can't bypass the disabled composer by calling the API directly — conversation history is preserved, only new messages are blocked.

**Middle column (active thread) header** — *only* on a Mentor↔Student conversation, solid filled-accent **Video**/**Phone** call icon buttons (20px, enlarged from an earlier 16px outline-icon pass), greyed out and disabled via `canMessage` exactly where the Premium badge appears. These are intentionally inert placeholders for now — clicking the enabled state shows "launching soon" — since the actual WebRTC 1:1 calling feature (with admin-configurable per-plan call limits) is a separate, not-yet-built piece of work. They never render on non-Mentor↔Student conversations. When `canMessage` is false for a Mentor↔Student thread, the entire composer (text input, attach, mic, send) is disabled with explanatory copy ("Messaging your mentor needs an Intensive Pro plan…" / "This student's plan no longer includes mentor messaging") — deliberately scoped to that specific pairing only (`composerLocked = isPremiumPairing && !canMessage`), not any `canMessage:false` case, so an unrelated stale-data edge case can't block typing on a conversation type that was never meant to lock.

**Message reactions**: hovering a message bubble reveals a small smiley button opening the same `EmojiPicker` (`components/community/EmojiPicker.tsx`) used by Community posts/comments; selecting an emoji calls `POST /api/chat/messages/:messageId/reactions` (toggle semantics, mirroring `discussion.service.ts#setReaction`'s exact pattern) and renders a small pill below the bubble per distinct emoji with its count. Backed by reusing the existing `Reaction` model (nullable-FK'd to `ChatMessage` via a `messageId` column) rather than a parallel reactions table.

**"New Chat"** modal, contact directory, locked-contact tooltip behavior, and the composer's attachment/voice-note machinery are otherwise unchanged from the pre-redesign version. **Not built**: the actual 1:1 WebRTC audio/video calling feature itself (schema, signaling, admin-configurable call limits) — only the header's entry-point buttons exist so far, deliberately inert. **Removed** (was in the first redesign pass, dropped after feedback): the right-hand "About" panel and its header Info toggle.

### Support

**Path:** `app/support/page.tsx`

Status: Built — contact channels (email/phone/community) + a short static FAQ. Intentionally a lightweight placeholder, not a ticketing system — no `SupportTicket` model exists yet.

### My Cohorts (Mentor / Cohort Manager)

**Path:** `app/cohorts/page.tsx`

Status: Built — fixes a real 404 (`Sidebar.tsx`'s Mentor/Cohort Manager "My Cohorts" nav item pointed at `/cohorts`, which never had a page). Read-only card grid (no create/edit — that stays admin-only at `/admin/cohorts`), fetching the existing `GET /api/cohorts` and filtering client-side to cohorts where the current user appears in that cohort's `mentors`/`managers` array. Each card links into the existing `/admin/cohorts/[id]` detail page rather than duplicating a second cohort-detail view — that page already works for these roles for *viewing* (both hold `cohort:read`/`enrollment:read`), though its "Add Mentor"/"Add Manager" dropdowns render empty for non-Admins since populating them calls `GET /api/users` (`user:read`, Admin-only) — a known, not-yet-fixed degradation, not a hard error.

### Sessions (Mentor / Cohort Manager)

**Path:** `app/sessions/page.tsx`

Status: Built — fixes the same class of 404 as My Cohorts. Upcoming/Past tabs over the *existing* `GET /api/me/calendar` aggregation (no new backend — that endpoint already returns every live class across a user's mentored/managed/enrolled cohorts, originally built for the `/calendar` grid view). A "Manage" link to the course curriculum page (`/admin/courses/[slug]`) is shown only for Mentors, since they hold `course:write` and Cohort Managers don't (the link would just 403 for them).

### Settings (Mentor / Cohort Manager)

**Path:** `app/settings/page.tsx`

Status: Built. Profile/Notifications/Security vertical tabs. `PersonalSecurityTab` (`components/settings/PersonalSecurityTab.tsx`) contains three cards: Change Password, Two-Factor Authentication (MFA), and Active Sessions. `SecuritySettingsTab` (admin only) composes `PersonalSecurityTab` + the platform-wide Security Policy section — no duplicated logic.

**Two-Factor Authentication card** (MFA): shows `Badge` (Enabled/Disabled) from `user.mfaEnabled` (read from `useAuth()`). Setup flow: "Set Up MFA" → `POST /api/auth/mfa/setup` → show QR (`data:` URL via `next/image`) + copyable manual key → enter first TOTP code via `TotpInput` → `POST /api/auth/mfa/activate` → badge flips to Enabled, `refetch()` called. Disable flow: "Disable two-factor authentication" link → enter current TOTP code → `DELETE /api/auth/mfa` → badge flips to Disabled. `TotpInput`: 6 individual `<input>` cells with auto-advance, backspace-to-previous, and paste-6-digits support (reusable, also used in the login MFA step).

**Not yet built** (scoped out pending check-in): Announcements (`/announcements`) and Analytics (`/analytics`) — both removed from the Mentor/Cohort Manager sidebar per explicit follow-up ("neither for now") rather than left 404ing.

A fourth tab, **Live Class Accounts**, was added in a later round — see its own entry below.

### Live Class Accounts (Settings tab)

**Path:** `components/settings/LiveAccountsTab.tsx`, mounted as a tab on `app/settings/page.tsx`

Status: Built. Lets any Mentor/Cohort Manager (and Admin, if added to `/admin/settings` later — not done this round, scoped to `/settings` per the explicit request) connect their *own* Zoom and/or Zoho Meeting account, used to schedule live classes under their own license instead of the platform's shared admin-managed Zoom pool. Two cards: **Zoom** — manual credential entry (Account ID/Client ID/Client Secret/Webhook Secret Token, same shape as the admin `ZoomAccountsTab`) via `POST /api/live-accounts/zoom`; **Zoho Meeting** — a single "Connect with Zoho" button starting the standard OAuth authorization-code flow (`GET /api/live-accounts/zoho/authorize` → redirect to Zoho's consent screen → Zoho redirects back to a backend callback with no Authorization header, recovered via a Redis-backed one-time `state` token → redirects the browser back here with `?zoho=success|error`, read via `useSearchParams` on mount). Both providers, once connected, become an option in the admin curriculum page's "Schedule under" selector (see Admin Courses Curriculum below) — but only when the logged-in user is hosting the session themselves, never for someone scheduling on another person's behalf (a deliberate privacy boundary: nobody can browse another user's connected personal accounts).

### Certificate Verification (public)

**Path:** `app/certificates/verify/[token]/page.tsx`

Status: Built — no authentication required, matches the backend's public `GET /api/certificates/verify/:token`. Shows the certifying student's name, course, certificate number, and issue date if the token resolves, or a clear "not found" state otherwise. This is what the Certificate tab's "Share Certificate" button actually links to.

### My Courses

**Path:** `app/courses/page.tsx`

Status: Built (real data), matches `context/design/my course page.png`. Reads `GET /api/me/courses` (one row per `Enrollment`, with computed progress and next-incomplete-lesson). Active/Completed tabs filter by `isComplete`; sort `Select` supports progress/title (client-side, no server sort param); grid/list view toggle. `MyCourseCard` shows the real cohort name as a `Badge` on the banner (the explicitly-requested addition), real progress bar, and Roadmap/Resume buttons. The mockup's "Up Next" and "Recommended for You" sidebar widgets were dropped rather than faked — there's no recommendation engine and no real "next thing across all your courses" concept yet; "Your Progress" stayed, now computed from real enrollment data.

### Course Tabs (shared)

**Path:** `components/courses/CourseTabs.tsx`

Purpose: Real navigation between a course's 5 student-facing views (Overview/Roadmap/Discussion/Leaderboard/Certificate) — replaced the original mock Roadmap page's inert decorative tab bar. Every tab is a real `Link` to a real page; Certificate shows a `Lock` icon whenever the caller passes `certificateLocked` (every page computes this fresh from its own `completionPercentage`, not a shared/cached value).

### Course Overview

**Path:** `app/courses/[slug]/overview/page.tsx`

Status: Built (real data), loosely follows `context/design/overview course page.png` adapted to data that actually exists. Instructor/enrolled-date/total-duration are real (`course.mentor`, `enrollment.enrolledAt`, summed lesson durations). Course Analytics: a real progress ring, the cohort's real top-3 leaderboard (linking to the full Leaderboard tab), and a quiz-attempt count standing in for the mockup's "Attendance" card (no `Attendance` data is wired into any UI yet, even though the model exists). Recent Activity is a real merged lesson-completion/quiz-attempt feed (`GET /api/me/courses/:courseId/activity`). "Upcoming Deadlines" became "Upcoming Live Sessions" — there's no due-date concept in this round's data, but there is a real schedule for upcoming live lessons.

### Course Roadmap

**Path:** `app/courses/[slug]/roadmap/page.tsx`

Status: Built (real data), matches `context/design/roadmap page.png`. Reads `GET /api/me/courses/:slug/roadmap` (requires a real enrollment — 403s otherwise, since this is explicitly "my view of a course I'm taking"). Body is a list of `ModuleAccordion`s (first two expanded by default).

### ModuleAccordion

**Path:** `components/courses/ModuleAccordion.tsx`

Status: Rewritten against real types (`RoadmapModule`/`RoadmapLesson`/`LessonLiveClass`, no longer importing from the mock module). The mock version's externally-computed "next live lesson" concept is gone — the prominent "Live" button now just checks `lesson.liveClass.isLiveNow` directly (a value the backend computes fresh on every request: true from 10 minutes before `startTime` through `endTime`, unless cancelled/completed), which is simpler and can't drift out of sync with reality the way a separately-computed "next" id could. Recorded lessons get "Start Lesson"/"Review" once completed; live lessons get "Live" (now), "Watch Recording" (completed + recording attached), "Processing" (completed, no recording yet), or "Upcoming" + locked Watch Recording (future).

### Learn (Lesson Player)

**Path:** `app/courses/[slug]/learn/[lessonId]/page.tsx`

Status: Built (real data), matches `context/design/learn page.png` for the recorded-lesson state, plus a real live-session state for `LIVE`-type lessons. Reuses the same roadmap endpoint as the Roadmap page (one source of truth for "what does this student's view of this course look like") to find the lesson and compute Previous/Next across the whole course. Has a real "Mark as Complete" button (`POST /api/lessons/:id/complete`, disabled for `LIVE` lessons until their session is `COMPLETED`) instead of the old mock-only flow. The mockup's "What You'll Learn" checklist was dropped — no such field exists on `Lesson`; "About This Lesson" instead falls back to the course's own description.

### LessonContent

**Path:** `components/lessons/LessonContent.tsx`

Purpose: Replaces the old decorative `LessonPlayer`/`LiveSessionPanel` (both deleted) with real content rendering per lesson `type`. For completed `LIVE` lessons: the roadmap response never sends a raw `recordingUrl`, only a `hasRecording` boolean (`liveClass.hasRecording`) — when true, renders `ProtectedVideoPlayer` (see below) pointed at `/api/lessons/:id/live-class/recording-url`, never a plain `<video src>`. For `VIDEO` lessons: `contentUrl` is checked against `lib/youtube.ts#extractYouTubeId` first — a YouTube link renders the custom `YouTubePlayer` (see below), since YouTube doesn't serve raw media files at its `watch`/`youtu.be` URLs; an uploaded-through-the-system file (recognized by the stored URL containing `/api/files/`) renders `ProtectedVideoPlayer` against `/api/lessons/:id/content-url`; any other external URL (the only path the admin curriculum UI actually supports for regular video content today — there's no upload control for it, only a paste-a-URL field) plays directly via a plain `<video src>`, since there's nothing of ours to protect on a third-party host. A real `<iframe>` for `PDF`; the lesson's actual `content` text for `TEXT`; and for `LIVE` lessons not yet completed, either a countdown/scheduled card or — once `liveClass.isLiveNow` — `ZoomMeetingEmbed` (see below) in place of the old plain "Join Live Class" button.

### ProtectedVideoPlayer

**Path:** `components/lessons/ProtectedVideoPlayer.tsx`

Purpose: Deterrence-level content protection for any video served from this app's own storage (live-class recordings, uploaded lesson content) — explicitly **not** real DRM (no Widevine/FairPlay encryption); no web technology can fully stop someone photographing their screen or using OS-level capture, and that's stated plainly in the component's own comment rather than overclaimed. Takes a `fetchUrl` prop (one of the permission-checked signed-URL endpoints), fetches a signed S3 URL on mount and re-fetches it every 8 minutes (signed URLs default to a ~10-minute TTL — `S3_SIGNED_URL_TTL_SECONDS`), so long viewing sessions don't hit an expired link mid-playback. The `<video>` itself sets `controlsList="nodownload noremoteplayback"` and `disablePictureInPicture`, blocks the context menu and drag, and a `pointer-events-none` watermark (`{firstName} {lastName} · {email}`, from `useAuth()`) repositions to a new random spot every 15 seconds over the player — not bulletproof, but enough that a screen-recorded leak is traceable back to who watched it. Renders its own loading/error states (a permission/expiry rejection from the backend shows as plain text, not a broken player).

### ZoomMeetingEmbed

**Path:** `components/lessons/ZoomMeetingEmbed.tsx`

Purpose: Real in-app Zoom joining via `@zoom/meetingsdk`'s Component View, not just opening a join link in a new tab. On mount, calls `GET /api/lessons/:id/zoom-signature`; if the lesson's `LiveClass` was scheduled under a `ZoomAccount` that has a Meeting SDK key/secret configured (Settings → Live Class API — a *different* Zoom app type from the Server-to-Server OAuth credentials that schedule the meeting), the response includes a real signature and "Join in app" loads `ZoomMtgEmbedded.createClient().init()/.join()` into a `div` right inside the lesson content area. If no Meeting SDK credentials are configured for that account, the endpoint returns `{ configured: false }` and this component falls back to the previous behavior — a "Join Live Class" button that opens `joinUrl` in a new tab — rather than failing or faking an embed. (`@zoom/meetingsdk` needed `--legacy-peer-deps` to install over React 19's peer-dep mismatch with the SDK's React 18 expectation, and its bundle's two referenced packages — `jszip`, real, installed normally; `@zoom/download-manager`, not a published package, only backs an unused in-meeting file-download feature — are handled via a one-line local stub aliased in `next.config.ts`'s `turbopack.resolveAlias`.)

### YouTubePlayer

**Path:** `components/lessons/YouTubePlayer.tsx`

Purpose: Custom-controlled YouTube playback with zero YouTube branding visible at any point — not just suppressed during playback, and not just before the first play. Three layers, because each addresses a different category of YouTube UI: (1) `controls: 0` + `modestbranding`/`rel`/`fs`/`iv_load_policy`/`cc_load_policy` turn off YouTube's bottom bar, end-screen captions, and annotations *during playback*. (2) The iframe is rendered inside an `overflow-hidden` crop container and scaled to 118% of the visible box (`top/left: -9%`, `width/height: 118%`), pushing whatever YouTube still draws at the very edges of the frame (title/channel-name bar, share icon, end-of-video suggestions grid) outside the visible crop area — the parts `controls: 0` alone can't remove. (3) **The branded idle card**: YouTube renders a title/channel-name/giant-red-play-button card any time the player isn't actively in the `PLAYING` state — this isn't limited to "before the first play"; it reappears on every pause and at end-of-video too, and no `playerVars` flag touches it. The fix is keyed off the live `playing` boolean, not a one-time "has it started" flag: the iframe stays `opacity-0` (mounted so the API can keep controlling it, just never visually shown) whenever `playing` is false — covering pre-first-play, every pause, buffering, and ended alike — and this app shows its own cover in its place: the lesson's `thumbnailUrl` (passed in as `posterUrl`) as a background image when set, a plain dark fill otherwise, plus this app's own accent-colored play button and the lesson title. The trade-off: a paused video shows this app's static cover rather than a frozen last frame (a cross-origin iframe's content can't be captured for a real freeze-frame), which is the accepted cost of fully suppressing YouTube's branding. The iframe is also `pointer-events-none` throughout, so mouse input never reaches YouTube's page at all; a transparent full-cover button sits on top so every click lands on this app's own controls.

Controls, all driven through real IFrame API calls (not cosmetic): play/pause, ±30s skip (`RotateCcw`/`RotateCw`, calls `seekTo(currentTime ± 30)`), a seek bar (polls `getCurrentTime()` every 500ms while playing, paused while the user is actively dragging it), a hover-expanding volume slider (`setVolume`) alongside the mute toggle, a playback-speed menu (`setPlaybackRate`, 0.5×–2×), and fullscreen (`containerRef.requestFullscreen()`).

### LessonSidebar

**Path:** `components/lessons/LessonSidebar.tsx`

Status: Three real tabs — Quiz (`GET /api/assessments?lessonId=`/`?moduleId=`, only `PUBLISHED` ones, per-assessment best score from `GET /api/assessments/:id/attempts/me`, "Start"/"Retake" opens `QuizModal`), **Assignments** (`GET /api/assignments?lessonId=`/`?moduleId=`, each row's own-submission status via `GET /api/assignments/:id/submissions/me` — Not submitted/Submitted/Graded with the awarded marks — "Submit"/"View" opens `AssignmentModal`, which shows the mentor's feedback inline once graded and supports resubmission), and Resources (the lesson's real `resources[]`, each row opens `ResourceViewer` — no download link is rendered, see that component's entry below).

Each quiz row also shows "Attempt X of Y" (`attempts.length` vs. `assessment.maxAttempts`) and disables its button to "No attempts left" once exhausted, instead of opening `QuizModal` only to have the start-attempt call fail with no context — the limit itself was already enforced server-side, this just surfaces it before the student clicks.

### AssignmentModal

**Path:** `components/lessons/AssignmentModal.tsx`

Purpose: The student's submit/view flow for one assignment. On open, fetches the student's own submission (`GET /api/assignments/:id/submissions/me`, null means "not submitted yet") and shows either a submission form (textarea for text content, a URL field for a file link — consistent with every other "upload" in this app actually being a pasted URL, since there's no real file-storage pipeline) or, once a submission exists, a read-only view of what was submitted. Once the mentor grades it (`status: "GRADED"`), the marks (`X/maxMarks`) and the mentor's written feedback render directly in this same panel — exactly the "feedback will show in that assignment section itself" behavior requested — with a "Resubmit" action that reopens the form (`POST` again flips status to `RESUBMITTED` server-side).

### ResourceViewer

**Path:** `components/lessons/ResourceViewer.tsx`

Purpose: Replaces the old `<a href download>` resource link with an in-app-only viewer, opened from a per-resource "view" button in `LessonSidebar`'s Resources tab. Renders by `fileType`: `IMAGE` as a plain `<img>`; `VIDEO` as a native `<video controlsList="nodownload">` (suppresses Chrome's built-in download icon in the video control bar — the one real, working download-suppression available without building a fully custom video player, unlike the YouTube case above which needs the IFrame API); `PDF`/`DOCX`/`EXCEL` inside a Google Docs Viewer iframe (`docs.google.com/viewer?embedded=true`), which renders the file without exposing a download link of its own. Honest limitation: resources are plain external URLs with no real file-storage/proxy layer behind them, so a determined user can still reach the underlying file outside this viewer — what's guaranteed is that this app itself never renders a "Download" affordance, only "view."

### QuizModal

**Path:** `components/lessons/QuizModal.tsx`

Purpose: The actual take-a-quiz flow — starts an attempt on open, renders every question with radio (`SINGLE_CHOICE`/`TRUE_FALSE`) or checkbox (`MULTIPLE_CHOICE`) inputs, submits all answers at once to the real grading endpoint, and shows the resulting score against the assessment's `passingScore`. No timer UI yet despite `timeLimitMinutes` existing on the model — first-pass scope was correctness of grading, not enforcement of the time limit.

### Course Discussion

**Path:** `app/courses/[slug]/discussion/page.tsx`

Status: Redesigned to match `context/design/cohort discusstion page.png`, which shows a single flat comment feed per cohort — not a list of titled posts. Rather than force a "create post" step the mockup doesn't have, the page lazily auto-creates one "General Discussion" `Post` per cohort behind the scenes (`ensureDiscussionPost` — checks for an existing post first, creates one only if missing) and treats its top-level `Comment`s as the visible feed items: a comment composer at the top (the user's own avatar + a `MentionInput`, posts on submit), heart-style reactions per comment (now `POST /api/discussions/comments/:id/react` with `{ emoji: "❤️" }` — the heart button is just a fixed-emoji shortcut over the same emoji-reaction system the premium community uses, not a separate mechanism), inline reply boxes (one level of nesting via `Comment.parentCommentId`), collapsible "X replies" toggles, and a Most Recent/Most Liked sort (client-side, re-sorting the already-fetched comment list — no extra request). Real cohort-membership enforcement server-side (`discussion.service.ts#assertCohortAccess`: a non-member gets a 403 from the API itself). The original per-post detail page (`[postId]/page.tsx`) was deleted — this flat single-feed model superseded it.

**Edit/delete/mentions**: every comment and reply now shows pencil/trash icons when `comment.author.id === userId` (own comments only) — edit swaps the comment body to an inline `MentionInput` ("Save"/"Cancel"), stamping `Comment.editedAt` server-side and showing "· edited" next to the timestamp; delete removes it outright (author or Admin, enforced in `discussion.service.ts#deleteComment`). Typing `@` in the composer, a reply box, or the edit box opens an autocomplete dropdown filtered against that cohort's real member list (`GET /api/chat/:cohortId/members`, reused rather than building a second members endpoint) — selecting a member inserts `@[userId:Name]` into the stored text, rendered back out as a styled accent-colored `@Name` span by `renderMentionText` (`components/community/MentionInput.tsx`, shared with the premium community feed).

**Admin/Mentor/Cohort Manager access**: this page (and every other course-tab page) previously 403'd for any non-enrolled role outright — they hit the same `getCourseRoadmapForUser` endpoint every course tab shares, which required a real `Enrollment` row (Students only). Admin gets a fallback to that course's most-recently-created cohort as viewing context (0% completion, honestly, since the admin hasn't done any lessons). Mentor/Cohort Manager get their own dedicated fallback — *not* "any cohort" the way Admin's works, but specifically a cohort they actually mentor/manage for that course (`cohort.mentors`/`cohort.managers` `some: { userId }`), since they could plausibly be attached to more than one course and "most recent" would be the wrong one. Without this fallback, a Mentor hitting their own cohort's Discussion tab got a flat 403 even though they were genuinely assigned to it — this was a real bug, not just a hypothetical gap. The discussion's own access check (`assertCohortAccess`) already let all three roles bypass — the page just never loaded far enough to reach it. Admin Courses cards gained a "Discussion" icon link (`MessageSquare`) to this page.

The composer gained a paperclip button (`POST /api/uploads/discussion-attachment`, PDF/Word/Excel/video/image, instant-upload-then-attach like the chat composer's, not a separate `FileUploadField` since this row layout is more compact) — picking a file shows a small "File attached" chip with a remove button, and a comment can now be attachment-only with no typed text (`Comment.content` became optional, `.refine()`-validated the same way as chat messages). Comments render an `<img>` for image attachments, a native `<video controls>` for video, or a "View attachment" link for anything else.

### Course Leaderboard

**Path:** `app/courses/[slug]/leaderboard/page.tsx`

Status: Built (real data) — full ranked list from `GET /api/leaderboard?cohortId=`. Top-3 ranks get the mockup's gold/silver/bronze (`#FFD700`/`#C0C0C0`/`#CD7F32` — an already-approved hardcoded-hex exception per ui-tokens.md's Leaderboard Podium Colors entry).

### Course Certificate

**Path:** `app/courses/[slug]/certificate/page.tsx`

Status: Rewritten from a single-card page to a responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) of `CertificateAllocationCard`s, one per `CourseCertificate` the course now allocates — a course can award more than one certificate (e.g. one for the whole course, plus separate milestone certificates for completing specific modules). Each card is independently Locked (shows `progressLabel`, e.g. "2/4 lessons in required modules", plus the required module names for `MODULES`-scope allocations)/Ready-to-generate (eligible, not yet issued — "Generate Certificate" button)/Unlocked (issued — real `CertificateCanvas` preview + View/Download/Share), reading `GET /api/certificates/eligibility?cohortId=` which now returns one `{ courseCertificate, eligible, progressLabel, certificate }` entry per allocation instead of a single object. An empty state ("No certificates set up for this course yet") renders if the course has zero allocations. The "Your Achievements" block and **Certificate History** table (`GET /api/certificates/me`, every certificate the user has ever earned across all courses) sit below the grid, gated on `entries.some((e) => e.certificate)`. "Share Certificate" copies a real public verification link (`/certificates/verify/[token]`) to the clipboard via `navigator.clipboard`.

Each card's certificate visual renders through `CertificateCanvas` using that *specific allocation's issued certificate's* own `template.layers` (the template it was issued under, snapshotted at issuance — see the Designer entry below) when that template has layers designed; falls back to a plain hardcoded "Certificate of Completion" card when it doesn't. "Download" rasterizes that card's own `CertificateCanvas` node via `html2canvas` + `jsPDF` (dynamically imported) and saves `{certificateNumber}.pdf`. Certificate History's "View" action opens `CertificateViewModal` (a popup) with `{ cert, entry: undefined }` — `entry` is optional there since history rows can belong to a *different* course than the one currently being viewed.

### Course Certificates (admin)

**Path:** `components/admin/CourseCertificatesPanel.tsx` (rendered inside `app/admin/courses/[slug]/page.tsx`, above the modules list)

Status: Built. Full CRUD for a course's certificate allocations — title, a `Select` of certificate design templates, an "Unlocks when…" radio (`COURSE`: whole-course 100% completion; `MODULES`: a `MultiSelect` of the course's own modules, all of which must be fully completed), issued-count and (for `MODULES` scope) the required module names shown per row, and a palette-icon "Design" link straight into that allocation's Certificate Designer. Deletion is blocked with a 409 + explanatory message ("N certificate(s) have already been issued... remove those first") if certificates already exist against that allocation, rather than silently cascading.

---

## Admin Pages

### Admin Dashboard

**Path:** `app/admin/dashboard/page.tsx`

Status: Built, every widget on real data — no mock/static numbers anywhere on this page. `WelcomeBanner` greeting from `useAuth()`, a 4-up `StatCard` row, then widget rows: User Growth (cumulative signups by month) + Enrollments Overview (donut, bucketed by real `Progress.completionPercentage`) + `QuickActions`; Top Courses by Enrollments + Recent Activity (merged enrollments/certificates/course-publishes feed) sharing one row, 1/3 + 2/3 width split; Revenue Overview + Revenue Trend (derived from `enrollment count × course.priceInSmallestUnit` for non-free courses — there's no separate Payment ledger yet, so this is computed, not transaction history). All multi-card rows use `items-stretch` + `h-full` on every `DashboardCard` so cards in the same row always match height regardless of content length. Backed by `GET /api/me/dashboard`, which now branches on `roleName === "Admin"` the same way it already branched for Mentor/Cohort Manager. `Login` redirects here instead of the generic `/dashboard` when the authenticated user's role is `"Admin"`.

Two widgets from the original mockup had no real data to back them and were dropped rather than left as fake numbers: "Users by Country" (no geo field on `User`) and the infra-style "Platform Health" checks (no real APM). Both briefly existed as honestly-computed substitutes (`Users by Role`, a percentage breakdown by role; real composite health rates like Course Publish Rate) before being removed entirely per a follow-up layout-simplification request — components deleted, not just unmounted.

### Course Settings (Category / Tags) / Certificate Templates

**Paths:** `components/settings/CourseSettingsTab.tsx` (inside `app/admin/settings/page.tsx`), `app/admin/certificates/page.tsx`

Status: Built. Category and Tags management moved out of the Admin sidebar into Settings, under a "Courses Settings" tab with Category/Tags sub-tabs sharing one `TaxonomyManager` component (identical CRUD shape, parameterized by API resource path — `/api/categories` or `/api/tags`). Auto-derives `slug` from `name` as the admin types (editable, stops auto-deriving once hand-edited), deletes via `window.confirm`. The original standalone `/admin/categories` and `/admin/tags` pages and their sidebar items were deleted, not left as redundant duplicates. Certificate Templates remains its own page (`description`/`designUrl`, plus a palette-icon "Design" link to `/admin/certificates/[id]/design`).

### Certificate Designer

**Path:** `app/admin/certificates/[id]/design/page.tsx`

Status: Built. Canvas editor for one `CertificateTemplate`'s `layers`. Toolbar is a single grouped bar ("INSERT" label + divider) with icon-led ghost buttons for Text (literal string), Image (drops an empty placeholder layer — see below), and QR Code (disabled once one already exists), then a divider and the Variable `Select` (the six supported keys — `studentName`/`courseTitle`/`cohortName`/`certificateNumber`/`issueDate`/`instructorName`). Every layer is dragged by hand-rolled mouse-event math, not a drag library: `onMouseDown` records the pointer's offset from the layer's current `x`/`y` (in percentage terms, matching `CertificateCanvas`'s coordinate system exactly), then `window`-level `mousemove`/`mouseup` listeners (not element-level, so dragging keeps tracking even past the canvas edge) update position, clamped to `[0, 98]`. Selecting a layer — click on canvas, or from the "Layers (N)" list in the sidebar — opens a properties panel scoped to that layer's type (text content or variable picker; font size/family/color/weight/align for text-like layers; width/height percentages for image/QR layers; delete). Background image upload reuses the existing `FileUploadField` + `certificateDesignUpload` category. "Save design" `PATCH`es the entire `layers` array as one document — no autosave, no per-layer endpoints. Sample sentinel data (`SAMPLE_VARIABLES` in `lib/certificateLayers.ts`) stands in for variable layers while designing, since there's no real issued certificate to pull from yet at this point.

**Add Image layer**: the `image` layer type and its properties (upload/width/height) already existed for the background-image use case; the toolbar's "Image" button now also drops a free-floating `image`-type layer anywhere on the canvas (independent of the background), rendered as a dashed-border placeholder with a generic image icon until the admin uploads a real image into it via the properties panel — an honest empty state, not a silently invisible layer.

**Visual style**: the canvas sits inside a recessed `bg-surface-secondary` "stage" with generous padding and a `shadow-md` artboard, closer to a Figma/Canva-style fixed-size canvas inside a neutral workspace than the original bare bordered box. Sidebar panels (Background/Layer properties/Layers) share a consistent header treatment (small accent icon + bottom divider); the Layers list shows a per-type icon (Type/Variable/QrCode/ImageIcon) next to each entry. All styling uses existing `ui-tokens.md` tokens — no new hardcoded colors.

### Courses

**Path:** `app/admin/courses/page.tsx`

Status: Built. Redesigned from a `DataTable` list to a card grid, explicitly modeled on the My Courses page's card style — banner (thumbnail or an icon placeholder), a click-to-publish/unpublish status `Badge` (`PATCH /api/courses/:id/status`), category, mentor, module count (`_count.modules`), tags, certificate template. The create/edit modal (unchanged) assigns `Category` (`Select`), `Tag[]` (`MultiSelect`), `CertificateTemplate` (`Select`), and `mentorId` (`Select`, options filtered to users whose `role.name === "Mentor"`), plus free/paid pricing and `unlockMode`. Each card has 2 actions: edit (pencil, opens the modal) and "Manage Curriculum" (primary button, `/admin/courses/{slug}`) — the entry point into Module/Lesson management. The earlier "view roadmap" map-icon link (→ `/courses/{slug}/roadmap`) was removed — that page is the student-only Roadmap tab, gated on a real `Enrollment` (403s otherwise), which Admin/Mentor/Cohort Manager don't have; Roadmap isn't a concept that applies to these management roles.

### Course Curriculum (Modules & Lessons)

**Path:** `app/admin/courses/[slug]/page.tsx`

Status: Built — real backend, not mock data. Fetches the course via the existing public `GET /api/courses/:slug` (now including nested `liveClass`+`resources` per lesson, and `_count.modules`). "New Module" creates a `Module` under the course (`order` auto-computed); each module card lists its lessons with a type icon and lets the admin add a lesson, or edit/delete any module or lesson.

Each module is now a real collapsible accordion (chevron toggle, defaults open, independent per module) and both modules (within the course) and lessons (within a module) are drag-and-drop reorderable via native HTML5 DnD (`draggable`/`onDragStart`/`onDragOver`/`onDrop` — no drag library added) with a `GripVertical` handle. Dropping optimistically reorders the local list immediately, then fires `PATCH /api/modules/reorder` or `PATCH /api/lessons/reorder` (`{ courseId/moduleId, orderedIds }`) in the background; a failed request reloads from the server instead of leaving the UI ahead of the database. Both endpoints reorder collision-safely server-side (a two-pass negative-offset-then-final-value transaction), since both `Module` and `Lesson` have a unique constraint on their order column that a naive single-pass swap could violate.

The lesson create/edit modal's fields branch on `type`: `VIDEO`/`PDF` get a content URL, `TEXT` gets a textarea, `LIVE` gets start time / end time / **Host** (`Select`, filtered to Admin/Mentor/Cohort Manager — not Mentor-role only, per the request that any of the three can host) and a note that a meeting is generated automatically — there's no manual join-URL field, since `lesson.service.ts#createLesson` schedules it server-side. **Host's own connected account, if any**: when the selected host is the currently logged-in user *and* they've connected a personal Zoom/Zoho account (Settings → Live Class Accounts), a "Schedule under" selector appears letting them pick their own account over the platform's shared Zoom pool — never shown when scheduling on someone else's behalf, since one user can't see another's connected personal accounts. Lesson type is fixed after creation — switching types would mean inventing schedule data after the fact, so the honest path is delete-and-recreate. `VIDEO` lessons also get a "Thumbnail" URL field with a live `<img>` preview (silently hides itself via `onError` if the URL doesn't resolve) — persisted as `Lesson.thumbnailUrl` and used as the poster shown before/between plays on the Learn page (both `YouTubePlayer`'s cover and the native `<video poster>` fallback).

Each live lesson row shows a "Host link (mentor)" link until its session is marked `COMPLETED`, then a "View recording" button instead (never both) — clicking it fetches a short-lived signed URL on demand (`GET /api/lessons/:id/live-class/recording-url`) and opens it in a new tab, rather than linking a raw stored value (which is now an S3 key, not a usable URL on its own).

Every lesson row also has a "Content" button opening `LessonContentModal` (`components/admin/LessonContentModal.tsx`) — three tabs for managing that lesson's Quizzes (a real nested question/option builder, publish/unpublish, delete), Assignments (create/delete plus a "Submissions" view with an inline grade-and-feedback form per student), and Resources (create/edit/delete, file type narrowed to PDF/DOCX/EXCEL/VIDEO/IMAGE). This is what actually lets an admin/mentor create a quiz, an assignment, or a resource link at lesson-authoring time without needing curl — closing the gap noted in `progress-tracker.md` where those three previously had real backends but no admin UI at all.

A separate "Schedule" modal (opened from a per-lesson button, `LIVE` lessons only) is where "once live finished, recording will show" actually happens: edit start/end/mentor/join URL, change `status` (Scheduled/Live now/Completed/Cancelled) via `PATCH /api/lessons/:id/live-class`. **Recording is now a real file upload, not a pasted link** — a file input always visible in this modal (not gated behind `status === "Completed"` anymore, since uploading the recording is what marks the session complete now, not the other way around) uploads directly browser-to-S3 via a presigned PUT URL with a live progress bar (`XMLHttpRequest.upload.onprogress`, since `fetch` can't report upload progress), then calls a finalize endpoint that stores the resulting S3 key and flips `status` to `COMPLETED` automatically. This is required for Zoho-hosted sessions (no reliable automatic recording pull) and available as an override for Zoom too, alongside its existing automatic webhook-download path (unchanged, still works on its own).

### Cohorts + Cohort Detail

**Paths:** `app/admin/cohorts/page.tsx`, `app/admin/cohorts/[id]/page.tsx`

Status: Built — list page rebuilt to match a referenced "Cohort Management" mockup. 4 stat cards across the top (Total Enrolled, Active Cohorts + upcoming-launches subtext, Avg. Grade Rate via `CompletionRing`, At-Risk Students), all from a new `GET /api/cohorts/stats`. A filter-tab row with live counts (All/Active/Upcoming/Completed/Cancelled/Archived), a search box (matches cohort name or course title), a category filter `Select`, and a grid/list view toggle. Grid view: one card per cohort — category + status `Badge`s, primary manager avatar+name (`+N` badge if more than one), start date, a progress bar that reads "Enrollment Capacity" for `UPCOMING` cohorts or "Course Progress" everywhere else, and a 3-stat row (Students/At Risk/Avg Grade — or Cap Limit instead of Avg Grade for `UPCOMING`). List view is the same fields as a denser table. The create/edit modal assigns `Course` (`Select`, locked after creation), a read-only **Category** (derived from the course), **Status** (`Select` — Active/Upcoming/Completed/Cancelled/Archived), **Cohort manager(s)** (`MultiSelect`, options filtered to the Cohort Manager role — a cohort can have more than one manager now, see `progress-tracker.md`), and **Instructor(s)** (`MultiSelect`, Mentor role). Editing shows a read-only **Enrolled members** count with a "— Cohort full" note once `enrollments >= capacity`.

The detail page is where mentor/manager/student assignment happens day-to-day after creation: two side-by-side cards — **Mentors** and **Cohort Managers** — each with add one-at-a-time / remove (`POST`/`DELETE /api/cohorts/:id/mentors[/:userId]` and the equivalent `/managers` routes, options exclude already-assigned users), a **Cohort Details** card below with start/end date and enrollment count, an **Enrolled Students** table (enroll/unenroll), and a **Student Progress** table (`GET /api/cohorts/:id/progress`) showing every enrolled student's real completion percentage and last activity date.

### Users

**Path:** `app/admin/users/page.tsx`

Status: Built. List+create+edit. Create modal picks a role via `Select` (`/api/roles`) and posts to `POST /api/users`, the admin-provisioning endpoint that creates the account as `ACTIVE`/pre-verified, bypassing the self-signup OTP flow entirely. Role `Badge` color keyed by role name.

Role and Status filter `Select`s sit above the table (client-side filtering of the already-fetched list — no extra request per filter change). The User column shows an `Avatar` alongside name/email, not just text. A pencil-icon "Edit" action per row replaces the old inline "Suspend"/"Activate" link with one combined modal covering every editable field — name, email, mobile number, role, status, and an optional "reset password" field (blank = unchanged) — backed by a single `PATCH /api/users/:id`. The platform's bootstrap admin account (`SEED_ADMIN_EMAIL`) never appears in this list and can't be reached through any of these endpoints — it's the root/recovery login, protected server-side regardless of which user-management endpoint is used.

### Enrollments

**Path:** `app/admin/enrollments/page.tsx`

Status: Built. Global cross-cohort view (`/api/enrollments`, no `cohortId` filter) with a `Select` to filter down to one cohort, and an inline per-row `Select` to change status (`PATCH /api/enrollments/:id/status`) without leaving the page. Creating new enrollments happens from the cohort detail page instead, where the "which cohort" context is already established.

### Reports

**Path:** `app/admin/reports/page.tsx`

Status: Built, real data. 4 summary `StatCard`s (Total Enrollments, Average Completion, Certificates Issued, Total Revenue — computed client-side from the already-fetched course rows, no extra request) above two `DataTable`s: Course Performance (`GET /api/reports/courses` — enrollments/avg completion/certificates issued/revenue per course, aggregated across each course's cohorts) and Cohort Performance (`GET /api/reports/cohorts` — same metrics shape as the admin Cohort Management page, fetched fresh rather than shared). Each table has a real "Export CSV" button — builds the CSV client-side from the rows already in hand and downloads it via a `Blob` + temporary `<a download>` link, no backend export endpoint.

### Announcements

**Path:** `app/admin/announcements/page.tsx`

Status: Built, real data. Create modal (title, message, audience `Select`: Everyone/Students/Mentors/Cohort Managers) posts to `POST /api/announcements`, which persists the `Announcement` row and fans out real `Notification` rows (type `ANNOUNCEMENT`) to every user matching the chosen audience — recipients see it through the existing notification bell, no separate announcements inbox built for non-admins. List shows title, audience `Badge`, sender, real recipient count, and relative timestamp; delete removes the `Announcement` record only (already-delivered notifications aren't retracted).

### Settings

**Path:** `app/admin/settings/page.tsx`

Status: Built (full functional, not a placeholder). Vertical tab layout (`240px` nav column + content, per the user's explicit "vertical tabs" request) switching between tab components under `components/settings/`, each independently data-loading/saving its own resource:

* **ProfileSettingsTab** — `PATCH /api/auth/me` for name/mobile number; `POST /api/auth/me/avatar` (multipart) for the photo, uploaded the instant a file is picked (not gated behind the form's "Save changes" button) — shows a local `URL.createObjectURL` preview immediately, then swaps to the real uploaded URL once the request resolves and calls `refetch()` so the new photo appears in the Sidebar/topbar right away too. Email shown read-only (changing it isn't supported — would require re-verification, out of scope).
* **NotificationSettingsTab** — `GET`/`PATCH /api/notification-preferences`. Five `Switch` toggles (master email switch + enrollment/announcement/certificate/product-update emails), each saved individually on toggle (no separate "Save" button — matches the immediate-feedback expectation of a settings toggle).
* **EmailSettingsTab** — `GET`/`PATCH /api/settings` (SMTP fields only). Host/port/username/password/from-name/from-email/TLS toggle. The password field never receives the real stored value back (the API redacts it to `smtpPasswordSet: boolean`) — placeholder text reads "Leave blank to keep current" once a password exists. "Send Test Email" is permanently `disabled` (wrapped in a `Tooltip` explaining no mail provider is wired yet) rather than faking success.
* **SecuritySettingsTab** — three sub-sections in one tab: (1) change password (`POST /api/auth/change-password`, requires the current password, reuses `PasswordStrengthHints`); (2) active sessions (`GET /api/auth/sessions` / `DELETE /api/auth/sessions/:id`) — lists every non-revoked, non-expired session with a human-readable device guess from the user agent, tags the session matching the request's own JWT as "This device" (no revoke button shown for it); (3) security policy (`GET`/`PATCH /api/settings`, security fields only) — session timeout, max login attempts, enforce-2FA toggle.
* **GeneralSettingsTab** — `GET`/`PATCH /api/settings` (general fields only). Platform name, support email, maintenance-mode toggle.
* **RolesPermissionsTab** — full role CRUD: lists every role with a System/Custom `Badge` and its permissions as `Module · Action` badges (friendly labels, not raw `course:write` keys); "New Role" modal groups the permission checkboxes into one card per module with a tri-state "select all" checkbox (checked/unchecked/indeterminate, set via a ref since React has no native `indeterminate` prop) and one checkbox per actual existing action for that module (Read/Edit/Create/Update/Delete/Publish — only the ones that have a real permission key, never a fabricated always-403 control), reused for editing an existing custom role. System roles render with no edit/delete buttons — the backend rejects both anyway (`role.service.ts#updateRole`/`deleteRole`), this just avoids showing a button that would always 403.
* **WhatsAppSettingsTab** — its own nested vertical-tab shell (`components/settings/WhatsAppSettingsTab.tsx`, `180px` nav column) switching between 3 sub-components in `components/settings/whatsapp/`: `WhatsAppConfigurationTab` (provider/phone-number-ID/business-account-ID/access-token/webhook-verify-token, access token redacted the same way the SMTP password is — `accessTokenSet: boolean` instead of the real value), `WhatsAppTemplatesTab` (list+modal CRUD against `/api/whatsapp/templates`, inline per-row status `Select` instead of a separate action — editing a template's content resets its status to Draft since an approved template's wording can't silently stay "Approved" after changing), `WhatsAppNotificationsTab` (5 `Switch` toggles for which platform events — class reminders, deadline reminders, enrollment, announcements, certificate issued — should fire a WhatsApp message; same pattern as `NotificationSettingsTab` but platform-wide via `WhatsAppSetting`, not per-user).
* **ZoomAccountsTab** ("Live Class API" tab, `components/settings/ZoomAccountsTab.tsx`) — unlike every other settings tab, this one manages a *list* of rows (`ZoomAccount`), not a singleton: add/edit/delete, each row showing an Active/Disabled `Badge`, an "In-app join ready"/"Join-link only" `Badge` (whether that account's Meeting SDK key/secret are both set), its concurrent-meeting limit, and a copyable webhook URL (`{PUBLIC_API_URL}/api/webhooks/zoom?account=<id>`) to paste into that specific Zoom App's Event Subscriptions config. The edit form has three secret-redacted fields (Client secret, Secret token, SDK secret — same "leave blank to keep current" placeholder pattern as SMTP/WhatsApp) plus a clearly-labeled optional "Meeting SDK" section explaining it's a different Zoom app type from the Server-to-Server OAuth fields above it, not just another credential pair for the same app.
* **PlanSettingsTab** ("Plans" tab, `components/settings/PlanSettingsTab.tsx`) — two cards, one per `PlanTier` (ICAP / Intensive Pro), each with a number input + Days/Months/Years `Select` for LMS Access duration and a second number+unit pair for Recording Access duration, against `GET`/`PATCH /api/plan-settings/:plan`. These durations are only a *default* used when an enrollment is created or its plan changed — editing them here never retroactively changes an already-enrolled student's expiry date (snapshotted at enrollment time).

`WhatsAppTemplatesTab` also has a `messageType` field (`TEXT`/`MEDIA`/`DOCUMENT`) per template, with a `sampleMediaUrl` input that only appears in the modal when the type isn't `TEXT`, and a "Sample Templates" card gallery above the table — a static `SAMPLE_TEMPLATES` array (not seeded data) covering all 3 message types, each card's "Use this template" button opens the create modal pre-filled so the admin can start from a working example instead of a blank form.

Three of the tabs (Email, Security's policy section, General) all read/write the same single `PlatformSetting` row but only ever PATCH their own fields — each tab is a focused editor for one slice of one resource, not a single giant settings form. `WhatsAppConfigurationTab`/`WhatsAppNotificationsTab` follow the same pattern against the separate `WhatsAppSetting` singleton.

---

## Theme Components

### ThemeToggle

**Path:** `components/theme/ThemeToggle.tsx`

Purpose: Working light/dark mode toggle. Toggles a `.dark` class on `<html>`, persists the choice in `localStorage`, and falls back to OS preference (`prefers-color-scheme`) on first visit. `app/layout.tsx` runs a `beforeInteractive` script (`next/script`) to apply the stored theme before paint, avoiding a flash of the wrong theme. All dark-mode colors are defined as `.dark` overrides of the same CSS variables in `app/globals.css` (see ui-tokens.md's Dark Mode section) — no component needs `dark:` utility classes, since existing `bg-surface`/`text-text-primary`/etc. utilities already read from those variables. Wraps its button in `Tooltip` instead of a native `title` attribute.

Status: Built (Phase 1)

---

## Auth Infrastructure (not page components, but registered since every admin page depends on them)

### AuthProvider / useAuth

**Path:** `components/providers/AuthProvider.tsx`

Purpose: React context wrapping the whole app (mounted in `app/layout.tsx`, around `{children}`) exposing `useAuth() -> { user, loading, refetch }`. On mount, if `lib/authClient.ts#getAccessToken()` returns a token, fetches `GET /api/auth/me`; otherwise resolves `user: null` immediately without a network call (so auth pages don't make a wasted request). `AdminLayout` is the main consumer — every admin page indirectly depends on this for its identity and route guard.

Status: Built

### lib/authClient.ts

**Path:** `lib/authClient.ts`

Purpose: `sessionStorage`-backed access-token persistence (`getAccessToken`/`setAccessToken`/`clearAccessToken`) plus `apiFetch`/`apiJson` — fetch wrappers that attach `Authorization: Bearer <token>`, always send `credentials: "include"` (for the httpOnly refresh cookie), and on a 401 retry the request once after calling `POST /api/auth/refresh`. `apiJson<T>()` normalizes the server's `{ success, data | message, details }` response shape into `{ ok: true, data } | { ok: false, message, details }` — every admin page's data-fetching goes through this instead of raw `fetch`. `Login`/`Verify OTP` call `setAccessToken()` on success; `lib/logout.ts` calls `clearAccessToken()`.

Status: Built

---

## UI Components

### Modal / Select / MultiSelect / Badge / Button / DataTable

**Paths:** `components/ui/{Modal,Select,MultiSelect,Badge,Button,DataTable}.tsx`

Purpose: Generic, page-agnostic primitives built for the admin CRUD pages (none of these existed before — every admin page reuses the same pieces rather than each page inventing its own modal/table/select). A `Switch` toggle (`components/ui/Switch.tsx`) joined this set when the Settings page needed on/off controls for notification preferences, SMTP TLS, maintenance mode, and 2FA enforcement — same token-driven styling (`bg-accent` when on, `bg-border` track otherwise), optional `label`/`description` text rendered to its left. `components/ui/Avatar.tsx` joined when real avatar uploads landed: renders an `<img>` (not `next/image` — the source is the Express API's own origin, a `remotePatterns` entry would be pure overhead for what's already our own upload) if `avatarUrl` is set, else the existing initials-circle fallback; used by `Sidebar`, `ProfileMenu`, and `ProfileSettingsTab`. All styled from `ui-tokens.md` tokens only (no hardcoded colors). `Modal` is a centered overlay (`bg-overlay/50`) with Escape-to-close. `Select` is a styled native `<select>` (keeps native keyboard/accessibility behavior for free). `MultiSelect` is a checkbox-dropdown with removable pill tags for the selected values (used for course tags and cohort mentors). `Badge` maps a small fixed variant set (`success`/`info`/`warning`/`error`/`neutral`/`muted`/`accent`) to token classes — used for status pills and role badges across Courses/Cohorts/Users/Enrollments. `Button` centralizes the 4 button variants ui-tokens.md already specifies (primary/secondary/ghost/danger) instead of repeating the class strings per page. `DataTable<T>` is a generic table shell handling the loading/empty/error states ui-rules.md requires on every data-driven page, so individual pages only supply columns + rows.

Status: Built

---

### Tooltip

**Path:** `components/ui/Tooltip.tsx`

Purpose: Token-styled hover tooltip (`bg-overlay-dark`, white text, `rounded-md`, fade+scale transition) for icon-only controls where a native `title` attribute isn't visually styleable. Pure CSS (`group`/`group-hover`), no JS state. Props: `label`, `side` (`"top" | "bottom" | "right"`, default `"bottom"`) — `"right"` added for the collapsed `Sidebar`'s icon-only nav items — and `className` (merged into the wrapper span, e.g. `Sidebar` passes `"w-full"` so the wrapped nav-item `Link` actually stretches to the full row width and its `justify-center` centers the icon for real).

Status: Built (Phase 1)

---

### InlineAlert

**Path:** `components/ui/InlineAlert.tsx`

Purpose: Badge-style one-line notice (`variant`: `"error"` default `bg-error/10`/`text-error`, or `"success"`) with a Lucide icon. Used by Signup and Forgot Password to show the flow-guard's "complete the previous step first" message read from `?notice=`.

Status: Built (Phase 1)

---

### PasswordStrengthHints

**Path:** `components/ui/PasswordStrengthHints.tsx`

Purpose: Live checklist shown under a password field while typing — each of the 5 rules (8+ chars, upper, lower, digit, symbol) gets a check/x icon that updates on every keystroke, instead of a static "must contain..." caption only shown after a failed submit. Exports `PASSWORD_RULES` too, so Signup/Reset Password's own submit-time validation uses the exact same rule set instead of a second copy. Used by Signup and Reset Password.

Status: Built (Phase 1)

---

### OtpInput

**Path:** `components/ui/OtpInput.tsx`

Purpose: Reusable 6-box one-time-code input (auto-advance on digit entry, backspace-to-previous, full paste support). Used by Verify OTP and Reset Password. Props: `length` (default 6), `value`, `onChange`, `disabled`.

Status: Built (Phase 1)

---

### FileUploadField

**Path:** `components/ui/FileUploadField.tsx`

Purpose: The one reusable upload control behind every "media field" in the app that used to be a plain `type="url"` text input — course/lesson thumbnails, the admin Resources panel, a student's assignment-submission file, certificate template designs. Picking a file uploads immediately (no separate "Save" step needed to see something happen): a local `URL.createObjectURL` preview shows instantly while the request is in flight, then swaps to the real server URL once it resolves — same pattern `ProfileSettingsTab`'s avatar field already used, generalized so every other media field didn't need its own copy of that logic. Props: `endpoint` (one of the `POST /api/uploads/*` routes), `accept` (mimetype allowlist string), `value`/`onUploaded` (controlled, like any other form field), `kind` (`"image"` renders a thumbnail preview; `"file"` renders a generic "File attached" pill, for PDFs/videos/docs that can't preview as an `<img>`). Backed by `server/src/lib/uploads.ts`'s `makeUpload()` factory — five categories (`avatars`, `course-thumbnails`, `lesson-thumbnails`, `resources`, `submissions`, `certificate-designs`), each its own folder under `uploads/`, each with its own mimetype allowlist and size limit (5MB for thumbnails/avatars, 50MB for resources, 20MB for submissions, 10MB for certificate designs). `resource` uploads also return an inferred `fileType` (PDF/DOCX/EXCEL/VIDEO/IMAGE) from the file's mimetype, pre-filling that field so the admin doesn't have to pick it manually.

Deliberately *not* used for the lesson Video/PDF content-URL field — that field is also the YouTube-link entry point for the whole custom player system (see `YouTubePlayer`'s entry above), and self-hosted lecture videos are commonly far larger than what a local-disk multer upload should accept without real object storage behind it. Paste-a-URL stays correct there.

Status: Built

---

## Layout Components

### Logo

**Path:** `components/layout/Logo.tsx`

Purpose: incrito wordmark from `app/assets/{incrito_light_logo_web,incrito_dark_logo_web}.png`. `background="auto"` (default) follows the site theme via a `MutationObserver` on `<html>`'s `.dark` class; `background="dark"` forces the light-colored variant regardless of site theme, used on the auth pages' always-colored gradient panel. Takes both `width` and `height` as explicit numbers computed from the source file's real pixel dimensions — not sized via Tailwind classes or next/image's static-import inference, both of which rendered it at native (huge) size unreliably. Used in `Sidebar` and `AuthLayout`.

Status: Built (Phase 1)

---

### AuthLayout

**Path:** `components/layout/AuthLayout.tsx`

Purpose: Shared shell for all 5 auth pages — gradient left panel (`Logo`, headline, icon-led feature list, "Your Progress" stat card) + right panel (top-right `ThemeToggle`, centered form area via `children`). `showIllustration` prop swaps in the cube graphic (`app/assets/login_page_icon.png`) that only the Signup mockup uses.

Status: Built (Phase 1)

---

### Sidebar

**Path:** `components/layout/Sidebar.tsx`

Purpose: Role-aware left sidebar navigation (`role` prop: Student/Mentor/Cohort Manager/Admin) per the corrected ui-rules.md Navigation section — replaces the originally-built `Navbar.tsx` (top nav), deleted because none of the dashboard mockups (admin dashboard, trainer panel) actually use a top navbar; all of them use a sidebar. `Logo` at top, active-route highlighting via `usePathname`, user profile pinned at the bottom. `h-screen` and rendered outside the scrollable content area (see `AdminLayout`), so it never scrolls with the page.

Active-state match is prefix-based, not exact (`pathname === item.href || pathname.startsWith(item.href + "/")`) — an exact match meant "Courses" lost its highlight the moment you navigated from `/admin/courses` into a sub-page like `/admin/courses/[slug]` (manage curriculum), since that path is never literally equal to the nav item's own href. Applies to every role's nav list, not just Admin's Courses item, since the same exact-match bug would affect any nav item with sub-pages.

Admin's nav list gained a "Community" item (`/admin/community`, `Globe` icon — changed from an initial `MessageSquare` choice, which read as near-identical to the Chat nav item's icon) between Enrollments and Reports — the management entry point for the new premium-community system. The standalone Categories/Tags items were later removed from this list (moved into Settings → Courses Settings — see Settings entry).

Footer: expanded shows avatar + name/role + a Log out icon button (`justify-between`, using the shared `lib/logout.ts` helper — same one `ProfileMenu` calls, extracted so the fetch+redirect logic isn't duplicated). Collapsed shows the Log out icon only (no avatar) per follow-up request, wrapped in a `Tooltip`.

Collapsible via `collapsed`/`onToggleCollapse` props (state owned by `AdminLayout`, persisted to `localStorage`): collapsed state shrinks to icon-only (`w-20`), swaps the full `Logo` wordmark for the square `app/assets/incrito_favicon.jpg` mark, and wraps every nav item + the profile avatar in `Tooltip` (`side="right"`) showing the label/name on hover. `nav` deliberately has no `overflow-y-auto` — Tailwind forces both overflow axes to `auto` once either is non-`visible`, which was producing a horizontal scrollbar from the right-side tooltips' layout box; current nav lists are short enough to not need scroll protection.

Collapsed-state alignment, fixed in two passes: the toggle button is positioned `absolute` over the logo row (not a flex sibling sharing `justify-between`) so the logo itself stays mathematically centered, matching the nav icons and avatar below — a shared flex sibling would always pull the logo off-center regardless of how the button itself was placed. Each nav `Link` is content-sized (icon + `px-3 py-2.5` padding, so its `bg-accent-light` active background forms a proper padded pill) and centered by its `Tooltip` wrapper's own `justify-center` (the wrapper is the actual flex container here) — centering `justify-center` on the `Link` itself did nothing, because the `Link` was never told to fill the row's width in the first place, so it just sat at its content size with no extra space to distribute.

No `transition` on the width change (deliberately removed, not an oversight): animating `width` forces a layout reflow on every frame, and with 5 Recharts widgets on the admin dashboard each running a `ResizeObserver` that redraws the whole chart on resize, a 150ms width transition meant 5 chart redraws firing repeatedly across that animation instead of once — the user-visible symptom was lag when collapsing. Collapse/expand is now an instant, single resize.

Nav icon size is `22` when collapsed vs `18` when expanded — bumped up since the icon is the sole visual identifier with no label next to it once collapsed.

Status: Built (Phase 1). `role`/`userName` now come from the consuming `AdminLayout` (sourced from `useAuth()`), not hardcoded props. Not yet wired: notification state.

---

### AdminLayout

**Path:** `components/layout/AdminLayout.tsx`

Purpose: Shared shell for every authenticated/dashboard page (parallel to `AuthLayout` for the auth pages): `Sidebar` (fixed, owns collapse state) + sticky `DashboardTopbar` + a scrollable `<main>` for page content via `children`. The outer container is `h-screen overflow-hidden` so only `<main>` ever scrolls — neither the sidebar nor the topbar move when page content scrolls.

No longer takes `role`/`userName` props — pulls the current user from `useAuth()` (see `AuthProvider` below) and renders `null` (no content) while `loading` or until a user is resolved, then redirects to `/login` via `router.replace` if there's definitively no authenticated user. This is the only route guard admin pages get; every page wrapped in `AdminLayout` is implicitly auth-gated.

Status: Built (Phase 1, route-guarding added when the admin CRUD pages were built)

---

### Footer

**Path:** `components/layout/Footer.tsx`

Purpose:

* Global footer
* Copyright
* Support links

Status: Built (Phase 1)

---

### PageWrapper

**Path:** `components/layout/PageWrapper.tsx`

Purpose:

* Standard page width
* Consistent page padding
* Section spacing

Status: Built (Phase 1)

---

## Homepage Components

### Hero

**Path:** `components/homepage/Hero.tsx`

Status: Planned

### Features

**Path:** `components/homepage/Features.tsx`

Status: Planned

### HowItWorks

**Path:** `components/homepage/HowItWorks.tsx`

Status: Planned

### CTASection

**Path:** `components/homepage/CTASection.tsx`

Status: Planned

---

## Dashboard Components

Built for the admin dashboard (`app/admin/dashboard/page.tsx`), matching `context/design/admin dashboard.png`. All use mock data per ui-rules.md's "UI first, wire backend after" — none are connected to real aggregation APIs yet (those don't exist before Phase 16 in build-plan.md; this page was requested ahead of that phase order).

### DashboardCard

**Path:** `components/dashboard/DashboardCard.tsx`

Purpose: Shared title + content card wrapper (`bg-surface border border-border rounded-2xl p-6`) used by every chart/list widget below, so each one only supplies its title and body instead of repeating the card chrome.

Status: Built (Phase 1, ahead of Phase 16 order)

### DashboardTopbar

**Path:** `components/dashboard/DashboardTopbar.tsx`

Purpose: Sticky icon row rendered by `AdminLayout` above the scrollable content — search input, Chat/Settings/Notifications icon buttons (each in a `Tooltip`), `ThemeToggle`, `ProfileMenu`. The greeting/date-range that used to live here moved to `WelcomeBanner` (page content, not part of the fixed bar) per follow-up feedback, and the date-range itself was later removed outright (see `WelcomeBanner` entry).

Student role only: a total-IP pill (`Coins` icon, `bg-accent-light` rounded-full badge) sits to the left of the Chat icon, reading `GET /api/me/points` (sums `LeaderboardEntry.points` across every cohort the user is enrolled in) on mount. "XP" was renamed to "IP" (Incrito Points) as a label change everywhere it appears — this pill, the certificate achievements panel, the leaderboard, and the course overview widget — the underlying `points` field/scoring logic didn't change.

**Search is real, not decorative.** The input is state-driven, debounced 300ms, fetching `GET /api/search?q=` once the query is 2+ characters. Results render in an absolutely-positioned dropdown grouped by type (Courses/Communities/Members, each with its own icon), close on outside-click, and navigate on click (course → its Overview tab, community → its feed at `/community/[id]`, user → `/admin/users`, since there's no per-user detail page). User results only ever appear for Admin (gated server-side in `search.service.ts`, not just hidden client-side) — a student typing into this box shouldn't be able to enumerate other users by name/email.

Status: Built, real search

### WelcomeBanner

**Path:** `components/dashboard/WelcomeBanner.tsx`

Purpose: "Welcome back, {name}!" greeting + subtitle — page content rendered just below the sticky `DashboardTopbar`, scrolls away with the rest of the page (intentionally, unlike the topbar). Previously also rendered a current-week date-range pill; removed outright (not made functional) since it had no real filtering wired to any dashboard widget and building that would mean threading a date-range param through every chart on every role's dashboard — out of scope for what was a "make functional or remove it" ask.

Status: Built

### ProfileMenu

**Path:** `components/dashboard/ProfileMenu.tsx`

Purpose: Avatar button in `DashboardTopbar` that opens a dropdown (click, not hover; closes on outside click) with the user's name/role and Profile/Log out actions. Log out calls the shared `lib/logout.ts` helper (`POST /api/auth/logout` then redirect to `/login`) — also used directly by `Sidebar`'s own logout button, so the fetch+redirect logic lives in one place. "Profile" doesn't navigate anywhere yet (no profile page built).

Status: Built (Phase 1, ahead of Phase 16 order)

### StatCard

**Path:** `components/dashboard/StatCard.tsx`

Purpose: Icon + label + big number stat tile. Props: `icon` (Lucide), `label`, `value`, `accent` (`"accent" | "success" | "info" | "warning"`, mapped to a fixed class-name lookup — never a dynamically-interpolated Tailwind class, which Tailwind can't detect at build time).

Status: Built (Phase 1, ahead of Phase 16 order)

### UserGrowthChart / EnrollmentsOverviewChart / TopCoursesChart / RevenueOverviewChart / RevenueTrendChart

**Path:** `components/dashboard/{UserGrowthChart,EnrollmentsOverviewChart,TopCoursesChart,RevenueOverviewChart,RevenueTrendChart}.tsx`

Purpose: Recharts-based widgets (`ui-rules.md`: "Charts: Use Recharts only") — area, donut, horizontal bar, vertical bar, and line charts respectively, all colored from CSS variable tokens (`var(--color-accent)` etc.), never hardcoded hex, per ui-tokens.md's Dashboard Chart Colors table. All five now take a `data` prop and render real numbers from `dashboard.service.ts#getAdminDashboard()` — no mock arrays left in any of them. Each accepts an optional `className` passed through to `DashboardCard` (used as `h-full` so cards in the same dashboard row stretch to equal height via the parent grid's `items-stretch`).

Status: Built, real data

### QuickActions / RecentActivity

**Path:** `components/dashboard/{QuickActions,RecentActivity}.tsx`

Purpose: Simple list-style widgets — action shortcuts with links, and a real recent-events feed (merged enrollments/certificates/course-publishes, sorted by timestamp, icon per activity type). `RecentActivity`'s list scrolls internally (`h-64 overflow-y-auto`) so it doesn't blow out its card's height when the activity row is taller than its row-mate.

Status: Built, real data. (`UsersByRole` and `PlatformHealth` — both real-data widgets built in the same round as a substitute for the unsupported "Users by Country"/fake infra-status mockup checks — were removed from the dashboard and deleted as components per a follow-up simplification request; if either concept is wanted again, the computation still exists in `dashboard.service.ts#getAdminDashboard()`'s `usersByRole`/`platformHealth` return fields even though no component currently renders them.)

---

## Course Components

### CourseCard

**Path:** `components/courses/CourseCard.tsx`

Status: Built (Phase 1). Takes `CourseCardData` (slug, title, thumbnailUrl, mentorName, status, moduleCount) — caller supplies data, not yet wired to the courses API.

### CourseGrid

**Path:** `components/courses/CourseGrid.tsx`

Status: Built (Phase 1). Renders a `CourseCard` grid with an empty state.

### ModuleAccordion

**Path:** `components/courses/ModuleAccordion.tsx`

Status: Built. Collapsible card per `Module` (mock-typed from `lib/mock/courseRoadmap.ts`, matching the real `Module`/`Lesson`/`LiveClass` schema shapes): module-level status icon (checkmark when `completed`, ring outline when `in-progress`, lock when `locked`) + `Completed`/`In Progress` `Badge`, "X/Y lessons completed" subtext, chevron toggle. Each lesson row branches on `lesson.type`: a recorded `VIDEO` lesson gets an active "Watch Recording" link to `/courses/[slug]/learn/[lessonId]`; a `LIVE` lesson that's the single soonest still-`SCHEDULED` session (per `isNextLiveLesson`, computed by the page from `nextLiveLessonId()`) gets a prominent filled "Live" link instead; any other upcoming `LIVE` lesson gets a gray "Upcoming" `Badge` plus a disabled, lock-icon "Watch Recording". A trailing assignment row (clipboard icon, due date, "View Details") renders if `module.assignment` is set. Used by the Course Roadmap page.

### CourseForm

**Path:** `components/courses/CourseForm.tsx`

Status: Planned

---

## Cohort Components

### CohortCard

**Path:** `components/cohorts/CohortCard.tsx`

Status: Built (Phase 1). Takes `CohortCardData` (name, courseTitle, status, dates, enrolledCount/capacity, cohortManagerName) — caller supplies data, not yet wired to the cohorts API.

### CohortForm

**Path:** `components/cohorts/CohortForm.tsx`

Status: Planned

### EnrollmentTable

**Path:** `components/cohorts/EnrollmentTable.tsx`

Status: Planned

---

## Class Components

### ClassCard

**Path:** `components/classes/ClassCard.tsx`

Status: Planned

### ClassForm

**Path:** `components/classes/ClassForm.tsx`

Status: Planned

### AttendanceMark

**Path:** `components/classes/AttendanceMark.tsx`

Status: Planned

---

## Assignment Components

### AssignmentCard

**Path:** `components/assignments/AssignmentCard.tsx`

Status: Planned

### SubmissionForm

**Path:** `components/assignments/SubmissionForm.tsx`

Status: Planned

### GradeForm

**Path:** `components/assignments/GradeForm.tsx`

Status: Planned

---

## Assessment Components

### AssessmentCard

**Path:** `components/assessments/AssessmentCard.tsx`

Status: Planned

### QuizRunner

**Path:** `components/assessments/QuizRunner.tsx`

Status: Planned

### QuestionBuilder

**Path:** `components/assessments/QuestionBuilder.tsx`

Status: Planned

### ResultCard

**Path:** `components/assessments/ResultCard.tsx`

Status: Planned

---

## Community Components

### PostCard

**Path:** `components/community/PostCard.tsx`

Status: Planned

### PostForm

**Path:** `components/community/PostForm.tsx`

Status: Planned

### CommentList

**Path:** `components/community/CommentList.tsx`

Status: Planned

### ReactionBar

**Path:** `components/community/ReactionBar.tsx`

Status: Planned

---

## Leaderboard Components

### LeaderboardTable

**Path:** `components/leaderboard/LeaderboardTable.tsx`

Status: Planned

### Podium

**Path:** `components/leaderboard/Podium.tsx`

Status: Planned

---

## Progress Components

### ProgressCard

**Path:** `components/progress/ProgressCard.tsx`

Status: Planned

### ProgressBar

**Path:** `components/progress/ProgressBar.tsx`

Status: Planned

### CompletionRing

**Path:** `components/progress/CompletionRing.tsx`

Status: Built. A single static percentage ring via `conic-gradient` (`--color-accent` for the filled arc, `--color-border-light` for the remainder) with a `bg-surface` inner circle showing a centered label — no SVG or charting library needed for one number. Props: `percentage`, `label`, `size` (default 88px). Used by the Course Roadmap page's "14 / 45" progress indicator.

---

## Certificate Components

### CertificateCanvas

**Path:** `components/certificates/CertificateCanvas.tsx`

Status: Built. The one shared read-only render surface for a designed certificate — same component used inline on the student certificate page, inside `CertificateViewModal`'s popup, and as the literal DOM node `html2canvas` rasterizes for PDF export, so there's exactly one rendering implementation to keep correct, not three that could drift. Fixed aspect ratio (`CANVAS_ASPECT_RATIO = 1.41`, exported so the admin Designer uses the identical ratio) with the background image absolutely positioned behind percentage-positioned layers — `text`/`variable` layers render as styled `div`s (variable layers resolve against a `variables: CertificateVariables` map, falling back to a visible `{keyName}` placeholder rather than blank text if a key is missing — makes a misconfigured template obvious), `image` layers as an `<img>`, `qr` layers as an async-loaded real QR code (`lib/certificateQr.ts`, cached by URL) pointing at that specific certificate's verification link.

### CertificateViewModal

**Path:** `components/certificates/CertificateViewModal.tsx`

Status: Built. The popup wrapper around `CertificateCanvas` — opened from the student certificate page's "Certificate History" table (per the explicit request that viewing a certificate should be a modal, not a navigation) and reusable anywhere else a specific certificate needs showing without leaving the current page. Owns its own "Download Certificate" button (dynamically imports `html2canvas`/`jsPDF`, rasterizes its own canvas ref, saves a real PDF) — same download mechanism the main certificate page's top-level Download button uses independently, since each instance needs its own DOM node to rasterize.

---

## Booking Components

### BookingPanel

**Path:** `components/bookings/BookingPanel.tsx`

Status: Built. Exports `BookingPanel` (used on `/sessions` "1:1 Bookings" tab) and `BookingList` (reusable for embedding elsewhere). Contains: `AvailabilityManager` (Mentor-only, weekly slot editor — day dropdown + time inputs + add/remove, `PUT /api/bookings/availability`), `BookModal` (student requests a session — datetime picker, duration, topic, notes), `ConfirmModal` (Mentor adds optional meeting URL before confirming), `BookingList` (status badges, role-appropriate action buttons). Students see a "Rate" button on completed unrated bookings which opens `RatingModal`.

### RatingModal

**Path:** `components/bookings/RatingModal.tsx`

Status: Built. 5-star interactive rating (hover + click), optional comment textarea. Submits `POST /api/mentor-ratings`. Imported into `BookingPanel` and shown for COMPLETED bookings without an existing rating.

---

## Call Components

### CallManager

**Path:** `components/calls/CallManager.tsx`

Status: Built. Self-contained WebRTC call manager rendered on the `/chat` page. Exposes an imperative `startCall(calleeId, name, avatarUrl, callType)` API via `forwardRef`/`useImperativeHandle`. Polling-based signaling using the `CallSession` DB table (no websockets). States: idle (invisible), outgoing (full-screen "Calling…" overlay), incoming (bottom-right banner with accept/decline), active (full-screen in-call UI with remote video, local PiP, timer, mute/camera toggles, hang-up). ICE candidates exchanged via `POST /api/calls/:id/ice` + polling `GET /api/calls/:id` every 2s.

---

## Notification Components

### NotificationBell

**Path:** `components/notifications/NotificationBell.tsx`

Status: Planned

### NotificationList

**Path:** `components/notifications/NotificationList.tsx`

Status: Planned
