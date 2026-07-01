# Library Usage Patterns for incrito LMS

## Introduction
This document defines project-specific usage patterns for third-party libraries used in incrito LMS. The platform uses Prisma ORM with PostgreSQL, Redis, JWT-based authentication, email delivery, Zoom integration, analytics, certificate generation, storage services, charting, file upload handling, and schema validation. The goal is to keep library usage consistent, predictable, and aligned with the platform architecture.

## Prisma ORM
Prisma is the primary database access layer for incrito LMS. The Prisma schema is the canonical representation of models, relations, enums, indexes, and constraints for the application domain. Use Prisma Client for reads, writes, nested mutations, transactional workflows, and relation-aware queries. All schema evolution must happen through Prisma migrations committed with the codebase.

## Cloud PostgreSQL
Cloud PostgreSQL is the source of truth for durable application data. Connectivity is configured through environment variables, and Prisma uses the database URL to connect directly to managed infrastructure. Avoid manual schema drift and avoid mixing database patterns that bypass Prisma without explicit justification.

## Redis with ioredis
Use Redis for cache entries, token revocation or blacklist checks, rate limiting, and short-lived workflow state. Keep Redis keys consistent by domain and TTL. Redis should improve responsiveness and control ephemeral state, but it must not replace PostgreSQL as the canonical persistence layer.

## bcryptjs and jsonwebtoken
Use bcryptjs for password hashing and comparison, and use jsonwebtoken for signed access and refresh flows where applicable. Token verification should be centralized and integrated with Redis-backed revocation checks. Secret keys and expiry settings must come from environment variables.

## nodemailer
Email sending should be handled through centralized service functions that standardize templates, logging, retries where appropriate, and failure handling. Common email flows include onboarding, password reset, live-class reminders, grading notifications, certificate delivery, and general platform alerts.

## Zoom REST API
Zoom integration should live behind a dedicated service layer that manages server-to-server OAuth credentials, token refresh behavior, meeting creation, updates, cancellations, and join metadata. Persist Zoom identifiers and meeting state in PostgreSQL through Prisma so the LMS remains consistent even when external calls fail partially.

**Multi-account, not single-credential.** Credentials live in the `ZoomAccount` table (managed from Admin Settings → "Live Class API"), not env vars — there can be more than one row. `server/src/lib/zoom.ts#pickZoomAccount` rotates across active accounts based on each one's `concurrentLimit` (default 2, matching a Zoom Business plan) and how many `LiveClass` rows already overlap the requested time window on that account; it throws a 409 only once every active account is genuinely full. Each account's OAuth access token is cached in Redis per-account (`zoom:access_token:<accountId>`), not globally.

**Server-to-Server OAuth vs. Meeting SDK are different Zoom app types with different credentials.** The Account ID/Client ID/Client Secret/Secret Token fields on `ZoomAccount` are a Server-to-Server OAuth app — enough to schedule meetings via the REST API and verify webhook signatures, but NOT enough for real in-app video embedding. That needs a separate "Meeting SDK" app's key/secret (optional `sdkKey`/`sdkSecret` columns on the same `ZoomAccount` row) — `lib/zoomSdkSignature.ts` generates the HS256 JWT signature `@zoom/meetingsdk`'s Component View needs, and `components/lessons/ZoomMeetingEmbed.tsx` falls back to opening the plain Zoom join URL in a new tab whenever those two columns are empty, rather than failing or faking an embed.

**Webhooks, not just polling/manual status changes.** `POST /api/webhooks/zoom?account=<id>` (public, no `authenticate` — Zoom calls it directly) verifies each event's HMAC signature against that specific account's `secretToken`, handles Zoom's one-time `endpoint.url_validation` challenge, and on real events: `meeting.started`/`meeting.ended` flip `LiveClass.status` automatically (this is what "no need of end" means in practice — nobody has to manually mark a session complete), and `recording.completed` downloads the MP4 via the account's OAuth token and uploads it to S3 (`buildS3Key("recordings", liveClassId, ".mp4")`, see the Storage service section below) instead of local disk — `LiveClass.recordingUrl` stores the bare S3 key, never a literal URL.

