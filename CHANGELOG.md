# Changelog

All notable changes to Incrito LMS are documented in this file.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.4.0] — 2026-07-05

### Added
- **Zoho Meeting auto-scheduling for 1:1 bookings** — When a mentor accepts a booking request, a Zoho Meeting is automatically created using the mentor's connected Zoho account and the join URL is saved to the booking.
- **Zoho Meeting auto-scheduling for group calls** — When a `GroupCallSlot` reaches full capacity (`confirmedCount >= maxMembers`), a Zoho Meeting is automatically created for that slot.
- **Announcement permissions for Mentors and Cohort Managers** — Mentors and CMs can now create, view, and delete announcements scoped only to their assigned cohort members. The audience selector is hidden for non-admin roles; notifications are fan-out to cohort members only.
- **Live class auto-completion** — Sessions with status `SCHEDULED` whose `endTime` has passed are automatically shown as `COMPLETED` (computed at query time; no schema change required).
- **Role-based course URLs** — Mentors use `/mentor/courses`; Cohort Managers use `/cohort-manager/courses`. Course detail pages (`/admin/courses/[slug]`) remain shared.
- **Cohort-filtered course list for Mentor and CM** — Both roles see only courses belonging to their assigned cohorts; the "New Course" button, publish toggle, and Edit button are hidden.
- **Permission matrix in Roles & Permissions** — Admin Settings → Roles & Permissions now shows a visual Read / Edit / Delete / Publish matrix for each role instead of a flat badge list, making permission coverage scannable at a glance.
- **Certificate download CORS fix** — `lib/certificateDownload.ts` pre-fetches all cross-origin S3 images as data URLs into an off-screen clone before `html2canvas` runs, eliminating the `Tainted canvases may not be exported` error.

### Changed
- **Zoom module removed** — All Zoom-related routes (`/api/zoom-accounts`, `/api/zoom-webhook`), service functions (`connectZoomAccount`, `getZoomSdkSignature`), and UI tabs (Admin Settings → Zoom) have been deleted. Only Zoho remains as the live-meeting provider.
- **WhatsApp module removed** — The WhatsApp settings tab and all associated API routes have been deleted.
- **Roles & Permissions moved back to Settings** — The standalone `/admin/roles` page and its sidebar entry have been removed; role management lives exclusively in Admin → Settings → Roles & Permissions.
- **Sidebar cleanup** — `ShieldCheck` icon and "Roles" nav item removed from the Admin sidebar.

### Fixed
- Certificate PDF download failing with "Tainted canvases may not be exported" when the certificate background is hosted on S3.
- `express.json` `verify` callback removed (was only needed for Zoom webhook HMAC verification).
- TypeScript error: `Property 'rawBody' does not exist on Request` in `server/src/app.ts`.

---

## [0.3.0] — 2026-06-28

### Added
- **Wasabi / S3-compatible storage support** — Admin Settings → Storage now accepts a custom endpoint URL enabling any S3-compatible provider (Wasabi, Cloudflare R2, MinIO, etc.).
- **Delete old file on replacement** — Replacing an avatar, course thumbnail, or lesson content now deletes the previous S3 object to avoid orphaned storage.
- **Delete user from Admin panel** — Admins can delete users with a confirmation dialog; pre-checks block deletion if the user has active enrollments.
- **AWS Region and Bucket label generalisation** — Storage settings labels updated to "Region" / "Bucket name" to be provider-agnostic.

### Fixed
- `Enrollment.userId` field name corrected (was incorrectly referenced as `studentId` in the delete-user check).

---

## [0.2.0] — 2026-06-15

### Added
- Zoho Meeting integration — connect a Zoho account per user, schedule live classes from Zoho.
- Group call slots with capacity limits (`GroupCallSlot` / `GroupCallRequest` models).
- Certificate template builder with layer editor and QR code verification.
- DM (direct-message) chat between users with `dmKey` conversation lookup.
- TOTP-based MFA (Google Authenticator) — opt-in from Settings → Security.
- Multi-session management — view and revoke active sessions from Settings.
- Leaderboard with cohort-scoped point rankings.
- Assessment (quiz) engine with attempt tracking and auto-grading.

---

## [0.1.0] — 2026-05-01

### Added
- Initial platform release: authentication (JWT + refresh token rotation), role-based access (Student / Mentor / Cohort Manager / Admin), course and cohort management, lesson player, progress tracking, live class scheduling, announcements, community (posts + comments + reactions), certificate issuance, Admin panel.
