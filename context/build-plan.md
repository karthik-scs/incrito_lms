# Build Plan for incrito LMS

## Introduction
This build plan describes the phased delivery of incrito LMS as a monolithic TypeScript application with Next.js, Node.js + Express.js, Prisma ORM, PostgreSQL, Redis, and role-based workflows for students, mentors, cohort managers, admins, and admin-defined custom roles. The plan preserves the original LMS feature scope while updating the implementation model to use Prisma as the central data layer and migration system. Deployment assumptions are cloud-hosted and environment-driven, without Docker- or Kubernetes-dependent setup requirements.

This roadmap was extended from an original 12-phase plan after reviewing the UI mockups in `context/design/`, which revealed product scope not previously documented: a support-ticketing system, mentor 1:1 booking and a unified calendar, mentor ratings/feedback, course categories and tags, a 2-tier (Standard/Premium) community, an announcement broadcast system distinct from personal notifications, and payment/subscription data backing the admin dashboard's revenue charts. "Cohort" replaces "Batch" throughout, matching the term used in every mockup.

## Phase 1 — RBAC + Cohort/Course foundation
Establish the repository structure, shared TypeScript configuration, Next.js app, Node.js + Express API, environment management, Redis connectivity, Prisma schema, Prisma Client generation, and initial migrations against PostgreSQL. Define core models: users, roles/permissions (including admin-defined custom roles), courses, course categories and tags, modules, lessons, cohorts, and sessions. Confirm that JWT + Redis-backed authentication, validation, logging, and standardized API responses are wired before feature expansion.

## Phase 2 — Courses and cohorts
Build the course catalog, course detail pages, cohort structures, mentor and cohort-manager ownership flows, and the backing APIs for listing, creating, updating, and publishing courses. Use Prisma relations to model course-to-cohort, course-to-lesson, and course-to-user associations. Add seeds or fixtures for early validation and ensure listing endpoints are cache-aware where appropriate.

## Phase 3 — Enrollment
Implement student enrollment flows, access checks, enrollment state transitions, and dashboard entry points for purchased or assigned learning paths. Persist enrollment records, status metadata, and access windows through Prisma-managed models. Add course pricing fields (free vs. paid, price, currency) at the schema level so Phase 11's payment flow has something to attach to. Validate API permissions carefully because enrollment affects nearly every downstream workflow.

## Phase 4 — Live classes and attendance
Introduce live-class scheduling, Zoom meeting creation and updates, join-link handling, recording storage for on-demand access, mentor or cohort-manager scheduling rights, and attendance tracking. Store Zoom metadata, recording URLs, class status, and attendance records in PostgreSQL through Prisma. Use Redis only for short-lived support concerns such as rate limiting or temporary integration state, not as permanent workflow storage.

## Phase 5 — Calendar aggregation and mentor 1:1 booking
Build the unified calendar view that aggregates four event types: live classes, mentor 1:1 sessions, generic events/reminders, and assignment deadlines. Add mentor availability and booking models so students can request 1:1 sessions against a mentor's open slots. Calendar reads are an aggregation across existing and new models, not a denormalized master table.

## Phase 6 — Assignments, resources, and sequential locking
Build assignment creation, release scheduling, submission intake, grading, rubric or feedback storage, and mentor review flows. Connect assignments to lessons, cohorts, and enrolled learners with explicit Prisma relations. Add a resource model for sharing files within modules, distinct from lesson content. Implement sequential lesson/assignment locking as service-layer logic derived from progress and content order, governed by a course-level unlock-mode setting, not as persisted per-lesson state.

## Phase 7 — Assessments
Create assessments, questions, answer options, timers, attempt rules, scoring logic, and completion views. Assessment attempt persistence, score calculation results, and retake limits should be represented cleanly in Prisma models. Protect attempt-related APIs with strict validation and role checks.

## Phase 8 — Community
Deliver cohort-scoped discussion (posts, comments, reactions, moderation states) and the cross-cohort, top-level Community page's Standard tier. Model community entities so the same post/comment/reaction structures serve both the per-cohort Discussion tab and the top-level Community page, differentiated by scope rather than duplicated models. The Premium community tier ships disabled until Phase 11 provides a subscription to gate it against.

## Phase 9 — Progress and leaderboard
Implement progress tracking, completion percentages, streaks or rankings if applicable, and leaderboard calculation workflows. Progress recalculation should be derived from durable records such as lessons, submissions, attendance, and assessment attempts rather than fragile client-side state. Redis may cache leaderboard outputs, but PostgreSQL remains authoritative.

## Phase 10 — Certificates
Add certificate eligibility checks, record generation, PDF rendering, verification flows, and delivery notifications. Prisma should persist certificate metadata, issuance timestamps, verification tokens or slugs, and recipient relationships. Certificate generation must depend on validated completion criteria rather than manual toggles alone.

## Phase 11 — Payments and Premium gating
Model course pricing, a subscription/plan concept for the Premium community tier and premium mentor-chat access, and a payment ledger with a status field. The actual charge is stubbed (manual/fake success path) rather than wired to a real payment gateway — swapping in a real provider later is an additive change (new provider enum value, webhook handler), not a schema change. This phase activates the Premium gating left disabled in Phase 8.

## Phase 12 — Notifications and announcements
Implement in-app notifications, read and unread state, event-triggered email alerts, and preference-aware messaging where required. Add an announcement broadcast model, distinct from personal notifications: an announcement is one editable, auditable piece of content scoped to a cohort, course, or the whole platform, which the service layer fans out into one notification per affected user. The service layer should own notification triggering so feature modules can emit domain events consistently.

## Phase 13 — Mentor ratings and feedback
Add mentor ratings tied to a cohort, live class, or 1:1 session, and a lightweight feedback-form/response model for cohort-level feedback collection. These back the trainer panel's "Avg. Rating" and "Feedback Forms to review" stats.

## Phase 14 — Chat
Implement DB-backed, polling-refreshed messaging (no websockets) between students, mentors, cohort managers, and support — covering the cohort-manager/mentor/support conversation list shown in the chat mockup. Premium mentor-chat access depends on the subscription state introduced in Phase 11.

## Phase 15 — Support ticketing
Build the support-ticket system: ticket creation, categorization, status workflow (open/in progress/pending/resolved/closed), and a message thread per ticket, reusing the same polling pattern as Phase 14's chat rather than introducing new infrastructure.

## Phase 16 — Dashboards
Assemble student, mentor, cohort-manager, and admin dashboards with cards, tables, charts, recent activity, and action queues, including the admin dashboard's revenue charts now that Phase 11 provides real payment data. Dashboard APIs should aggregate Prisma-backed data efficiently and use caching selectively for high-read views. All analytics and summary data should be traceable to canonical records.

## Phase 17 — Admin panel
Complete user management, reporting, enrollment oversight, moderation tools, CSV exports, status controls, custom role and permission management (for example, defining a support role), and support-oriented operational views. Admin actions must be auditable and protected by role-based authorization. Reporting queries should follow approved Prisma patterns or explicitly reviewed low-level access for exceptional cases.

## Deferred — Social/OAuth login
Google/Facebook/Apple/LinkedIn login buttons appear on the login mockup but are not scheduled into a phase yet; JWT email/password remains the only auth method until this is explicitly prioritized.

## Delivery principles
Each phase should land with schema updates, Prisma migrations, validation rules, API contracts, and UI states kept in sync. Feature work is considered incomplete if it bypasses Prisma, skips migration discipline, or introduces direct database access from UI layers. The preferred path is iterative delivery with stable domain models, service-layer ownership, and direct cloud database connectivity.
