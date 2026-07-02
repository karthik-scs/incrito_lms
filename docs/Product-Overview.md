# Incrito LMS — Product Overview

**Version:** MVP 1.0  
**Date:** July 2026  
**Audience:** All team members — product, design, engineering, QA, operations

---

## 1. What Is Incrito LMS?

Incrito LMS is a **cohort-based online learning management system** built for structured education delivery. Unlike self-paced course marketplaces, Incrito organises students into **cohorts** — guided groups progressing through a course together under the supervision of mentors and cohort managers.

The platform handles the complete learning lifecycle:

```
Registration → Enrolment → Lessons → Live Classes → Assignments →
Quizzes → Progress → Certificate → Mentor Interaction → Community
```

---

## 2. Who Uses It?

Incrito has four user roles, each with distinct responsibilities and access levels.

### 2.1 Student
The primary learner. Can:
- Browse and access enrolled courses
- Watch video lessons, read text/PDF content
- Attend live classes (Zoom or Zoho)
- Submit assignments and take quizzes
- Track progress and earn certificates
- Chat 1:1 with mentors (Intensive Pro plan)
- Book 1:1 sessions with mentors
- Participate in discussions and community spaces
- Make video/audio calls from chat

### 2.2 Mentor
A subject-matter expert who teaches and guides students. Can:
- Host live classes (using Zoom or Zoho personal account)
- View and manage their assigned cohorts
- Grade student assignment submissions
- Post and reply in course discussions
- Set 1:1 booking availability and confirm sessions
- Chat 1:1 with students (when student has Intensive Pro)

### 2.3 Cohort Manager
An operational coordinator for a cohort. Can:
- View all cohorts they manage
- Monitor student progress and sessions
- Enrol/unenrol students (with plan assignment)
- Post in course discussions
- Manage cohort-level administrative tasks
- Access the same chat and community features as Mentor

### 2.4 Admin
Full platform control. Can do everything above, plus:
- Create and manage users, roles, and permissions
- Build course curricula (modules, lessons, quizzes, assignments, resources)
- Create and manage cohorts
- Configure integrations (Zoom, Zoho, SMTP email, WhatsApp, AWS S3)
- Issue certificates to eligible students
- Define plan tiers and durations
- Moderate community spaces
- Access platform-level settings and reports

---

## 3. Core Concepts

### 3.1 Course
A structured body of learning content organised into **Modules**, each containing **Lessons**. A course can have:
- A thumbnail image, category, and tags
- A certificate template (issued on completion)
- Plan-level access restrictions (ICAP or Intensive Pro only content)
- An unlock mode: **Sequential** (lessons unlocked one by one) or **Free** (any order)

### 3.2 Module
A grouping of related lessons within a course. Modules can be plan-locked (e.g. an "Advanced" module only for Intensive Pro students).

### 3.3 Lesson
A single unit of content. Four types:
| Type | Description |
|---|---|
| **Video** | YouTube link (custom player) or S3-uploaded video (protected player) |
| **Text** | Rich written content rendered in-browser |
| **PDF** | PDF document viewed in-app |
| **Live** | A scheduled Zoom or Zoho meeting; becomes a recording after it ends |

### 3.4 Cohort
A group of enrolled students taking a specific course together under assigned mentors and a cohort manager. One course can run as many cohorts (e.g. "Batch Jan 2026", "Batch Apr 2026"). Students join a cohort, not just a course directly.

### 3.5 Enrolment
The relationship between a student and a cohort. Each enrolment has:
- A **plan** (ICAP or Intensive Pro)
- An **LMS access expiry** date (when the student can no longer access content)
- A **recording access expiry** date (when recording replays stop being available)

### 3.6 Plans
Two plan tiers determine what a student can access:

| Feature | ICAP | Intensive Pro |
|---|---|---|
| Standard lessons | ✓ | ✓ |
| Intensive Pro–only lessons/modules | ✗ | ✓ |
| 1:1 chat with Mentor | ✗ | ✓ |
| Premium Community access | ✗ | ✓ |
| LMS access duration | 6 months (default) | 1 year (default) |
| Recording access duration | 3 months (default) | 1 year (default) |

Admins configure plan durations in Settings → Plans. Duration snapshots are taken at enrolment time; changing the setting only affects future enrolments.

