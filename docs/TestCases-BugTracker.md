# Incrito LMS — Test Cases & Bug Tracker

**Version:** 0.4.0  
**Date:** July 2026

---

## Test Case Index

| ID | Area | Title | Priority |
|---|---|---|---|
| TC-001 | Auth | Sign up and OTP verification | P1 |
| TC-002 | Auth | Login with valid credentials | P1 |
| TC-003 | Auth | Refresh token rotation | P1 |
| TC-004 | Auth | Password reset via OTP | P1 |
| TC-005 | Auth | MFA (TOTP) enable and verify | P2 |
| TC-006 | Auth | Session revocation | P2 |
| TC-007 | RBAC | Admin can access all `/admin/*` routes | P1 |
| TC-008 | RBAC | Mentor redirected from `/admin/courses` to `/mentor/courses` | P1 |
| TC-009 | RBAC | CM redirected from `/admin/courses` to `/cohort-manager/courses` | P1 |
| TC-010 | RBAC | Student cannot access any `/admin/*` route | P1 |
| TC-011 | Courses | Mentor sees only assigned cohort courses | P1 |
| TC-012 | Courses | CM sees only assigned cohort courses | P1 |
| TC-013 | Courses | Mentor/CM cannot create or publish courses | P1 |
| TC-014 | Courses | Admin can create/edit/publish any course | P1 |
| TC-015 | Live Class | Session past its end time shows COMPLETED | P1 |
| TC-016 | Live Class | Session before end time shows SCHEDULED | P1 |
| TC-017 | Bookings | Zoho meeting auto-created when mentor accepts 1:1 | P1 |
| TC-018 | Bookings | Booking confirmed without Zoho account (no crash) | P2 |
| TC-019 | Group Call | Zoho meeting auto-created when slot becomes full | P1 |
| TC-020 | Group Call | Slot below capacity does not create meeting | P2 |
| TC-021 | Announcements | Admin can send to ALL audience | P1 |
| TC-022 | Announcements | Mentor announcement scoped to cohort members only | P1 |
| TC-023 | Announcements | CM announcement scoped to cohort members only | P1 |
| TC-024 | Announcements | Student cannot create announcements | P1 |
| TC-025 | Certificates | Download PDF without tainted canvas error | P1 |
| TC-026 | Certificates | Certificate public verification URL works | P1 |
| TC-027 | Certificates | Certificate not downloadable before eligibility | P2 |
| TC-028 | Settings/RBAC | Permission matrix shows Read/Edit/Delete/Publish columns | P2 |
| TC-029 | Settings/RBAC | Admin can edit permissions on system roles (except Admin) | P2 |
| TC-030 | Settings/RBAC | Admin can create and delete custom roles | P2 |
| TC-031 | Storage | Avatar replacement deletes old S3 object | P2 |
| TC-032 | Storage | Course thumbnail replacement deletes old S3 object | P2 |
| TC-033 | Community | Standard community visible to all enrolled students | P2 |
| TC-034 | Community | Premium community requires Intensive Pro plan | P2 |
| TC-035 | Chat | 1:1 DM between users sharing a cohort | P2 |
| TC-036 | Chat | Mentor ↔ Student DM requires Intensive Pro | P2 |
| TC-037 | Notifications | Bell updates on new notification (30s poll) | P2 |
| TC-038 | Calendar | Upcoming live classes appear in week grid | P2 |

---

## Detailed Test Cases

### TC-001 — Sign up and OTP verification
**Pre-conditions:** Use an email not already registered.  
**Steps:**
1. Navigate to `/signup`.
2. Fill in first name, last name, email, password (≥ 8 chars, 1 uppercase, 1 number).
3. Submit → land on OTP verification screen.
4. Enter the 6-digit code from the email.
5. Confirm redirect to `/dashboard`.

**Expected:** Account created, user role = Student, JWT access token issued.  
**Pass criteria:** Dashboard loads with student's name in the sidebar.

---

### TC-008 — Mentor redirected from `/admin/courses`
**Pre-conditions:** Logged in as Mentor.  
**Steps:**
1. Navigate directly to `/admin/courses` (paste in address bar).  
**Expected:** Redirected to `/dashboard` (role home).  
**Pass criteria:** URL changes, no courses list shown, no 404.

---

### TC-011 — Mentor sees only assigned cohort courses
**Pre-conditions:** Logged in as Mentor; assigned to 1 cohort with 1 course.  
**Steps:**
1. Navigate to `/mentor/courses`.
2. Observe course list.  
**Expected:** Only courses linked to the mentor's assigned cohort(s) are visible.  
**Negative:** Courses belonging to other cohorts (not assigned) are absent.  
**Pass criteria:** Course count matches `GET /api/cohorts` → assigned cohort course count.

---

### TC-015 — Session past end time shows COMPLETED
**Pre-conditions:** At least one live class whose `endTime` is in the past and whose DB status = SCHEDULED.  
**Steps:**
1. Log in as Admin or Mentor.
2. Navigate to Sessions / live class list.
3. Locate the past session.  
**Expected:** Status badge reads **Completed** without any manual status change.  
**Pass criteria:** `effectiveStatus = "COMPLETED"` returned from API; UI badge shows Completed.

