# incrito LMS Platform Overview

## Project overview
incrito LMS is a cohort-based learning platform for managing courses, cohorts, live classes, assignments, assessments, progress, certificates, notifications, dashboards, and community interactions. The platform supports multiple roles including students, mentors, cohort managers, and administrators, plus admin-defined custom roles (for example, a support role) for additional permission sets. It is designed for structured online education with clear operational workflows and strong ownership boundaries across the stack.

## Architecture and technologies
The system follows a monolithic full-stack architecture using Next.js for the frontend, Node.js with Express.js for the API layer, TypeScript across the codebase, Prisma ORM for data access, PostgreSQL for persistent storage, and Redis for caching and ephemeral state. External integrations include Zoom for live classes, email services for communication, analytics tracking, PDF generation, and file storage. The deployment model is cloud-hosted and environment-driven rather than dependent on Docker or Kubernetes orchestration.

## Core features and pages
Core platform areas include course discovery, cohort management, enrollment, lesson delivery, live classes, attendance tracking, assignments, assessments, progress views, leaderboards, certificate issuance, notifications, dashboards, community spaces, and admin operations. Pages and APIs are role-aware so each user type sees the right actions and data. The feature set remains centered on the learning lifecycle from onboarding through course completion.

## User flows and processes
Students can register, authenticate, enroll, attend live sessions, submit assignments, complete assessments, track progress, and receive certificates. Mentors and cohort managers can manage courses, schedule live classes, review submissions, publish learning content, and support learner progress. Administrators can manage users, oversee reports, moderate activity, and control operational settings.

## Data architecture and storage
PostgreSQL is the source of truth for all durable LMS data, including users, roles, courses, cohorts, lessons, enrollments, live classes, attendance, assignments, submissions, assessments, attempts, progress, certificates, notifications, and community records. Prisma schema definitions and migrations govern model structure and database evolution. Redis supports caching, token revocation checks, rate limiting, and temporary state, while file storage services handle uploaded assets and generated artifacts.

## Notifications and analytics
The platform supports in-app notifications and email-based alerts for important learning and operational events. Analytics capture product and learning events that help understand enrollment, engagement, completion, and operational usage. These systems are supportive layers around the core product workflows, not substitutes for the source-of-truth application data.

## Zoom integration and live classes
Live teaching workflows use Zoom integrations to create, update, and manage meeting sessions. Meeting metadata is stored in the LMS so classes, attendance, and scheduling remain connected to the wider course experience. Zoom interactions are handled by backend services rather than directly from the client.

## Security and access control
Authentication relies on JWT-based flows with role-aware authorization across API routes and UI entry points, including support for admin-defined custom roles with their own permission sets. Redis can be used to support token revocation checks and session control patterns. Secrets and connection details are managed through environment variables, and core domain rules are enforced on the server side.

## Core user flows
A typical learner journey starts with registration and login, continues through onboarding and enrollment, then moves into lesson consumption, live class attendance, assignments, assessments, progress tracking, and certificate eligibility. A typical teaching journey includes creating course structures, managing cohorts, scheduling live sessions, reviewing learner work, and monitoring outcomes. Administrative flows focus on governance, support, reporting, and platform oversight.

## Out of scope and success criteria
Early releases should stay focused on reliable learning delivery, role-based experiences, and durable academic workflows rather than unnecessary infrastructure complexity. Success means the LMS can manage the full learner lifecycle with consistent APIs, clear services, Prisma-managed schema evolution, secure cloud connectivity, and maintainable long-term architecture.
