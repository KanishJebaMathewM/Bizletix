<p align="center">
  <img src="./logo.png" alt="Bizletix logo" width="128" height="128" />
</p>

<h1 align="center">Bizletix</h1>

<p align="center">
  <strong>Thoughtful email campaigns, powered by your own Gmail account.</strong><br />
  Create personalized campaigns, send responsibly, and understand engagement without handing your audience data to another marketing platform.
</p>

<p align="center">
  <a href="https://github.com/KanishJebaMathewM/Bizletix"><img src="https://img.shields.io/github/stars/KanishJebaMathewM/Bizletix?style=flat-square" alt="GitHub stars" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=111827" alt="React 18" /></a>
  <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-6-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-8B5CF6?style=flat-square" alt="MIT license" /></a>
</p>

<p align="center">
  <a href="#why-bizletix">Why Bizletix</a> ·
  <a href="#capabilities">Capabilities</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#api-surface">API</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

## Why Bizletix

Bizletix is a self-hostable email campaign and mail-merge workspace for founders, communities, sales teams, and maintainers who need personalized outreach without adopting a full marketing automation suite.

It combines a polished campaign dashboard with a focused API:

- Compose reusable HTML and plain-text templates.
- Import contacts from CSV files and map custom merge fields.
- Personalize every recipient before dispatch.
- Send through an authenticated Gmail or Google Workspace account.
- Pause, resume, cancel, and inspect campaigns.
- Measure delivery outcomes and engagement signals.
- Make unsubscribe and suppression behavior part of the sending pipeline.

Bizletix is **not** an SMTP relay, a bulk-email provider, or a replacement for a permission-based marketing platform. Gmail and Google Workspace sending limits still apply. Only contact people you are permitted to contact, follow applicable laws and provider policies, and configure consent and unsubscribe behavior for your use case.

## Capabilities

### Campaigns

- Five-step campaign flow for details, audience, preview, tracking, and review.
- Draft, queue, send, pause, resume, cancel, and complete lifecycle states.
- Idempotent launch requests to reduce accidental duplicate dispatches.
- Test sends with sample merge data before launch.
- Recipient-level status, failure details, and CSV campaign reports.

### Contacts and personalization

- CSV preview with column mapping and row-level validation.
- Automatic email normalization, duplicate detection, and suppression filtering.
- Contact lists plus arbitrary custom fields such as `company` or `role`.
- Merge tags including `{{first_name}}`, `{{last_name}}`, `{{company}}`, and any imported custom field.
- Formula-injection-safe CSV exports.

### Gmail delivery

- Google OAuth connection for Gmail and Google Workspace accounts.
- Gmail API delivery with RFC 2822 message construction.
- Encrypted access and refresh tokens at rest using AES-256-GCM.
- Configurable send pacing and daily limits.
- Local mock sender for development and end-to-end testing without Google credentials.

### Analytics and recipient controls

- Delivery breakdowns for queued, accepted, failed, and unknown outcomes.
- Open tracking reported as **detected signals**, not guaranteed human reads.
- Click tracking with scheme validation and protected redirect tokens.
- One-click unsubscribe links and owner-level suppression lists.
- Privacy export, account deletion, and audit events.

### Operational safeguards

- Strict TypeScript across the shared package, API, and web app.
- Zod validation at API boundaries.
- Helmet security headers, rate limiting, structured logging, and ownership checks.
- PostgreSQL-backed persistence through Prisma.
- BullMQ/Redis queue support with an in-process development path.

## Architecture

```text
┌──────────────────────────────┐
│ React 18 + Vite              │
│ Tailwind · TanStack Query    │
└──────────────┬───────────────┘
               │ session-cookie API requests
               ▼
┌──────────────────────────────┐       ┌─────────────────────────┐
│ Express API                  │──────▶│ PostgreSQL + Prisma      │
│ validation · auth · tracking │       │ users · contacts · data  │
└──────────────┬───────────────┘       └─────────────────────────┘
               │
               ▼
┌──────────────────────────────┐       ┌─────────────────────────┐
│ Campaign queue               │──────▶│ Gmail API                │
│ BullMQ + Redis, or local     │       │ OAuth · MIME · pacing    │
│ in-process worker            │       └─────────────────────────┘
└──────────────────────────────┘
```

