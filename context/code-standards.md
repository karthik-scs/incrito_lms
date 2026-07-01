# Code Standards and Architectural Guidelines for incrito LMS 

## Introduction
This document defines the coding and architecture rules for incrito LMS . The system uses TypeScript across the stack, a Next.js frontend, a Node.js + Express.js API, Prisma ORM for database access, PostgreSQL as the source of truth, Redis for cache and ephemeral state, and a consistent service-oriented backend structure.

## Engineering mindset
Prefer small, deliberate changes that keep schema, API, UI, and tests aligned. Protect project scope, avoid unnecessary infrastructure complexity, and choose clarity over cleverness. Every new feature should preserve maintainability, type safety, and predictable operational behavior.

## TypeScript rules
Use strict typing, avoid unnecessary any usage, and keep request, response, domain, and integration types explicit. Shared types should be placed where both API and UI can consume them safely. Prisma-generated types may be used to improve accuracy, but application-facing contracts should remain understandable and intentional.

## Architecture rules
Page components must never perform direct database access. API routes handle transport concerns, controllers manage request and response flow, services own business logic, and Prisma handles persistence. Cross-layer shortcuts are not allowed when they bypass validation, authorization, or service ownership.

## Controller pattern
Controllers should be thin and predictable. A controller should parse inputs, rely on validated data, call a service, and return a normalized response body with appropriate HTTP status codes. Errors should be logged and forwarded through the approved error-handling path rather than silently swallowed.

## Routing pattern
Routes should define middleware order clearly, especially for authentication, authorization, and validation. Route files should remain focused on endpoint structure and never absorb business logic. Role-sensitive routes must apply the correct middleware before controller execution.

## Validation pattern
Use Zod schemas for request validation at API boundaries. Validation should happen before service execution so downstream logic can trust input shape. Validation schemas should be colocated logically with the routes or feature modules they protect.

## Database pattern with Prisma
Prisma ORM is the default and preferred data-access mechanism. Schema definitions in Prisma are the canonical application model for tables, relations, enums, indexes, and constraints. All application reads and writes should go through Prisma Client unless there is a narrowly approved infrastructure reason to use lower-level access. Schema changes must be represented in Prisma and shipped through versioned migrations.

## Migration discipline
Never make ad hoc schema edits and leave Prisma out of sync. Update the Prisma schema, generate or create the appropriate migration, review it, and apply it through the normal environment workflow. Local, staging, and production environments must remain aligned on schema history.

## Next.js component pattern
Components should remain focused, typed, and reusable. Fetching should go through approved API utilities rather than embedding database or secret-aware logic in UI code. Role-based rendering belongs in the UI, but permission enforcement must still happen on the server.

## API fetch pattern
Client-side network calls should use the shared API fetch utility so headers, credentials, error parsing, and response conventions remain consistent. Avoid scattered fetch wrappers or inconsistent error handling in page components.

## Data fetching pattern
Use the approved client fetching pattern consistently for cache-aware UI data loads. Server APIs remain the single source of truth for domain logic. Derived UI state should not become a substitute for canonical backend state.

## Redis, email, Zoom, analytics, and storage
Use the shared service patterns for Redis, email delivery, Zoom integration, analytics events, and file storage. External service calls should be isolated behind service modules so credentials, retries, and error handling stay centralized.

## Naming and imports
Follow consistent file and folder naming conventions and use approved import aliases such as `@/` where configured. Keep module names descriptive and aligned with domain boundaries rather than framework trivia.

## Environment variables
Secrets, connection strings, public URLs, and third-party credentials must come from environment variables. The Prisma database URL and related connection settings should be environment-driven and never hard-coded.

## Comments and error handling
Comments should explain why when intent is not obvious, not narrate simple code. Handle errors explicitly, surface actionable messages, and preserve enough logging context for diagnosis without leaking sensitive data.

## Approved dependencies
Use only approved dependencies that fit the project stack and maintenance standards. Prisma is the approved ORM and migration tool for database access. New packages should not be introduced casually when the same result can be achieved with existing project patterns.
