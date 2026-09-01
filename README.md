# Project Partner

## Overview

Project Partner is a web application that helps students find partners for course projects and labs. Version 1 supports the complete workflow from student onboarding and partner-request posts through applications, team formation, comments, notifications, public profiles, and reporting.

## V1 Features

- Authenticated student accounts and profile onboarding
- Department, current-course, and skill selection
- Project-partner and lab-partner posts
- Project browsing, searching, filtering, and pagination
- Applications with owner accept/reject management
- Team membership for accepted applicants
- Project comments and in-application notifications
- Public student profiles and safety reporting
- Rate limiting, bounded database queries, and production security headers

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Supabase with PostgreSQL
- Supabase Auth, Row Level Security, and database RPCs
- npm

## Requirements

- Node.js 20.9.0 or newer
- npm
- Supabase CLI only when managing a local database or applying migrations

The Next.js application can run without a local Supabase CLI installation when it is configured to use an existing Supabase project.

## Setup

```bash
git clone https://github.com/Chowx30/project-partner.git
cd project-partner
npm install
cp .env.example .env.local
```

Configure the variables in `.env.local` for your environment. Do not commit that file.

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `APP_ORIGIN` | Canonical application origin used by server-side authentication flows. Use `http://localhost:3000` locally and the deployed HTTPS origin in production. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public URL of the configured Supabase project. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public publishable key for the configured Supabase project. Do not use a service-role key here. |

Use `.env.example` as the template. Production values must be configured through the selected hosting provider.

## Database

Database schema changes are versioned in `supabase/migrations/`. The initial course and skill catalogs are also inserted through versioned migrations rather than a separate seed file.

Use the Supabase CLI when managing migrations. For example:

```bash
supabase db push
```

This command modifies the linked Supabase database. Confirm the intended project and review pending migrations before running it. Do not edit production tables manually.

## Development

Start the development server:

```bash
npm run dev
```

The application is available at [http://localhost:3000](http://localhost:3000) by default.

## Quality Checks

```bash
npm run lint
npm run build
```

`npm run build` is the normal production build validation command.

## Production Notes

- `APP_ORIGIN` must be the deployed HTTPS application origin.
- Configure all required environment variables at the hosting provider.
- Apply database migrations separately from the application deployment.
- A strict nonce-based Content Security Policy and other browser security headers are enabled in production.
- Enable HSTS only after the final HTTPS hostname and certificate behavior have been validated.

## V1 Limitations

- Realtime chat and private messaging are not included.
- Notifications are in-application only; email and push delivery are not included.
- Authentication requires the institutional email format, but mailbox ownership confirmation is not currently enabled.

## Security

The application uses Supabase Row Level Security, server-side and database-RPC authorization, rate limits for high-value creation actions, bounded queries with pagination, and production browser security headers including a nonce-based Content Security Policy. These controls should be reviewed alongside the application and database migrations before deployment.
