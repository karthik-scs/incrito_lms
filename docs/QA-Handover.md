# Incrito LMS — QA Handover Document

**Version:** MVP 1.0  
**Date:** July 2026  
**Prepared for:** QA Team  
**Application:** Incrito LMS (cohort-based learning management system)

---

## 1. Application Overview

Incrito LMS is a full-featured cohort-based learning platform. It supports four primary roles — **Student**, **Mentor**, **Cohort Manager**, and **Admin** — each with different capabilities and views. The platform covers the complete learner lifecycle from registration through certificate issuance.

---

## 2. Environments

| Environment | URL | Status |
|---|---|---|
| Production | https://learn.incrito.com | Live |
| API (backend) | https://learn.incrito.com/api | Live (proxied) |

---

## 3. Test Credentials

All demo users share the password: **`Demo@1234`**

| Role | Email | Notes |
|---|---|---|
| Admin | admin@incrito.dev | Full platform access |
| Mentor | priya.mentor@incrito.dev | Assigned to Python + UI/UX cohorts |
| Mentor | arjun.mentor@incrito.dev | Secondary mentor |
| Cohort Manager | maria.manager@incrito.dev | Manages Python cohort |
| Cohort Manager | raj.manager@incrito.dev | Secondary manager |
| Student (0% progress) | aisha.student@incrito.dev | New enrolment, no activity |
| Student (25% progress) | ravi.patel@incrito.dev | In progress |
| Student (60% progress) | neha.student@incrito.dev | Partially complete |
| Student (100% progress) | preethi.student@incrito.dev | Certificate eligible |
| Student (ICAP plan) | karan.student@incrito.dev | ICAP plan restrictions apply |
| Student (Intensive Pro) | divya.student@incrito.dev | Full access |

> To create new test accounts: use the Sign Up flow or Admin → Users → Create User.

---

## 4. Tech Stack (for context)

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind v4 |
| Backend | Express 5, Node.js 20, TypeScript |
| Database | PostgreSQL (Prisma ORM) |
| Cache / Sessions | Redis |
| File Storage | AWS S3 (ap-southeast-2) |
| Auth | JWT (access token) + httpOnly refresh cookie |
| Live Classes | Zoom (Server-to-Server OAuth) + Zoho Meeting |
| Video Lessons | YouTube embed (custom player) + native video |
| PDF Generation | html2canvas + jsPDF |

---

## 5. Feature Scope — What Is Built

### 5.1 Authentication & Accounts
- Email + password signup with OTP email verification
- Login with JWT access token + refresh token rotation
- Password reset via OTP email
- TOTP-based MFA (Google Authenticator) — opt-in from Settings → Security
- Multi-session management (view and revoke active sessions)
- Profile photo upload (S3)

### 5.2 Role-Based Access Control
- 4 system roles: Student, Mentor, Cohort Manager, Admin
- Granular permission system (resource:action keys)
- Admin-defined custom roles (e.g. Support)
- All API routes enforce permissions server-side

### 5.3 Admin Panel (`/admin/*`)
- **Dashboard** — platform stats
- **Users** — list, create, edit, assign roles
- **Categories & Tags** — taxonomy for courses
- **Courses** — create/edit with thumbnail, category, tags, pricing, plan access, certificate template; curriculum builder (modules → lessons)
- **Lesson types** — Video (YouTube or S3), Text, PDF, Live Class
- **Cohorts** — create/edit, assign mentors and managers, enrol students with plan (ICAP / Intensive Pro)
- **Enrollments** — list all, change plan, unenrol
- **Certificate Templates** — upload design image, manage templates
- **Community** — create communities, manage members
- **Settings** — Profile, Notifications, Email (SMTP), Security Policy, Roles & Permissions, WhatsApp API, Zoom Accounts, Plans, Live Class Accounts
- **Reports** — placeholder (not wired to live data)
- **Announcements** — placeholder (not built)

### 5.4 Course Delivery (Student-facing)
- My Courses (`/courses`) — active / completed tabs
- Course Roadmap (`/courses/[slug]/roadmap`) — module/lesson tree with lock state
- Lesson Learn page — video player (YouTube + native), text content, PDF viewer
- YouTube player — custom controls (play/pause, seek, ±30s skip, volume, speed, fullscreen), branding suppressed
- Protected video player — for S3-hosted recordings (watermark, no download)
- Resources tab — in-app viewer (image, video, PDF/DOCX/EXCEL via Google Docs Viewer)
- Assignments tab — submit text or file link, view feedback once graded
- Quiz tab — multiple choice, single select, true/false; scored on submission
- Progress tracking — per-lesson completion, cohort % rollup, leaderboard XP
- Certificate — visual certificate, PDF download, public verification link

### 5.5 Live Classes
- Scheduled from admin curriculum page; host can be Admin/Mentor/Cohort Manager
- Zoom integration (shared account pool + personal connected accounts)
- Zoho Meeting integration (personal connected accounts)
- Webhooks: meeting.started → LIVE, meeting.ended → COMPLETED (auto, no manual step)
- Zoom recording auto-downloaded on webhook; Zoho recording manually uploaded
- "Join" button enabled 10 min before start and while status = LIVE
- Attendance: lesson marked complete when student joins

### 5.6 Calendar (`/calendar`)
- Week grid view of upcoming live classes across all enrolled cohorts
- Cohort and mentor filters
- Today's Schedule with live Join button
- Google Calendar sync and export — disabled (not built)