**Per-user personal accounts, additive to the shared pool.** Beyond the admin-managed `ZoomAccount` pool above, any Mentor/Cohort Manager/Admin can connect their *own* Zoom (and/or Zoho) account from Settings → "Live Class Accounts" (`UserLiveAccount`, one row per user per provider — see `live-account.service.ts`). When scheduling a live class, if the host picked one of their own connected accounts (`userLiveAccountId`), `zoom.ts#createMeetingWithCredentials` schedules under that personal account directly — no concurrency rotation needed, since it's their own license and Zoom itself rejects a second concurrent meeting on it. Omitting `userLiveAccountId` keeps the existing shared-pool behavior unchanged. Both Zoom and Zoho open in a new tab to start/join — there is deliberately no in-app embedding for either provider this round (`ZoomMeetingEmbed.tsx`'s Meeting SDK path still exists from an earlier round but isn't wired into the personal-account flow).

## Zoho Meeting API
`server/src/lib/zoho.ts` — REST API for scheduling, plus standard OAuth. **Fully verified live against a real connected account** — every technical detail below was confirmed by actually scheduling a real meeting through the production code path, not assumed from Zoho's public docs (which are thin and inconsistently versioned, as real developer reports warned).

**Datacenter matters.** This deployment's Zoho org is registered on the **India datacenter** — `ZOHO_ACCOUNTS_DOMAIN=https://accounts.zoho.in`, `ZOHO_API_DOMAIN=https://meeting.zoho.in`. Confirmed by testing all regional token endpoints: `.com` returns `invalid_client`, `.in` correctly accepts the credentials. Don't switch back to `.com`.

**OAuth — Self Client shape.** `ZOHO_CLIENT_ID`/`ZOHO_CLIENT_SECRET` are a "Self Client" app registered once in the Zoho API Console at the org level. Each user connects their *own* Zoho Workplace account through the standard authorization-code flow (`GET /oauth/v2/auth` → user consents → backend receives callback, exchanges code for refresh token). **The interactive browser flow does work for Self Client apps** (verified — it redirects to the Zoho sign-in page cleanly); Self Client just means "no business verification required for the app to be installed," not "redirect-based flow unavailable." The current `Live Class Accounts` settings UI uses this flow correctly.

**Required scopes.** `ZohoMeeting.meeting.CREATE,ZohoMeeting.meeting.READ,ZohoMeeting.meeting.UPDATE,ZohoMeeting.manageOrg.READ`. The last scope is critical and easy to miss — `GET /api/v2/user.json` (needed to resolve `zsoid`/`zuid`) returns `INVALID_OAUTHSCOPE` without it, even though the meeting.* scopes alone look sufficient.

**`zsoid` and `zuid` — required path/field values.** Every Zoho Meeting endpoint uses `/api/v2/{zsoid}/...` (not bare `/api/v2/...`). The `presenter` field (a Zuid — Zoho User ID) is also required when scheduling; omitting it returns `INVALID_PRESENTER_ID`. Both are fetched once from `GET /api/v2/user.json` (`userDetails.zsoid`, `userDetails.zuid` — returned as JSON numbers, must be coerced to strings) and cached on `UserLiveAccount.zohoZsoid`/`zohoZuid` to avoid a redundant API call before every meeting.

**Create-meeting request/response.** `POST /api/v2/{zsoid}/sessions.json`, body `{ session: { topic, presenter (ZUID string), startTime ("Jun 19, 2026 07:00 PM" literal — NOT epoch millis, zero-padded 12-hour), duration (milliseconds), timezone (IANA tz string, required — `MISSING_PARAM_TIMEZONE` otherwise) } }`. Response `{ session: { meetingKey, joinLink, startLink, ... } }` — `joinLink` is the attendee URL, `startLink` is the host URL.

**No in-app embedding, no auto-recording pull.** Zoho's own docs state presenters cannot start meetings through an embedded link (only Zoom's Meeting SDK offers real in-app hosting) — confirmed, both providers open in a new tab. Recordings are host-uploaded manually (`lesson.service.ts#presignRecordingUpload`/`finalizeRecordingUpload`), not auto-pulled, since Zoho has no reliable `recording.completed` webhook equivalent.

## PostHog
Use PostHog to track meaningful product and learning events from approved client and server flows. Event names and payloads should stay stable and reflect domain actions such as enrollment, attendance, assignment submission, assessment completion, and certificate issuance. Analytics calls must not leak sensitive secrets or excessive personal data.