---

### TC-017 — Zoho meeting auto-created when mentor accepts 1:1
**Pre-conditions:** Mentor has a connected Zoho account in Settings → Live Class Accounts.  
**Steps:**
1. Log in as Student → book a 1:1 session with the mentor.
2. Log in as Mentor → go to Sessions → 1:1 Bookings tab.
3. Click **Confirm** on the pending booking.
4. Check the booking detail (or API response).  
**Expected:** `meetingUrl` is populated with the Zoho join URL; host start URL may also be present.  
**Pass criteria:** The booking record in DB has a non-null `meetingUrl`.

---

### TC-019 — Zoho meeting auto-created when group slot becomes full
**Pre-conditions:** A group call slot with `maxMembers = 2`; mentor has connected Zoho account.  
**Steps:**
1. Log in as Student A → request to join the group call slot.
2. Log in as Student B → request to join the same slot.
3. Log in as Mentor → confirm both requests.
4. After the 2nd confirmation, check the slot record.  
**Expected:** `meetingUrl` populated on the slot; both students can see the join URL.  
**Pass criteria:** API confirms `slot.status = "FULL"` and `slot.meetingUrl` is non-null.

---

### TC-022 — Mentor announcement scoped to cohort members
**Pre-conditions:** Mentor assigned to Cohort A (3 students); Cohort B exists with 2 other students.  
**Steps:**
1. Log in as Mentor.
2. Navigate to Announcements → create a new announcement.
3. Observe: no audience selector is shown (hidden for non-admins).
4. Submit.  
**Expected:**
- Announcement saved.
- In-app notifications created only for the 3 students in Cohort A (and mentor themselves are not re-notified).
- Students in Cohort B receive no notification.

**Pass criteria:** `GET /api/notifications` for a Cohort B student shows 0 new entries from this announcement.

---

### TC-025 — Certificate PDF downloads without tainted canvas error
**Pre-conditions:** Student eligible for a certificate with a designUrl stored on S3.  
**Steps:**
1. Log in as the eligible student.
2. Navigate to `/courses/[slug]/certificate`.
3. Click **Download Certificate**.
4. Observe browser — no JS error; PDF file downloads.  
**Expected:** PDF opens with the certificate design and student name visible.  
**Negative:** No `"Tainted canvases may not be exported"` error in console or alert.  
**Pass criteria:** File `*.pdf` present in Downloads; opens correctly in a PDF viewer.

---

### TC-028 — Permission matrix in Settings
**Pre-conditions:** Logged in as Admin.  
**Steps:**
1. Navigate to `/admin/settings` → Roles & Permissions tab.
2. Observe each role card.  
**Expected:** Each role card shows a table with columns: **Read**, **Edit**, **Delete**, **Publish**; rows for each module; ✓ mark for granted actions.  
**Pass criteria:** System roles (Student, Mentor, Cohort Manager) display without badges — only the matrix table.

---

## Bug Tracker

| ID | Status | Priority | Title | Reported | Fixed In |
|---|---|---|---|---|---|
| BUG-001 | Fixed | P1 | Certificate download: "Tainted canvases may not be exported" on S3-backed design images | 2026-07-05 | v0.4.0 |
| BUG-002 | Fixed | P2 | WhatsApp and Zoom tabs still visible in Admin Settings after module removal | 2026-07-05 | v0.4.0 |
| BUG-003 | Fixed | P2 | Admin sidebar showed "Roles" as a standalone nav item instead of keeping it in Settings | 2026-07-05 | v0.4.0 |
| BUG-004 | Fixed | P1 | Mentor/CM course list (`/admin/courses`) showed all platform courses, not just assigned ones | 2026-07-05 | v0.4.0 |
| BUG-005 | Fixed | P2 | TypeScript error: `Property 'rawBody' does not exist on Request` in `server/src/app.ts` | 2026-07-05 | v0.4.0 |
| BUG-006 | Fixed | P2 | Announcements permission gate blocked Mentors/CMs from creating announcements | 2026-07-05 | v0.4.0 |
| BUG-007 | Fixed | P1 | `deleteUser` check referenced `studentId` instead of `userId` on Enrollment model | 2026-06-28 | v0.3.0 |
| BUG-008 | Open | P3 | Calendar export to Google Calendar is disabled (not built) | 2026-06-01 | — |
| BUG-009 | Open | P3 | WebRTC calling not tested on mobile Safari | 2026-06-01 | — |
| BUG-010 | Open | P2 | Reports page shows placeholder only — no live data | 2026-06-01 | — |

---

## Regression Checklist (run after every release)

- [ ] Login and signup flow (new user + existing user)
- [ ] Admin course creation → module → lesson
- [ ] Student enrolment and roadmap load
- [ ] Live class shows correct status (SCHEDULED / LIVE / COMPLETED)
- [ ] Certificate PDF download (with S3 design image)
- [ ] Announcement visible to correct audience
- [ ] Mentor/CM courses filtered to assigned cohorts
- [ ] Settings → Roles & Permissions matrix renders
- [ ] Profile photo upload and display
- [ ] Notifications bell updates