The repository is an npm workspaces monorepo:

```text
apps/
  api/       Express API and campaign worker
  web/       React/Vite dashboard
packages/
  shared/    Shared schemas, types, and merge utilities
prisma/      Prisma schema and seed script
tests/       Unit and integration coverage
```

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL 16 or a compatible PostgreSQL provider
- Redis 7 for a persistent BullMQ deployment (optional for local development)
- Google Cloud project and OAuth client for real Gmail delivery

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/KanishJebaMathewM/Bizletix.git
cd Bizletix
npm install
```

### 2. Start local infrastructure

The included Compose file starts PostgreSQL and Redis with development credentials:

```bash
docker compose up -d
```

To stop the services without deleting their volumes:

```bash
docker compose down
```

### 3. Configure the API

Create a `.env` file at the repository root. There is intentionally no committed environment file; use the following development baseline and replace secrets before sharing or deploying it:

```env
NODE_ENV=development
PORT=4000
LOG_LEVEL=info

APP_BASE_URL=http://localhost:5173
API_BASE_URL=http://localhost:4000
PUBLIC_TRACKING_BASE_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:5173

DATABASE_URL=postgresql://bizletix:bizletix_dev_password@localhost:5432/bizletix?schema=public
REDIS_URL=redis://localhost:6379

SESSION_SECRET=replace-with-at-least-16-random-characters
TOKEN_ENCRYPTION_KEY=replace-with-64-lowercase-hex-characters

# Required only for Google OAuth / real Gmail delivery
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

DEFAULT_MAX_EMAILS_PER_DAY=500
DEFAULT_SEND_DELAY_MS=300
ENABLE_MOCK_SENDER=true
```

Generate production-grade values rather than copying the development values:

```bash
node -e "const crypto=require('crypto'); console.log('SESSION_SECRET='+crypto.randomBytes(32).toString('base64url')); console.log('TOKEN_ENCRYPTION_KEY='+crypto.randomBytes(32).toString('hex'))"
```

`TOKEN_ENCRYPTION_KEY` must be exactly 64 hexadecimal characters. Keep it stable: changing it makes previously encrypted Google tokens undecryptable.

### 4. Prepare the database

For a local database, synchronize the schema and load the development seed:

```bash
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

The seed creates a local demonstration account and sample data. Treat seeded credentials as development-only and inspect [`prisma/seed.ts`](./prisma/seed.ts) before relying on them.

### 5. Run the application

Start the API and web dashboard together:

```bash
npm run dev
```

Run the queue worker separately when you want an independent worker process:

```bash
npm run dev:worker
```

Local URLs:

| Service | URL |
| --- | --- |
| Web dashboard | `http://localhost:5173` |
| API | `http://localhost:4000` |
| Health check | `http://localhost:4000/health` |
| Readiness check | `http://localhost:4000/ready` |

For a no-credentials local walkthrough, keep `ENABLE_MOCK_SENDER=true`. For real delivery, configure Google OAuth and set it to `false`.

## Google OAuth setup

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Configure the OAuth consent screen and add the users who may test the app.
3. Create a Web application OAuth client.
4. Add the local redirect URI: `http://localhost:4000/api/auth/google/callback`
5. Add the production redirect URI after deployment: `https://<your-api-domain>/api/auth/google/callback`
6. Put the client ID, client secret, and matching redirect URI in the API environment.

Bizletix requests Gmail send access for delivery. Google may require verification before allowing an externally published OAuth app to use sensitive scopes broadly.