## PDF generation
Use the approved PDF rendering approach for certificate generation and other export workflows as needed. Generated artifacts should be tied to persisted certificate records, verification identifiers, and issuance timestamps stored through Prisma-backed models.

## Storage service — AWS S3
Every uploaded file lives in S3 (`server/src/lib/s3.ts`, AWS SDK v3 — `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`), never local disk, and is never served from a permanent public URL — only short-lived signed URLs minted on demand. Optional at boot like every other third-party integration here (`AWS_REGION`/`AWS_S3_BUCKET`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` env vars); `s3.ts` throws a clear setup error the moment an actual upload/download is attempted without them, rather than crashing the whole app.

**Two upload patterns, by file size.** Small files (avatars, attachments, resources, thumbnails, voice notes — multer's `fileFilter`/size-limit validation happens first, same as before) go through the backend: `multer.memoryStorage()` holds the buffer, the controller calls `uploadObject(key, buffer, contentType)`, and the resulting URL stored in the DB is the stable `${PUBLIC_API_URL}/api/files/<key>` redirect (see below) — not the file itself. Large files (live-class recordings, potentially gigabytes) skip the backend entirely: `getPresignedPutUrl(key, contentType)` mints a presigned PUT URL, the browser uploads directly to S3 via that URL, then a `finalize` call tells the backend the upload is done (`lesson.service.ts#presignRecordingUpload`/`finalizeRecordingUpload`).

**`GET /api/files/*key`** — the generic, authenticated (but not fine-grained-permission-checked) redirect used for the "public-ish" upload types above: always resolves to a *fresh* signed S3 GET URL on every request via a 302, so the URL embedded in `<img src>`/`<a href>` stays stable and reusable even though the underlying S3 access is always short-lived.

**Genuinely protected content gets its own dedicated, permission-checked endpoint instead** — never the generic redirect: `GET /api/lessons/:id/live-class/recording-url`, `GET /api/lessons/:id/content-url`, `GET /api/resources/:id/signed-url`. Each re-derives the same plan-lock + cohort-enrollment + (for recordings specifically) `Enrollment.recordingAccessExpiresAt` checks the roadmap response already computes for its `hasRecording`/`lockedByPlan` flags — never trusting those flags alone, same "client flag is a UX hint, service re-checks" pattern used everywhere else in this codebase. The roadmap API response itself never includes a raw `recordingUrl`/key — only a `hasRecording` boolean; the actual playback URL is fetched on demand by `components/lessons/ProtectedVideoPlayer.tsx`.

**Content protection is deterrence-level, not real DRM** — explicitly scoped this way, not an oversight. `ProtectedVideoPlayer` disables the native download button (`controlsList="nodownload"`), right-click, drag, and Picture-in-Picture, and renders a repositioning on-screen watermark (viewer name + email) so a leak is at least traceable. It does **not** use Widevine/FairPlay encryption (real DRM) — no web technology can fully stop someone photographing their screen or using OS-level capture regardless, and true DRM is a substantially larger, paid undertaking (e.g. AWS MediaPackage+SPEKE, Mux, Cloudflare Stream) that was explicitly not chosen for this round.

One-off migration for files that predate this (`npm run migrate:uploads-to-s3`, `scripts/migrate-uploads-to-s3.ts`): walks the old local `uploads/` directory, uploads every file to S3 under the same relative path as its key, and backfills every DB row still pointing at the old `${PUBLIC_API_URL}/uploads/...` URL — safe to re-run.

## recharts
Use recharts for dashboards and reporting visuals in the frontend. Charts should consume API-provided aggregates rather than embedding business calculations directly in UI components. Keep dashboard metrics traceable to canonical backend records.

## multer
Use multer for controlled file uploads at API boundaries when multipart handling is required. Validate file type, size, and route permissions before storage or downstream processing. File-upload routes should remain narrow and explicit.

## zod
Use Zod for request validation and schema enforcement at API boundaries. Zod schemas define trusted input shapes before controller or service execution. Validation rules should evolve alongside API contracts and Prisma-backed domain rules.

## Usage principles
Every library should be wrapped in a consistent project pattern rather than scattered ad hoc through the codebase. Prefer central service modules, environment-driven configuration, explicit error handling, and type-safe integration points. The overall direction is a simpler cloud-hosted LMS architecture centered on Prisma, direct PostgreSQL connectivity, and well-bounded service ownership.