### 3.7 Live Class
A scheduled teaching session linked to a lesson. The platform integrates with:
- **Zoom** (shared account pool or personal connected account)
- **Zoho Meeting** (personal connected account via OAuth)

Status flow: `SCHEDULED → LIVE → COMPLETED`

Zoom webhooks automatically update status. Zoho sessions require manual recording upload after the class.

### 3.8 Certificate
Issued by an Admin once a student reaches 100% lesson completion. Each certificate has:
- A visual design (admin-uploaded template image)
- A unique verification token
- A public verification URL (no login required)
- PDF download capability

### 3.9 Community
Two types of community spaces:
- **Course Discussion**: cohort-scoped, flat comment feed with threaded replies and likes; accessible through each course
- **Community Spaces**: cross-cohort spaces created by Admin with member management; Premium spaces require Intensive Pro plan

### 3.10 Chat
1:1 direct messaging between users who share a cohort. Key rules:
- Mentor ↔ Student: requires the student to have an **Intensive Pro** plan in a shared cohort
- Mentor ↔ Mentor / Manager ↔ Manager: always available
- Mentor ↔ Cohort Manager: always available
- Supports emoji reactions, conversation pinning, attachments, voice notes
- Polling-based (refreshes every 4 seconds, no websockets)

### 3.11 WebRTC 1:1 Calling
Video and audio calls initiated from the Chat page. Uses browser WebRTC with polling-based signaling. Supports outgoing call, incoming alert, mute/camera toggle, and hang-up.

### 3.12 1:1 Mentor Bookings
Structured session booking outside of live classes:
1. Mentor sets weekly availability (specific days + times)
2. Student picks an available slot and books
3. Mentor confirms and adds a meeting URL
4. Student joins at the scheduled time
5. Mentor marks the session as completed
6. Student can rate the mentor (1–5 stars + comment)

---

## 4. Page-by-Page Guide

### Student Pages

| Page | URL | Purpose |
|---|---|---|
| Login / Signup | `/login`, `/signup` | Authentication entry points |
| OTP Verification | `/verify-otp` | Email verification after signup |
| Dashboard | `/dashboard` | Overview after login |
| My Courses | `/courses` | All enrolled courses with progress |
| Course Roadmap | `/courses/[slug]/roadmap` | Module and lesson tree; lock state |
| Learn | `/courses/[slug]/learn/[lessonId]` | Lesson content: video, text, PDF, quiz, assignments, resources |
| Course Overview | `/courses/[slug]/overview` | Course description and details |
| Discussion | `/courses/[slug]/discussion` | Cohort comment feed |
| Leaderboard | `/courses/[slug]/leaderboard` | XP rankings within the cohort |
| Certificate | `/courses/[slug]/certificate` | Certificate view and download |
| Certificate Verify | `/certificates/verify/[token]` | Public verification (no login) |
| Calendar | `/calendar` | Weekly view of upcoming live classes |
| Community | `/community` | Community spaces and course discussions |
| Community Detail | `/community/[id]` | Single community post feed |
| Chat | `/chat` | 1:1 direct messages |
| Sessions | `/sessions` | Upcoming/past live classes + 1:1 bookings |
| Settings | `/settings` | Profile, notifications, security, MFA, live accounts |
| Support | `/support` | Contact info and FAQ |

### Mentor & Cohort Manager Pages

| Page | URL | Purpose |
|---|---|---|
| My Cohorts | `/cohorts` | Cards for all assigned cohorts |
| Sessions | `/sessions` | Upcoming and past live classes; booking management |
| Discussion | `/courses/[slug]/discussion` | Same as student; can post and moderate |
| Chat | `/chat` | 1:1 DMs with students and peers |
| Settings | `/settings` | Profile, notifications, security, live class accounts |

### Admin Pages

| Page | URL | Purpose |
|---|---|---|
| Dashboard | `/admin/dashboard` | Platform-wide stats |
| Users | `/admin/users` | Create, edit, assign roles |
| Courses | `/admin/courses` | Course list; create and manage |
| Course Curriculum | `/admin/courses/[slug]` | Modules, lessons, quizzes, assignments, resources |
| Cohorts | `/admin/cohorts` | Cohort list; create and manage |
| Cohort Detail | `/admin/cohorts/[id]` | Assign mentors/managers; enrol students |
| Enrollments | `/admin/enrollments` | All enrollments; change plan |
| Categories | `/admin/courses` (tab) | Course taxonomy |
| Certificate Templates | `/admin/certificates` | Upload and manage designs |
| Certificate Designer | `/admin/certificates/[id]/design` | Design editor |
| Community | `/admin/community` | Create spaces; manage members |
| Reports | `/admin/reports` | Placeholder |
| Settings | `/admin/settings` | All platform configuration |