## Configuration reference

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | No | `development`, `test`, or `production` |
| `PORT` | No | API listening port; defaults to `4000` |
| `LOG_LEVEL` | No | `debug`, `info`, `warn`, or `error` |
| `APP_BASE_URL` | Yes in deployment | Web app URL used for redirects and cookies |
| `API_BASE_URL` | Yes in deployment | Public API URL |
| `PUBLIC_TRACKING_BASE_URL` | Yes in deployment | Public base URL used in tracking and unsubscribe links |
| `CORS_ORIGIN` | Yes in deployment | Allowed web origin |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Recommended | Redis connection for BullMQ; local queue behavior is available without it |
| `SESSION_SECRET` | Yes in production | Session signing and hashing secret; minimum 16 characters |
| `TOKEN_ENCRYPTION_KEY` | Yes in production | 32-byte AES key encoded as 64 hex characters |
| `GOOGLE_CLIENT_ID` | For Gmail | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For Gmail | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | For Gmail | OAuth callback URL |
| `DEFAULT_MAX_EMAILS_PER_DAY` | No | Default per-user daily send limit |
| `DEFAULT_SEND_DELAY_MS` | No | Delay between sends |
| `ENABLE_MOCK_SENDER` | No | Set `true` for local/test delivery without Gmail |

The frontend uses `VITE_API_URL` when it is set. Leave it unset for same-origin `/api` requests, or set it to the public API origin when deploying the web app separately:

```env
VITE_API_URL=https://api.example.com
```

## Production deployment

The repository includes deployment definitions for a split Vercel + Render topology:

- [`render.yaml`](./render.yaml) describes the API service.
- [`apps/web/vercel.json`](./apps/web/vercel.json) configures the Vite frontend.

### API on Render

Create a Render Web Service from this repository. The checked-in configuration builds the shared package, compiles the API, and generates the Prisma client. Set all production secrets in Render's environment settings:

```text
DATABASE_URL
SESSION_SECRET
TOKEN_ENCRYPTION_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
APP_BASE_URL
API_BASE_URL
PUBLIC_TRACKING_BASE_URL
CORS_ORIGIN
REDIS_URL
ENABLE_MOCK_SENDER=false
```

Use a managed PostgreSQL database and Redis instance for production. Do not use the Compose development password or leave mock sending enabled.

### Web on Vercel

Import the repository into Vercel with:

- Root directory: `apps/web`
- Framework preset: Vite
- `VITE_API_URL`: the deployed API origin, without a trailing `/api`

After both services are deployed, set `APP_BASE_URL` and `CORS_ORIGIN` to the exact Vercel origin, then add the matching production OAuth callback in Google Cloud Console. Because production authentication uses secure cross-site cookies, use HTTPS for both services.

### Independent worker

The API process starts a worker for the unified local/development path. For a larger deployment, run the worker as a separate process:

```bash
npm run --workspace=@bizletix/api build
npm run --workspace=@bizletix/api worker
```

Point the worker at the same `DATABASE_URL`, `REDIS_URL`, encryption key, and Google credentials as the API. Use one persistent Redis instance for all API and worker processes.

## API surface

Protected routes require the `Bizletix_session` HTTP-only cookie created by login or Google OAuth. Responses use a `{ success, data }` shape for successful API operations.

### System and authentication

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `GET` | `/ready` | Database readiness check |
| `POST` | `/api/auth/register` | Create a local account |
| `POST` | `/api/auth/login` | Sign in with email and password |
| `GET` | `/api/auth/me` | Read the current session |
| `POST` | `/api/auth/logout` | Revoke the current session |
| `GET` | `/api/auth/google` | Start Google OAuth |
| `GET` | `/api/auth/google/callback` | Complete Google OAuth |

### Contacts, templates, and integrations

