# Incrito LMS Architecture

## System architecture overview
Incrito LMS uses a monolithic full-stack architecture built around a Next.js frontend, a Node.js + Express.js API layer, and a shared TypeScript codebase organized by responsibility. The platform runs as a single deployable application backed by PostgreSQL, Redis, and external services such as Zoom, email delivery, analytics, and object storage. The system is intentionally designed to avoid orchestration-specific assumptions; deployment targets a direct cloud runtime rather than Docker- or Kubernetes-dependent workflows.

## Core architectural shape
The frontend is responsible for rendering role-specific pages, handling user interactions, and calling internal APIs through shared fetch utilities. The backend API owns authentication, validation, business rules, third-party integrations, analytics events, and mutation-heavy workflows. Redis supports caching, token revocation checks, temporary workflow state, and rate limiting. Prisma ORM is the primary data-access layer and is the sole mechanism for application database reads and writes outside approved low-level infrastructure tasks.

## Folder and layer boundaries
Route files define endpoints and attach middleware. Controllers receive requests, invoke validation, call services, and return normalized responses. Services contain business workflows such as enrollment, live class scheduling, assignment handling, assessment scoring, progress recalculation, leaderboard generation, and certificate issuance. Prisma-backed data access is encapsulated behind service logic so that page components and UI layers never talk directly to the database.

## Database architecture with Prisma
PostgreSQL remains the system of record for users, courses, cohorts, enrollments, lessons, live classes, attendance, assignments, submissions, assessments, attempts, progress, leaderboards, certificates, notifications, and community features. Prisma schema definitions are the canonical source of truth for application models, relationships, enums, indexes, and constraints. Prisma Client provides type-safe access from backend services, enabling consistent query patterns, safer refactors, and shared domain understanding across the codebase.

## Schema management and migrations
All schema changes are introduced through Prisma schema updates and Prisma migrations. Migration files are versioned with the application code and applied against PostgreSQL environments through controlled deployment workflows. Direct manual production schema edits are avoided except for carefully reviewed operational incidents. Seed data, model constraints, relation rules, and default values should stay synchronized with Prisma so that local, staging, and production environments remain structurally consistent.

## API structure and data flow
Requests enter through route modules, pass through authentication and role-aware authorization middleware, undergo schema validation, and then reach controller functions. Controllers delegate to service-layer workflows that coordinate Prisma, Redis, and integrations such as Zoom or email. Responses follow a consistent API shape with predictable success payloads, error messages, and HTTP status codes. Controllers log failures, but domain decisions stay in services rather than in route handlers or page components.

## Security and authentication
Authentication uses JWT-based access flows with secure signing, verification, and expiry handling. Redis stores revoked-token or blacklist state to support forced logout and session invalidation patterns. Role-based access control governs student, mentor, cohort manager, and admin behavior across API routes and UI surfaces, with support for admin-defined custom roles (for example, a support role) carrying their own permission sets. Sensitive secrets, database URLs, JWT keys, email credentials, analytics keys, storage credentials, and Zoom credentials are supplied through environment variables rather than hard-coded configuration.

## Caching, rate limiting, and background state
Redis is used for cache entries, rate-limit counters, token revocation checks, ephemeral workflow data, and selective performance optimization. Cache keys should follow clear naming conventions by domain and TTL policy so invalidation stays understandable. Cached data must be treated as a performance layer, never as the source of truth. Prisma and PostgreSQL remain authoritative for persisted application state.

## Key workflows
Enrollment workflows connect users, cohorts, and course access rules. Live class workflows schedule and update Zoom meetings while persisting meeting metadata and attendance relationships. Assignment workflows manage creation, submission, grading, and feedback. Assessment workflows manage timed attempts, scoring, result storage, and downstream progress updates. Certificate workflows verify completion criteria, generate certificate records and assets, and support verification links or distribution via email.

## Design invariants
No page component should execute direct database logic. Business rules must live in services, not controllers. Database access should use Prisma models and typed queries rather than scattered SQL across the application layer. Validation must occur before service execution, parameterized access patterns must be preserved for any low-level database operations, and error handling should remain explicit and observable. The architecture favors clarity, maintainability, and type-safe evolution over infrastructure complexity.

## Deployment model
The application connects directly to PostgreSQL and Redis using environment-driven connection strings. Prisma migrations are applied as part of release workflows, and Prisma Client is generated from the committed schema. This deployment model keeps the LMS operational footprint simple while preserving scalability at the database, cache, and service-integration layers.