---

## 5. Key Workflows

### 5.1 Setting Up a New Course (Admin)
```
1. Create Category (Admin → Settings or inline)
2. Create Course → set title, thumbnail, category, tags, plan access, certificate template
3. Open course → Add Module → Add Lessons (video/text/PDF/live)
4. For each lesson: add Quiz, Resources, Assignments via "Content" button
5. Create Cohort → link to course → assign Mentor and Cohort Manager
6. Enrol Students → choose ICAP or Intensive Pro plan
```

### 5.2 Student Learning Flow
```
1. Student logs in → sees enrolled course on My Courses
2. Clicks Roadmap → sees module/lesson tree
3. Opens lesson → watches video / reads content / joins live class
4. Completes lesson → progress % updates → leaderboard XP added
5. Submits assignment → Mentor grades → feedback shown in Assignments tab
6. Takes quiz → scored immediately → best score contributes to leaderboard
7. Reaches 100% → Admin issues certificate → student downloads PDF
```

### 5.3 Running a Live Class
```
1. Admin creates LIVE lesson → selects host (Mentor/Manager/Admin) → sets time
2. Platform creates Zoom or Zoho meeting automatically
3. 10 minutes before start: Join button becomes enabled for students
4. Host starts meeting in Zoom/Zoho → webhook fires → status changes to LIVE
5. Students join via Join button on Roadmap or Calendar
6. Meeting ends → webhook fires → status changes to COMPLETED
7. Recording uploaded (auto from Zoom webhook, manual upload for Zoho)
8. Students can replay via protected video player
```

### 5.4 Mentor 1:1 Booking Flow
```
1. Mentor sets weekly availability slots (Sessions → 1:1 Bookings → Manage Availability)
2. Student books a slot (Sessions → 1:1 Bookings → Book Session)
3. Mentor confirms the booking and adds meeting URL
4. Student attends the session
5. Mentor marks session as Completed
6. Student rates the mentor (1–5 stars + optional comment)
```

### 5.5 WebRTC Call Flow
```
1. User A opens chat with User B → clicks Video or Audio call icon
2. User B receives incoming call alert (detected by 2s polling)
3. User B accepts → WebRTC offer/answer exchange via DB polling
4. Both enter active call with local PiP video and remote video
5. Either party clicks hang-up → call ends
```

---

## 6. Integrations

| Integration | Purpose | Status |
|---|---|---|
| **AWS S3** | File storage for all uploads (avatars, thumbnails, resources, recordings) | Live |
| **Zoom (Server-to-Server OAuth)** | Auto-create and manage live class meetings | Live (needs correct scopes on Zoom Marketplace app) |
| **Zoho Meeting** | Alternative live class provider | Live (verified with real credentials) |
| **SMTP Email** | OTP verification, password reset, notifications | Requires SMTP config in Admin → Settings → Email |
| **WhatsApp API** | Notification templates (configured but not sending yet) | Configured |
| **YouTube IFrame API** | Custom video player for YouTube-hosted lessons | Live |

---

## 7. Plan & Access Control Matrix

| Action | Student (ICAP) | Student (Intensive Pro) | Mentor | Cohort Manager | Admin |
|---|---|---|---|---|---|
| View enrolled courses | ✓ | ✓ | ✓ | ✓ | ✓ |
| Access ICAP lessons | ✓ | ✓ | ✓ | ✓ | ✓ |
| Access Intensive Pro lessons | ✗ | ✓ | ✓ | ✓ | ✓ |
| Chat with Mentor | ✗ | ✓ | ✓ | ✓ | ✓ |
| Join Premium Community | ✗ | ✓ | ✓ | ✓ | ✓ |
| Book 1:1 sessions | ✓ | ✓ | — | — | — |
| Grade assignments | ✗ | ✗ | ✓ | ✗ | ✓ |
| Schedule live classes | ✗ | ✗ | ✓ | ✓ | ✓ |
| Create courses | ✗ | ✗ | ✗ | ✗ | ✓ |
| Manage users | ✗ | ✗ | ✗ | ✗ | ✓ |
| Configure platform | ✗ | ✗ | ✗ | ✗ | ✓ |