### 5.7 Community (`/community`)
- Community hub listing cohorts the student belongs to
- Cohort discussion tab: flat comment feed, threaded replies (one level), likes
- Admin-managed Community spaces with cover image and member management
- Premium Community — Intensive Pro plan required to join

### 5.8 Chat (`/chat`)
- 1:1 direct messages between users who share a cohort
- Mentor ↔ Student DM requires Intensive Pro plan
- Per-message emoji reactions
- Conversation pinning
- Polling-based (4s refresh, no websockets)
- Attachment and voice note send (S3)

### 5.9 1:1 Mentor Bookings (`/sessions` → "1:1 Bookings" tab)
- Mentor sets weekly availability (day + time slots)
- Student books a session from available slots
- Mentor confirms with a meeting URL
- Status flow: PENDING → CONFIRMED → COMPLETED or CANCELLED
- Student rates mentor (1–5 stars + comment) after COMPLETED session

### 5.10 WebRTC 1:1 Calling (from `/chat`)
- Video and audio calls between chat participants
- Initiated from the Video/Phone buttons in the chat header
- Outgoing call overlay, incoming call alert, in-call overlay with PiP video
- Mute / camera toggle / hang-up
- Polling-based signaling (no websockets); "complete ICE" strategy

### 5.11 Notifications
- In-app bell (polls every 30s); unread count badge
- Triggers: enrollment created, certificate issued, live class goes LIVE, recording available, assignment graded, reply to your comment
- Mark as read, dismiss, CTA deep-links (join class, view certificate, etc.)

### 5.12 Mentor / Cohort Manager Pages
- My Cohorts (`/cohorts`) — cohort cards filtered to assigned cohorts
- Sessions (`/sessions`) — upcoming and past live classes
- Settings (`/settings`) — Profile, Notifications, Security (personal only; no platform policy)
- Live Class Accounts (`/settings` → Live Class Accounts) — connect personal Zoom / Zoho account
- Discussion, Leaderboard, Community — same as student view but no enrollment required

### 5.13 Plans (ICAP / Intensive Pro)
- Per-enrollment plan assignment (Admin/Cohort Manager action)
- ICAP: standard access; Intensive Pro: premium content + mentor DM + premium community
- LMS access expiry and recording access expiry snapshotted at enrollment time
- Admin configures plan durations in Settings → Plans
- Content can be locked to Intensive Pro at Course / Module / Lesson / Certificate level
- Expired access blocks roadmap and lesson content server-side (not just UI)

### 5.14 Support (`/support`)
- Static contact information and FAQ
- No ticketing system (not built)

---

## 6. Known Limitations / Out of Scope for This Release

| Item | Status |
|---|---|
| Zoom in-app embedding | Falls back to "open in new tab" until Meeting SDK key/secret configured |
| Google Calendar sync / export | UI disabled — not built |
| Attendance model | Schema exists, not wired to any UI |
| Payment / self-serve plan upgrade | Plan changes are admin-only; no payment gateway |
| Access expiry automated notifications | Expiry enforced on access, no "expiring soon" email |
| Analytics / Reports page | Placeholder only |
| Announcements | Placeholder only |
| Support ticketing | Static page only |
| Recommended courses widget | Removed (no recommendation engine) |
| Certificate PDF customization | Template design uploaded as image; PDF uses html2canvas snapshot |
| Social login (Google/Facebook) | Not built |
| WebRTC on mobile browsers | Not tested |
| Real DRM for videos | Deterrence-level only (no download button, watermark) |

---

## 7. Key Test Flows (Smoke Test First)

Run these in order to confirm the deployment is healthy before detailed testing:

1. Sign up with a new email → verify OTP → land on dashboard
2. Log in as Admin → create a category → create a course → add a module → add a lesson
3. Create a cohort → assign mentor → enrol a student (ICAP plan)
4. Log in as the student → see the course on My Courses → open Roadmap → complete a lesson
5. Log in as Admin → issue a certificate to the 100% student
6. Log in as the student → download the certificate PDF → verify the public link
7. Log in as Mentor → check Sessions page → check Chat page
8. Log in as student → book a 1:1 session → log in as mentor → confirm the booking
9. Upload a profile photo and confirm it displays everywhere (topbar, sidebar)

---

## 8. API Base URL

All API calls go through `https://learn.incrito.com/api/`.  
Authentication: `Authorization: Bearer <accessToken>` header.  
Refresh: POST `/api/auth/refresh` (uses httpOnly cookie).

---

## 9. File Upload Limits

| Type | Max Size |
|---|---|
| Profile photo / avatar | 5 MB |
| Course / lesson thumbnail | 5 MB |
| Certificate design | 10 MB |
| Resources / submissions | 50 MB / 20 MB |
| Chat / discussion attachments | 25 MB |
| Recordings (presigned S3 PUT) | No server-side limit |

---

## 10. Browser Support

Tested on Chrome (latest). Firefox and Safari should work but have not been formally verified. WebRTC calling requires a modern browser with camera/microphone permissions.

---

## 11. Contacts

| Role | Contact |
|---|---|
| CTO | karthik@shresthacloudsolutions.com |
| Platform URL | https://learn.incrito.com |
| GitHub | https://github.com/karthik-scs/incrito_lms |
