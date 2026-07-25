# Workforce Execution Platform MVP

NestJS backend for workforce execution workflows: daily plans, crew assignment, approval lifecycle, notifications, audit logging, and role/scope-based authorization.

## Core capabilities

- JWT authentication with refresh-token rotation
- Role/permission and scope-based access control guards
- Daily plan creation, submission, approval, rejection, and assignment
- Crew and worker assignment flows
- Workflow transition orchestration and history tracking
- Notification delivery abstraction (FCM support when configured)
- Audit log recording for key actions

## Tech stack

- NestJS 11
- Prisma + PostgreSQL
- Redis (idempotency/caching support)
- PNPM

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL
- Redis

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Ensure `DATABASE_URL` points to your running PostgreSQL instance.
4. Run database migrations:

   ```bash
   pnpm run migration:dev
   ```

5. (Optional) Seed sample data:

   ```bash
   pnpm run seed
   ```

6. Start the API:

   ```bash
   pnpm run start:dev
   ```

## API access

- Base URL: `http://localhost:3000/api/v1`
- Swagger docs: `http://localhost:3000/api/docs`

## Useful scripts

- `pnpm run build` — production build
- `pnpm run lint` — ESLint
- `pnpm run test` — unit tests
- `pnpm run test:e2e` — end-to-end tests
- `pnpm run test:cov` — test coverage
- `pnpm run migration:dev` — create/apply development migration
- `pnpm run migration:deploy` — apply migrations in deployment environments
- `pnpm run migration:reset` — reset database (destructive)

## Environment variables

Refer to `.env.example` for the full list. Important values:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `THROTTLE_TTL_SECONDS`
- `THROTTLE_LIMIT`
- `PORT`
- `CORS_ORIGINS`
- `REDIS_URL`

## Notes

- Firebase push notifications are automatically disabled if Firebase credentials are not configured.
- The API enforces request validation, response shaping, throttling, and global auth/authorization guards.