---

## 8. Notification Events

The platform sends in-app notifications (bell icon, polls every 30s) for:

| Event | Who Gets Notified |
|---|---|
| Student enrolled in cohort | The student |
| Live class goes LIVE | All students in the cohort |
| Recording becomes available | All students in the cohort |
| Certificate issued | The student |
| Assignment graded | The student who submitted |
| Reply to your comment | The comment author |

---

## 9. File Storage

All uploaded files are stored in **AWS S3** (bucket: `incrito-lms-s3`, region: ap-southeast-2). Files are never publicly accessible — they are served via short-lived signed URLs generated on demand.

| File Type | Who Uploads | Max Size |
|---|---|---|
| Profile photos | Any user (self) | 5 MB |
| Course thumbnails | Admin | 5 MB |
| Lesson thumbnails | Admin | 5 MB |
| Certificate designs | Admin | 10 MB |
| Resources | Admin | 50 MB |
| Assignment submissions | Students | 20 MB |
| Chat/discussion attachments | Any user | 25 MB |
| Recordings | Auto (Zoom webhook) or Admin (Zoho manual) | No limit |
| Community cover images | Admin | 5 MB |

---

## 10. What Is Not Yet Built

These items are known gaps from the MVP scope:

| Feature | Notes |
|---|---|
| Payment / plan self-upgrade | Plan changes are Admin-only; no payment gateway yet |
| Zoom in-app embedding | Falls back to "open in new tab" until Meeting SDK key is configured |
| Analytics / Reports | Admin dashboard is a placeholder |
| Announcements | Sidebar link removed; not built |
| Support ticketing | Static page only (contact info + FAQ) |
| Google Calendar sync | UI button is disabled |
| Access expiry notifications | Expiry is enforced but no proactive email is sent |
| Attendance tracking | Schema exists but not wired to any UI |
| Social login | Not built |
| Mobile app | Web only |
| Real DRM for videos | Deterrence-level only (no download button, viewer watermark) |

---

## 11. Technical Deployment

| Component | Details |
|---|---|
| Frontend | Next.js 16 on port 3001 (managed by PM2) |
| API | Express 5 on port 4000 (managed by PM2) |
| Database | PostgreSQL — database: `incrito_learn` |
| Cache | Redis on localhost:6379 |
| Reverse proxy | Nginx → forwards all traffic to Next.js; Next.js proxies `/api/*` to Express |
| Domain | https://learn.incrito.com |
| File storage | AWS S3 — `incrito-lms-s3` (ap-southeast-2) |
| Code repository | https://github.com/karthik-scs/incrito_lms |

**Update deployment:**
```bash
cd /var/www/learn.incrito.com
git pull origin master
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart all
```

---

## 12. Glossary

| Term | Meaning |
|---|---|
| **Cohort** | A group of students taking a course together in a specific time period |
| **ICAP** | Standard plan tier — access to core curriculum |
| **Intensive Pro** | Premium plan tier — full access including mentor chat and premium content |
| **LMS access expiry** | Date after which a student can no longer access course content |
| **Recording access expiry** | Date after which a student can no longer replay class recordings |
| **Sequential unlock** | Lesson N+1 only becomes accessible after lesson N is completed |
| **Free unlock** | All lessons accessible in any order |
| **XP** | Experience points earned through lesson completion, quizzes, and assignments; used for leaderboard ranking |
| **Presigned URL** | A time-limited AWS S3 link used to serve private files securely |
| **Trickle ICE / Complete ICE** | WebRTC signaling strategies; Incrito uses "complete ICE" (all candidates gathered before signaling) |
| **Webhook** | An HTTP callback Zoom sends to Incrito when a meeting starts, ends, or a recording is ready |
| **OTP** | One-time password sent by email for verification and password reset |
| **TOTP** | Time-based OTP used for MFA (Google Authenticator) |
| **MFA** | Multi-factor authentication — a second login step using a TOTP app |
