<p align="center">
  <img src="./logo.png" alt="Bizletix Logo" width="140" height="140" />
</p>

<h1 align="center">Bizletix</h1>

<p align="center">
  <strong>The Modern, Self-Hostable Email Campaign & Mail Merge Platform</strong><br>
  <em>"Send thoughtfully. Measure responsibly."</em>
</p>

<p align="center">
  <a href="https://github.com/KanishJebaMathewM/Bizletix/actions"><img src="https://img.shields.io/badge/Build-Passing-emerald?style=flat-square&logo=githubactions&logoColor=white" alt="Build Status"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 18"></a>
  <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express-4.21-000000?style=flat-square&logo=express&logoColor=white" alt="Express"></a>
  <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma"></a>
  <a href="https://neon.tech/"><img src="https://img.shields.io/badge/PostgreSQL-Neon-00E599?style=flat-square&logo=postgresql&logoColor=black" alt="Neon Postgres"></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/TailwindCSS-v3-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" alt="Tailwind"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-purple?style=flat-square" alt="License MIT"></a>
</p>

<p align="center">
  <a href="#-quick-start-local-development">Quick Start</a> •
  <a href="#-key-features">Features</a> •
  <a href="#-production-deployment-vercel--render">Deploy to Vercel & Render</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-security--privacy-manifesto">Security & Privacy</a> •
  <a href="#-api-reference">API Reference</a>
</p>

---

## 💡 What is Bizletix?

**Bizletix** is a full-featured, self-hostable email campaign and mail merge platform inspired by Yet Another Mail Merge (YAMM). It enables professionals, founders, open-source maintainers, and community leaders to compose personalized, multi-recipient outreach campaigns dispatched directly through their own authenticated **Gmail / Google Workspace** accounts.

Unlike spreadsheets scripts or clunky browser extensions that freeze your tabs, Bizletix is a modern **full-stack decoupled application** built with React 18, Express, Prisma ORM, PostgreSQL (Neon), BullMQ background queues, and authenticated token encryption.

### Why Bizletix over Traditional Tools?

| Capability | Bizletix | YAMM / Sheet Addons | Mailchimp / SendGrid |
| :--- | :---: | :---: | :---: |
| **Self-Hostable & 100% Free** | ✅ Open-Source (MIT) | ❌ Paid Subscription | ❌ High per-contact fees |
| **Sends Through Personal Gmail** | ✅ Native Google OAuth | ✅ Yes | ❌ Requires custom domain DNS |
| **Decoupled Job Queue** | ✅ Background workers | ❌ Browser/Sheet limits | ✅ Cloud queue |
| **Token Encryption at Rest** | ✅ AES-256-GCM | ❌ Plain text / Sheets | ✅ Proprietary |
| **CSV Formula Injection Safe** | ✅ Sanitized outputs | ❌ Vulnerable | ⚠️ Partial |
| **Honest Signal Analytics** | ✅ Distinguishes open proxy signals | ❌ Inflates open rates | ❌ Aggressive tracking |
| **Zero Vendor Lock-In** | ✅ Export contacts & campaigns anytime | ❌ Locked to Google Sheets | ❌ Difficult migrations |

---

## ⚡ Key Features

- 📨 **Native Gmail API Integration**: Connect your personal Gmail or Google Workspace with least-privilege OAuth scopes (`gmail.send`, `userinfo.email`, `userinfo.profile`). Tokens are encrypted at rest with AES-256-GCM.
- 👥 **Smart CSV Contact Manager**: Auto-detects columns (`email`, `first_name`, `last_name`, `company`, etc.), stores unlimited custom fields, flags syntax errors with descriptive feedback, and deduplicates automatically.
- 🛡️ **Formula Injection Defense**: Automatically neutralizes CSV injection attacks (`=`, `+`, `-`, `@`, `\t`, `\r`) during export.
- 📝 **Rich Template Composer**: Compose HTML and plain-text templates with live merge tag chips (e.g. `{{first_name}}`, `{{company}}`). All input is sanitized with `sanitize-html` to prevent XSS.
- 🎯 **5-Step Campaign Wizard**:
  1. **Details**: Campaign name, sender email, custom reply-to.
  2. **Audience**: Select lists with instant suppression filtering.
  3. **Preview**: Recipient-by-recipient preview with fallback validation.
  4. **Tracking & Privacy**: Toggle open tracking, click tracking, and unsubscribe links independently.
  5. **Review & Test**: Dispatch a test email and launch with idempotency keys.
