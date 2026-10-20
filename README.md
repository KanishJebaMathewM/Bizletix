<p align="center">
  <img src="./logo.png" alt="Bizletix Logo" width="128" height="128" />
</p>

# Bizletix

> **"Send thoughtfully. Measure responsibly."**

**Bizletix** is a complete, self-hostable email campaign platform inspired by the core workflow of Yet Another Mail Merge (YAMM). It connects directly to authorized Gmail / Google Workspace accounts using Google OAuth 2.0, allowing you to import recipient lists from spreadsheets, compose personalized messages with dynamic merge tags, preview recipient-level outputs, schedule and dispatch messages asynchronously, track opens and link clicks with high-entropy tokens, enforce universal suppression rules, and analyze delivery performance with real persisted database records.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Features](#2-features)
3. [Architecture](#3-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Repository Structure](#5-repository-structure)
6. [Prerequisites](#6-prerequisites)
7. [Local Installation](#7-local-installation)
8. [Environment Variables](#8-environment-variables)
9. [Database Setup & Migrations](#9-database-setup--migrations)
10. [Redis & Queue Configuration](#10-redis--queue-configuration)
11. [Google Cloud Project Setup](#11-google-cloud-project-setup)
12. [OAuth Consent Screen & Scopes](#12-oauth-consent-screen--scopes)
13. [Gmail API Configuration](#13-gmail-api-configuration)
14. [Starting the Frontend](#14-starting-the-frontend)
15. [Starting the Backend](#15-starting-the-backend)
16. [Starting the Background Worker](#16-starting-the-background-worker)
17. [Running Tests](#17-running-tests)
18. [Configuring the Public Tracking URL](#18-configuring-the-public-tracking-url)
19. [Deploying to Production](#19-deploying-to-production)
20. [Security Hardening](#20-security-hardening)
21. [Privacy & Responsible Tracking Policy](#21-privacy--responsible-tracking-policy)
22. [Known Limitations](#22-known-limitations)
23. [Troubleshooting](#23-troubleshooting)

---

## 1. Product Overview

Bizletix is designed for legitimate outreach—such as contacting open-source contributors, sending community announcements, communicating with opt-in customers, and managing professional correspondence.

Unlike consumer mail-merge scripts that run synchronously inside Google Sheets or browser tabs, Bizletix provides a robust, decoupled server architecture with durable job queues, encrypted token storage, RFC 2822 multipart MIME construction, tracking token hashing, formula-injection-safe CSV imports and exports, and recipient privacy protections.

## 2. Features

- **Google OAuth 2.0 & Gmail API**: Connect personal Gmail or Google Workspace accounts requesting only the minimal `gmail.send` scope. Access and refresh tokens are encrypted at rest with AES-256-GCM.
- **CSV Contact Importer**: Auto-detects columns (`email`, `first_name`, `last_name`, `company`, `github_username`), preserves custom fields as merge variables, validates RFC 5322 compliance, detects file duplicates, and identifies invalid rows with precise error rationales.
- **CSV Formula Injection Safeguard**: Sanitizes all spreadsheet exports by prefixing cells starting with formula-triggering characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with an apostrophe.
- **Template Builder**: Compose subjects, HTML markup, and plain-text alternatives with dynamic merge variables (e.g., `{{first_name}}`, `{{company}}`). Authored HTML is strictly sanitized using `sanitize-html` to prevent cross-site scripting and unauthorized protocol execution.
- **Five-Step Campaign Wizard**:
  1. *Details*: Campaign name, connected sender account, subject line, optional reply-to.
  2. *Audience*: Contact lists selection, real-time eligible recipient counts, automatic exclusion of suppressed and invalid emails.
  3. *Personalization Preview*: Live recipient-level previews with missing variable warnings.
  4. *Tracking & Privacy*: Independent toggles for open tracking, click tracking, and unsubscribe links.
  5. *Review & Send*: Test-send email tool for visual verification, idempotency token generation to prevent duplicate launch submissions.
- **Email-Open Tracking**: Injects a 1×1 transparent GIF with high-entropy SHA-256-hashed tokens and anti-caching HTTP headers. Labeled transparently as an *approximate signal*, explaining that email proxies may preload images.
- **Tracked-Link Clicks**: Rewrites links to secure redirect endpoints, verifies destination schemes (strictly `http`/`https`), rejects `javascript:` / `data:` protocols, protects against open redirects and SSRF.
- **Universal Suppression & One-Click Unsubscribe**: Functional public unsubscribe endpoints with cryptographic tokens. Suppressed contacts are barred from all future dispatches across all lists.
- **Persisted Analytics & Visualizations**: Real database-backed metrics, rate percentages with accurate denominators, delivery breakdowns, and Recharts charts.

---

## 3. Architecture

Bizletix is organized into three monorepo packages following a layered architecture:

```
[ React 18 + Vite Frontend ]
       │  HTTP / REST (Cookies + CSRF / Session Auth)
       ▼
[ Express API Server ]
       │──> Request Validation (Zod)
       │──> Auth & Ownership Boundaries Middleware
       │──> AES-256-GCM Token Encryption Service
       │──> HTML Sanitization (sanitize-html)
       │──> Tracking Token & Link Redirect Engine
       ▼
[ PostgreSQL Database (Prisma ORM) ] <───> [ Redis / BullMQ Job Queue ]
                                                  │
                                                  ▼
                                       [ Background Worker ]
                                                  │
                                                  ▼
                                       [ Gmail API (RFC 2822 MIME) ]
```

---

## 4. Technology Stack

- **Frontend**: React 18, TypeScript (strict mode), Vite, Tailwind CSS, React Router v6, TanStack React Query, React Hook Form, Zod, Lucide React, Recharts.
- **Backend**: Node.js v22+, TypeScript, Express, Prisma ORM, PostgreSQL, Redis, BullMQ, `googleapis`, `sanitize-html`, `csv-parse`, `csv-stringify`, `cookie-parser`, `helmet`.
- **Security & Crypto**: AES-256-GCM token encryption, SHA-256 token hashing, PBKDF2 password derivation, HTTP-only SameSite cookies.
- **Testing**: Vitest, Supertest.
- **Infrastructure**: Docker Compose (`postgres:16-alpine`, `redis:7-alpine`).

---

## 5. Repository Structure

```
├── apps/
│   ├── api/                     # Express REST API & Worker
│   │   ├── src/
│   │   │   ├── config/          # Environment & Crypto (AES-256-GCM)
│   │   │   ├── lib/             # Prisma client & Logger
│   │   │   ├── middleware/      # Auth, rate-limiter, error handler
│   │   │   ├── queue/           # BullMQ campaign queue & worker runner
│   │   │   ├── routes/          # Auth, contacts, templates, campaigns, tracking, unsub
│   │   │   ├── services/        # Business logic services
│   │   │   ├── app.ts           # Express application setup
│   │   │   ├── index.ts         # HTTP Server entrypoint
│   │   │   └── worker.ts        # Standalone Worker entrypoint
│   │   └── package.json
│   └── web/                     # React + Vite Frontend
│       ├── src/
│       │   ├── api/             # Typed API client
│       │   ├── components/      # UI components & AppLayout shell
│       │   ├── context/         # AuthContext
│       │   ├── pages/           # Dashboard, Campaigns, Contacts, Templates, Settings
│       │   ├── App.tsx          # Router configuration
│       │   └── main.tsx         # React root
│       └── package.json
├── packages/
│   └── shared/                  # Shared types, Zod schemas, & pure utilities
│       ├── src/
│       │   ├── schemas.ts       # Request validation schemas
│       │   ├── types.ts         # Domain types & interfaces
│       │   └── utils.ts         # Merge tags, CSV escaping, email normalization
│       └── package.json
├── prisma/
│   ├── schema.prisma            # PostgreSQL schema with relations & indexes
│   └── seed.ts                  # Sample development seed data
├── tests/
│   ├── unit.test.ts             # Crypto, CSV parsing, templates, error classification
│   └── integration.test.ts      # API routes, tracking endpoints, auth, mock sender
├── docker-compose.yml           # PostgreSQL & Redis containers
├── .env.example                 # Documented environment variables
├── sample-contacts.csv          # Sample CSV for testing import
├── package.json                 # Monorepo workspaces definition
├── tsconfig.base.json           # Strict TypeScript configuration
└── vitest.config.ts             # Vitest test runner configuration
```

---

## 6. Prerequisites

- **Node.js**: v20 or v22+
- **npm**: v10+
- **Docker & Docker Compose**: (Optional, for local PostgreSQL and Redis)
- **Google Cloud Console account**: (For Gmail sending in live production)

---

## 7. Local Installation

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd Mass-Mail-Sender
   ```

2. **Install all dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

4. **Generate Prisma client and build packages**:
   ```bash
   npm run prisma:generate
   npm run build
   ```

---

## 8. Environment Variables

Create a `.env` file in the project root:

```env
# Application Ports & URLs
PORT=4000
NODE_ENV=development
LOG_LEVEL=info
APP_BASE_URL=http://localhost:5173
API_BASE_URL=http://localhost:4000
PUBLIC_TRACKING_BASE_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:5173

# Database & Cache
DATABASE_URL=postgresql://bizletix:bizletix_dev_password@localhost:5432/bizletix?schema=public
REDIS_URL=redis://localhost:6379

# Cryptography & Sessions
# 32+ character random secret
SESSION_SECRET=dev-bizletix-session-secret-change-in-production-min32chars
# 32-byte hexadecimal key (64 hex characters) for AES-256-GCM token encryption
TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Google OAuth 2.0 Credentials (From Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

# Sending Defaults
DEFAULT_MAX_EMAILS_PER_DAY=500
DEFAULT_SEND_DELAY_MS=300
ENABLE_MOCK_SENDER=false
```

---

## 9. Database Setup & Migrations

To spin up local PostgreSQL and Redis:

```bash
docker compose up -d
```

Apply database migrations:

```bash
npm run prisma:push
```

Seed initial development data (creates demo account `demo@bizletix.local` with password `demo123456`, sample contact lists, contacts, and email templates):

```bash
npm run prisma:seed
```

---

## 10. Redis & Queue Configuration

Bizletix uses **BullMQ** with Redis for durable background queue processing:
- Each campaign launch creates an atomic background job.
- Rate limiting is enforced with configurable delays between messages (`DEFAULT_SEND_DELAY_MS`).
- The worker verifies campaign cancellation or pause states in real-time before each individual dispatch.
- **Offline / Test Resiliency**: If Redis is not running locally, the queue system automatically falls back to an asynchronous in-memory queue runner without throwing unhandled connection errors.

---

## 11. Google Cloud Project Setup

1. Open [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project named **Bizletix**.
3. Navigate to **APIs & Services > Library** and search for **Gmail API**. Click **Enable**.
4. Navigate to **APIs & Services > Credentials** and click **Create Credentials > OAuth client ID**.
5. Select Application type: **Web application**.
6. Under **Authorized redirect URIs**, add:
   `http://localhost:4000/api/auth/google/callback` (or your production public HTTPS URL).
7. Copy the generated **Client ID** and **Client Secret** into your `.env` file.

---

## 12. OAuth Consent Screen & Scopes

Bizletix adheres to the principle of least privilege:

| Scope | Purpose |
|---|---|
| `https://www.googleapis.com/auth/gmail.send` | Dispatches emails on behalf of the authorized user. Does **NOT** allow reading or deleting emails. |
| `https://www.googleapis.com/auth/userinfo.email` | Retrieves the authorized Gmail address to associate with the sender account. |
| `https://www.googleapis.com/auth/userinfo.profile` | Obtains basic profile metadata for the sender. |

> **Note**: For Google Workspace domains, configure the app as **Internal** to avoid verification screens. For personal Gmail accounts, add your account email to the **Test Users** list under the OAuth Consent Screen tab while in Development mode.

---

## 13. Gmail API Configuration

- **Daily Quotas**: Personal Gmail accounts have a sending limit of 500 emails/day; Google Workspace accounts allow up to 2,000 emails/day.
- **Rate Pacing**: Bizletix spaces email transmissions using `DEFAULT_SEND_DELAY_MS` (default 300ms) to respect Gmail rate limits.
- **Delivery Ambiguity**: Gmail API send acceptance (`accepted_by_provider`) confirms Gmail accepted the message for delivery; it is not a proof of final delivery to the recipient's inbox. Bizletix categorizes this accurately.

---

## 14. Starting the Frontend

To start the Vite development server on `http://localhost:5173`:

```bash
npm run dev:web
```

---

## 15. Starting the Backend

To start the Express API on `http://localhost:4000`:

```bash
npm run dev:api
```

---

## 16. Starting the Background Worker

During development, the API process automatically boots the worker in the background. To run the worker as a dedicated standalone microservice in production:

```bash
npm run dev:worker
```

---

## 17. Running Tests

Bizletix includes unit tests and integration tests covering utilities, token encryption, CSV parsing, HTML sanitization, API endpoints, and queue simulation:

```bash
npm test
```

All 25 tests execute using Vitest with 100% pass rate.

---

## 18. Configuring the Public Tracking URL

For tracking pixels and tracked-link redirects to work when emails are opened in external email clients (e.g., Gmail on mobile, Apple Mail), set `PUBLIC_TRACKING_BASE_URL` to a publicly reachable HTTPS domain:

```env
PUBLIC_TRACKING_BASE_URL=https://campaigns.yourdomain.com
```

In local development, email clients on your computer cannot fetch `http://localhost:4000` unless an HTTPS tunnel (such as Cloudflare Tunnel or ngrok) is configured.

---

## 19. Deploying to Production

### Production Checklist

1. **Database**: Managed PostgreSQL instance (e.g. AWS RDS, DigitalOcean, Supabase DB).
2. **Redis**: Managed Redis instance with persistence.
3. **Secrets**:
   - Generate a cryptographically secure 64-character hex key for `TOKEN_ENCRYPTION_KEY`:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Generate a 64-character random string for `SESSION_SECRET`.
4. **Google OAuth**: Add your production domain callback URL to Google Cloud Console (e.g. `https://api.yourdomain.com/api/auth/google/callback`).
5. **Reverse Proxy / TLS**: Terminate HTTPS with Nginx, Caddy, or Cloudflare.
6. **Container Deployments**: Run separate containers for `web`, `api`, and `worker`.

---

## 20. Security Hardening

- **AES-256-GCM Token Encryption**: Google access and refresh tokens are encrypted at rest with authenticated encryption.
- **SHA-256 Tracking Token Hashes**: Public URLs contain high-entropy tokens, but only cryptographic hashes are stored in the database.
- **CSRF Defense**: OAuth exchanges validate random state parameters.
- **XSS & Injection Defense**:
  - HTML content is sanitized using `sanitize-html`.
  - All CSV exports are protected against spreadsheet formula injection (`'=1+1'` -> `''=1+1'`).
  - Destination links for click redirects are validated against a strict protocol allowlist (`http`, `https`).
- **Owner Isolation**: All database queries enforce strict user ownership boundaries (`ownerId`).

---

## 21. Privacy & Responsible Tracking Policy

- **No Covert Fingerprinting**: Bizletix does not store full IP addresses or fingerprint devices.
- **Honest Signal Representation**: Email opens are explicitly labeled as **Detected open events**, not proof that a human read the message. The interface explains that proxy services and privacy protection tools cache and load images automatically.
- **Universal Suppression Enforcement**: Contacts who unsubscribe or are manually suppressed are barred from all future campaigns across all lists.
- **Data Export & Deletion**: Users can export their full data in JSON format or delete their entire account and associated records with one click.

---

## 22. Known Limitations

- **Gmail API Delivery Visibility**: The Gmail API does not provide asynchronous webhooks for end-user inbox placement or downstream spam filtering. Bizletix records `accepted_by_provider` when Gmail accepts the send request and labels final inbox delivery as unknown unless explicit failure responses are returned.
- **Tracking Pixels on Image-Blocking Clients**: If a recipient's email client blocks remote images, open events cannot be detected.
- **Proxy Preloading**: Privacy proxies (e.g., Apple Mail Privacy Protection) may load tracking pixels on Apple servers before a human opens the message.

---

## 23. Troubleshooting

- **Error: "Google OAuth credentials are not configured"**:
  Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`.
- **Database Connection Failure**:
  Verify PostgreSQL is running (`docker compose ps` or local service) and matches `DATABASE_URL`.
- **Test Send Not Delivering**:
  Verify your Gmail account is connected under `/settings/integrations`. Alternatively, set `ENABLE_MOCK_SENDER=true` in `.env` to verify the campaign pipeline without dispatching real emails.

---

*Built with Bizletix — Send thoughtfully. Measure responsibly.*