| Method | Route | Description |
| --- | --- | --- |
| `GET/POST` | `/api/contacts` | List or create contacts |
| `PATCH/DELETE` | `/api/contacts/:id` | Update or delete a contact |
| `POST` | `/api/contacts/import/preview` | Preview and validate CSV data |
| `POST` | `/api/contacts/import` | Import mapped CSV contacts |
| `GET` | `/api/contacts/export` | Export contacts as CSV |
| `GET/POST` | `/api/contacts/lists` | Manage contact lists |
| `GET/POST` | `/api/templates` | List or create templates |
| `GET` | `/api/integrations/google/status` | Read Gmail connection status |
| `GET` | `/api/integrations/google/connect` | Get a Google connect URL |
| `POST` | `/api/integrations/google/disconnect` | Revoke the Gmail connection |

### Campaigns

| Method | Route | Description |
| --- | --- | --- |
| `GET/POST` | `/api/campaigns` | List or create campaigns |
| `POST` | `/api/campaigns/preview` | Preview personalization |
| `POST` | `/api/campaigns/:id/test` | Send a test message |
| `POST` | `/api/campaigns/:id/launch` | Queue a campaign |
| `POST` | `/api/campaigns/:id/pause` | Pause a campaign |
| `POST` | `/api/campaigns/:id/resume` | Resume a campaign |
| `POST` | `/api/campaigns/:id/cancel` | Cancel a campaign |
| `GET` | `/api/campaigns/:id/analytics` | Read campaign analytics |
| `GET` | `/api/campaigns/:id/recipients` | Read recipient delivery data |
| `GET` | `/api/campaigns/:id/export` | Export a campaign report |

### Public recipient endpoints

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/track/open/:token.gif` | Record a detected open signal |
| `GET` | `/api/track/click/:token` | Record a click and redirect |
| `GET` | `/api/unsubscribe/:token` | Process an unsubscribe |

## Security and privacy notes

- Google access and refresh tokens are encrypted before persistence.
- Session cookies are HTTP-only; production cookies require HTTPS.
- API inputs are validated with shared Zod schemas and ownership checks.
- HTML templates are sanitized before storage/rendering.
- Tracking tokens are hashed and high entropy.
- Click redirects accept only safe `http` and `https` destinations.
- Contact exports neutralize spreadsheet formula prefixes.
- Suppressed addresses are excluded from future campaign sends.
- Open tracking is an image-request signal and cannot prove a human opened an email. Proxies and privacy features can affect the metric.
- Privacy export and account deletion routes are available under the authenticated settings API.

Security is a shared responsibility. Keep dependencies current, use managed secret storage, rotate credentials when needed, configure Google consent correctly, and review your local privacy/legal requirements before sending.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run API and web development servers |
| `npm run dev:api` | Run only the API in watch mode |
| `npm run dev:web` | Run only the Vite frontend |
| `npm run dev:worker` | Run the queue worker in watch mode |
| `npm run build` | Build shared package, API, and web app |
| `npm run typecheck` | Type-check all workspaces |
| `npm run lint` | Lint TypeScript and TSX files |
| `npm test` | Run the Vitest suite |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:push` | Apply the schema to a database |
| `npm run prisma:migrate` | Create/apply a development migration |
| `npm run prisma:seed` | Seed development data |

Before opening a pull request, run:

```bash
npm run typecheck
npm run build
npm test
```

## Sample data

[`sample-contacts.csv`](./sample-contacts.csv) contains safe example rows for trying the import flow. It is synthetic data; replace it with consented contacts for real campaigns.

## Contributing

1. Fork the repository and create a focused branch.
2. Make the smallest complete change that solves the problem.
3. Add or update tests for behavior changes.
4. Run type-checking, build, and tests locally.
5. Open a pull request with context, validation steps, and any deployment implications.

Please do not commit credentials, production exports, `.env` files, or real recipient data. See the repository's issue tracker for planned work and open discussions.

## License

Bizletix is released under the [MIT License](./LICENSE).

<p align="center">
  <strong>Bizletix</strong><br />
  Send thoughtfully. Measure responsibly.
</p>