- 🔍 **Responsible Open & Click Tracking**:
  - High-entropy SHA-256 token hashing for tracking pixels.
  - Transparent labeling: Open events are reported as *detected signals* (accounting for Apple Mail Privacy Protection and image preloading proxies).
  - Open-redirect protection: strictly allowlists `http` and `https` schemes.
- 🚫 **Universal Suppression Engine**: One-click recipient unsubscribe links with automatic global suppression across all current and future campaigns.
- 📊 **Real-Time Analytics Dashboard**: Visual charts powered by Recharts with delivery breakdowns, click maps, and exportable recipient logs.
- 🧪 **Offline & Mock Mode**: Run the full campaign pipeline without Google credentials using the built-in mock sender (`ENABLE_MOCK_SENDER=true`).

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       React 18 + Vite                       │
│           (Tailwind CSS, TanStack Query, Lucide)            │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (SameSite Cookie Auth)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Express API Server                      │
│  ├── Helmet Security & CORS Allowlist                       │
│  ├── Zod Request Validation & Ownership Boundaries          │
│  ├── AES-256-GCM Token Encryption Engine                    │
│  ├── Tracking Token & Redirect Dispatcher                   │
│  └── express-async-errors Pipeline Protection               │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Neon PostgreSQL DB      │ │   BullMQ / Redis Runner    │
│  (Prisma ORM, 13 Relational  │ │  (Persistent Queue with    │
│       Models & Indexes)      │ │   In-Memory Auto-Fallback) │
└──────────────────────────────┘ └─────────────┬──────────────┘
                                               │
                                               ▼
                                 ┌────────────────────────────┐
                                 │      Gmail API Sender      │
                                 │   (RFC 2822 MIME Builder   │
                                 │    & Rate-Pacing Dispatch) │
                                 └────────────────────────────┘
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: `v20` or `v22+`
- **npm**: `v10+`
- **Git**

### 2. Clone and Install
```bash
git clone https://github.com/KanishJebaMathewM/Bizletix.git
cd Bizletix
npm install
```

### 3. Configure Environment Variables
Create your `.env` file from the example:
```bash
cp .env.example .env
```

Your `.env` should have:
```env
PORT=4000
NODE_ENV=development
APP_BASE_URL=http://localhost:5173
API_BASE_URL=http://localhost:4000
PUBLIC_TRACKING_BASE_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:5173

# Database (Neon PostgreSQL)
DATABASE_URL="your-neon-postgres-url?sslmode=require"
REDIS_URL=none

# Security Keys (Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET="dev-Bizletix-session-secret-min16chars-for-dev"
TOKEN_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

# Google OAuth Credentials (Optional for local test mode)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:4000/api/auth/google/callback"

ENABLE_MOCK_SENDER=false
```

### 4. Push Schema & Seed Database
```bash
npm run prisma:push
npm run prisma:seed
```

### 5. Launch the Application
Start both the API and Web frontend concurrently:
```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:4000](http://localhost:4000)
- **Demo Credentials**: `demo@bizletix.local` / `demo123456`

---

## ☁️ Production Deployment (Vercel + Render)

Bizletix is pre-configured with `render.yaml` for the backend and `apps/web/vercel.json` for the frontend.

### Part 1: Deploy Backend to [Render.com](https://render.com)
1. In Render, click **New + > Web Service** and select `KanishJebaMathewM/Bizletix`.
2. Configure settings:
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run --workspace=@bizletix/shared build && npm run --workspace=@bizletix/api build && npx prisma generate
     ```
   - **Start Command**:
     ```bash
     node apps/api/dist/index.js
     ```
3. Set the Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `DATABASE_URL`: `your-neon-connection-string?sslmode=require`
   - `SESSION_SECRET`: *Your 32+ char secret*
   - `TOKEN_ENCRYPTION_KEY`: *Your 64-char hex key*
   - `GOOGLE_CLIENT_ID`: *Your Google Client ID*
   - `GOOGLE_CLIENT_SECRET`: *Your Google Client Secret*
   - `API_BASE_URL`: `https://bizletix-api.onrender.com`
   - `PUBLIC_TRACKING_BASE_URL`: `https://bizletix-api.onrender.com`
   - `GOOGLE_REDIRECT_URI`: `https://bizletix-api.onrender.com/api/auth/google/callback`
   - `REDIS_URL`: `none`
   - `ENABLE_MOCK_SENDER`: `false`
4. Deploy! Render will give you your backend URL (e.g. `https://bizletix-api.onrender.com`).

---

### Part 2: Deploy Frontend to [Vercel](https://vercel.com)
1. In Vercel, click **Add New... > Project** and import `KanishJebaMathewM/Bizletix`.
2. Configure settings:
   - **Root Directory**: `apps/web`
   - **Framework Preset**: `Vite`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://bizletix-api.onrender.com` (your Render URL)
4. Deploy! Vercel will give you your frontend URL (e.g. `https://bizletix.vercel.app`).

---

### Part 3: Connect Both & Update Google OAuth
1. **In Render Dashboard**: Add two env vars to your backend service:
   - `APP_BASE_URL`: `https://bizletix.vercel.app`
   - `CORS_ORIGIN`: `https://bizletix.vercel.app`
2. **In Google Cloud Console**:
   - Add `https://bizletix.vercel.app` to **Authorized JavaScript origins**.
   - Add `https://bizletix-api.onrender.com/api/auth/google/callback` to **Authorized redirect URIs**.

---

## 🔒 Security & Privacy Manifesto

Bizletix was architected around privacy-by-design principles:

### 1. Minimal Scopes Only
We only request `gmail.send`. Bizletix **never** reads, searches, or modifies your inbox.

### 2. Token Encryption at Rest
All Google OAuth refresh and access tokens are encrypted with authenticated **AES-256-GCM** before being saved to PostgreSQL. Keys are never logged or returned over the API.

### 3. No Covert Fingerprinting
Tracking pixels do not store IP addresses or perform hardware fingerprinting. They only measure whether an image request was dispatched.

### 4. Zero Data Harvesting
Contact lists belong exclusively to the user. Contacts are never shared, analyzed, or enriched using third-party scrapers.

### 5. Universal Opt-Out
When a recipient clicks unsubscribe, Bizletix records their email in a global suppression table. Even if the recipient is re-imported in a future CSV, the dispatcher will permanently refuse to email them.

---

## 📡 API Reference

All protected endpoints require session cookies or `Authorization: Bearer <token>`.

### Authentication
- `POST /api/auth/register` — Register a new local account
- `POST /api/auth/login` — Sign in with email and password
- `GET /api/auth/me` — Retrieve active authenticated user session
- `POST /api/auth/logout` — Terminate session and clear cookies
- `GET /api/auth/google` — Initialize Google OAuth 2.0 flow
- `GET /api/auth/google/callback` — Google OAuth code exchange

### Campaigns
- `GET /api/campaigns` — List user campaigns with pagination
- `POST /api/campaigns` — Create a new draft campaign
- `GET /api/campaigns/:id` — Get campaign details and recipient breakdown
- `POST /api/campaigns/:id/test-send` — Send a test email to a single recipient
- `POST /api/campaigns/:id/launch` — Launch campaign into the dispatch queue
- `POST /api/campaigns/:id/pause` — Pause an ongoing campaign
- `POST /api/campaigns/:id/resume` — Resume a paused campaign
- `GET /api/campaigns/:id/analytics` — Get campaign metrics and Recharts time-series

### Contacts & Templates
- `GET /api/contacts` — Search and filter contacts
- `POST /api/contacts/import` — Upload and parse CSV recipient files
- `GET /api/contacts/export` — Export contacts with formula-injection sanitization
- `GET /api/templates` — List email templates
- `POST /api/templates` — Create sanitized HTML & plaintext template

### Tracking & Public Endpoints
- `GET /api/track/open/:token.gif` — 1x1 anti-caching open tracking pixel
- `GET /api/track/click/:token` — Secure link redirection endpoint
- `GET /api/unsubscribe/:token` — One-click unsubscribe handler
- `GET /health` — API health check and version metadata

---

## 🧪 Testing

Bizletix includes 25 unit and integration tests covering:
- RFC email normalization & validation
- CSV escaping and formula injection prevention
- Merge variable template substitution
- Cryptographic encryption (AES-256-GCM & scrypt)
- Unsubscribe & open pixel anti-caching headers
- Google OAuth redirection
- Mock provider email dispatches

Run the automated test suite:
```bash
npm test
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/my-feature`.
3. Commit your changes: `git commit -m 'feat: add my feature'`.
4. Ensure all tests pass: `npm test && npm run build`.
5. Push to the branch: `git push origin feat/my-feature`.
6. Open a Pull Request.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

<p align="center">
  <strong>Bizletix</strong> — Send thoughtfully. Measure responsibly.
</p>
