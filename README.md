# HTEIM School of Ministry
**Version:** `v1.0.0`  
**License:** Proprietary — Heaven Touching Earth International Ministries (HTEIM)  
**System Status:** Production Ready | PWA & Capacitor Android Supported

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Authentication](#authentication)
- [Security & Cryptography Review](#security--cryptography-review)
- [Database & Storage](#database--storage)
- [Roles & Permissions](#roles--permissions)
- [Development Setup](#development-setup)
- [How to Deploy from Zero](#how-to-deploy-from-zero)
- [Production Deployment](#production-deployment)
  - [Cloud Run / Docker Container](#cloud-run--docker-container)
  - [Vercel Deployment](#vercel-deployment)
- [Environment Variables](#environment-variables)
- [Progressive Web App (PWA)](#progressive-web-app-pwa)
- [Android Integration (Capacitor 8)](#android-integration-capacitor-8)
- [Testing](#testing)
- [Backup / Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

---

## Overview

The **HTEIM School of Ministry Portal** is a full-stack educational management platform designed for Heaven Touching Earth International Ministries. It unifies academic tracking across 6 core curriculum modules, student enrollment, daily attendance recording, assignment submission & automated AI evaluation, financial balance management with receipt generation, library handouts, and live broadcast integration into a unified workspace.

Built with desktop-first precision and mobile-native responsiveness, the portal operates on modern web browsers, as an installable Progressive Web App (PWA), and as a native Android app built with Capacitor 8.

---

## Features

### 🎓 Academic & Student Management
- **Curriculum Modules**: Structured course materials, video lectures, downloadable PDF handouts, and quizzes for all 6 core ministry modules.
- **Digital Library & Media Center**: Comprehensive repository for syllabus handouts, video lectures (HTML5, YouTube, Vimeo), sermon audio, and scripture-linked study guides (see [Library Implementation Checklist](LIBRARY_IMPLEMENTATION_CHECKLIST.md)).
- **Attendance Engine**: Daily attendance recording, attendance rate calculations, 75% satisfactory threshold enforcement, and at-risk warning alerts (students < 75%).
- **Student 360° Profile**: Comprehensive view of individual student GPA, attendance metrics, payment logs, submitted homework, and activity audit timeline.
- **Assignment & Quiz Suite**: Online assignment submission, teacher marking interface, AI-assisted essay evaluation via Google Gemini, and automated quiz scoring.

### 💰 Tuition & Financial Operations
- **Financial Profile & Statements**: Real-time tuition balance tracking, installment plan management, scholarship sponsoring, and financial adjustments.
- **Receipt & Invoice Generator**: Instant downloadable/printable official receipts formatted for TT$ (Trinidad & Tobago Dollars) or USD currency.
- **Financial Audit & Reconciliation**: Full transaction ledger with cashier attribution, payment reminders, and summary reports.

### 🔒 Administration & Security
- **System Health & Readiness Center**: Real-time telemetry monitoring network latency, database persistence, session security, storage usage, and component readiness scores.
- **Institutional Audit Log**: Immutable log recording user actions, timestamped events, role changes, grade edits, and failed authentication attempts with role/module filters.
- **Dual Data Synchronization**: Dual-source merge engine (Google Sheets CSV feed + Cloud PostgreSQL/Firestore) with interactive line-by-line conflict resolution.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions isolating Student, Teacher/Lecturer, Finance Officer, and Administrator views.

---

## Architecture

The portal utilizes a hybrid full-stack client-server architecture powered by React 19, Express 4, and Vite 6:

```
                  ┌───────────────────────────────────────────┐
                  │       Client Browser / PWA / Android      │
                  │ (React 19 + Tailwind v4 + Motion + Lucide)│
                  └─────────────────────┬─────────────────────┘
                                        │
                             HTTPS / REST APIs / Realtime
                                        │
                  ┌─────────────────────▼─────────────────────┐
                  │           Express Node.js Backend         │
                  │   - Static Asset Middleware (Vite SPA)    │
                  │   - Server-Side Gemini AI Evaluation Proxy│
                  │   - Cloud Run Ingress & Health Handlers   │
                  │   - Session Security & Throttling Guards   │
                  └──────────┬──────────────────────┬─────────┘
                             │                      │
       ┌─────────────────────▼───────┐    ┌─────────▼──────────────────┐
       │   Supabase Cloud PostgreSQL  │    │ Firebase Auth & Firestore  │
       │ (Primary Relational Storage)│    │   (OAuth & Real-Time Sync) │
       └─────────────────────────────┘    └────────────────────────────┘
```

---

## Technology Stack

- **Frontend Core**: React 19 (`react: ^19.0.1`), TypeScript 5 (`typescript: ~5.8.2`), Vite 6 (`vite: ^6.2.3`)
- **Styling & UI**: Tailwind CSS v4 (`tailwindcss: ^4.1.14`), Lucide React Icons (`lucide-react: ^0.546.0`), Framer Motion (`motion: ^12.23.24`)
- **Data Visualization**: Recharts (`recharts: ^3.10.1`)
- **Backend / Middleware**: Express 4 (`express: ^4.21.2`), `tsx` (Dev Execution), `esbuild` (Production ESM/CJS compilation)
- **Database & Storage**: Supabase (`@supabase/supabase-js: ^2.49.1`), Firebase (`firebase: ^12.16.0`), Browser `localStorage` (transient buffer)
- **AI Processing**: Google Gemini API (`@google/genai: ^2.4.0` TypeScript SDK)
- **Mobile Runtime**: Capacitor 8 (`@capacitor/core: ^8.5.2`, `@capacitor/android: ^8.5.2`)
- **PWA Runtime**: Vite PWA Plugin (`vite-plugin-pwa: ^1.3.0`), Service Worker static cache manifest
- **Testing & Quality**: Vitest (`vitest: ^4.1.10`), React Testing Library, ESLint 10 (`eslint: ^10.10.0`)

---

## Authentication

The portal supports multi-modal authentication flows:

1. **Client-Side Hash Pre-Processing & Backend Auth**: Passwords undergo client-side SHA-256 pre-hashing with domain-specific salting prior to transit over HTTPS, preventing raw plaintext credentials from reaching logs or intermediaries.
2. **Supabase / Firebase Managed Auth**: Managed authentication engines handle production password storage using salted **bcrypt** / **Argon2id** password key derivation functions (KDF) at the database tier.
3. **WebAuthn Biometric Authentication**: Fingerprint / Face ID unlock linked directly to authenticated sessions via the browser's native `navigator.credentials` API.
4. **Account Lockout & Throttling**: Client-side & server-side rate-limiting (`express-rate-limit`) triggers an automated 2-minute lockout after 5 consecutive failed login attempts on an identifier.

---

## Security & Cryptography Review

> [!IMPORTANT]
> **Password Cryptography Architecture**:
> - Client-side hashing (`hashPassword` in `securityHelper.ts`) uses Web Crypto `crypto.subtle.digest('SHA-256')` with salt (`hteim_ministry_salt_2026`) as a client-side pre-processing step to sanitize credentials prior to wire transport.
> - Server-side / Database persistence relies on Supabase Auth / PostgreSQL `pgcrypto` or Firebase Auth, which execute computationally expensive, GPU-resistant Key Derivation Functions (**Argon2id** / **bcrypt** / **PBKDF2**) with appropriate cost factors.
> - Developers extending authentication logic must **never** store bare SHA-256 hashes as long-term password records in a database without KDF key stretching (e.g. Argon2id or bcrypt).

### Security Measures:
- **Server-Side API Proxying**: Gemini API keys and cloud service role keys are restricted to backend environment variables (`server.ts` & server routes) and never exposed to the client bundle.
- **XSS & HTML Sanitization**: Input fields pass through HTML entity escaping and script-tag stripping via `sanitizeInput()` and `sanitizeHtml()`.
- **Session Timeout**: Automatic 30-minute idle session timeout with a visual warning modal before session revocation.

---

## Database & Storage

The platform employs a dual-tier persistence model:

1. **Supabase Cloud PostgreSQL**: Primary relational database handling student records, course enrollments, grade sheets, and tuition transaction ledgers.
2. **Firebase Firestore**: Real-time document store for active announcement broadcasts, messaging, and live notifications.
3. **Browser `localStorage` Buffer**: Client-side storage used for non-sensitive local user preferences and transient PWA offline draft buffer, which auto-flushes to cloud endpoints upon internet reconnection.

---

## Roles & Permissions

| Role | Access Level | Description & Capabilities |
|------|--------------|----------------------------|
| `super_admin` / `admin` | Full Management | System settings, student 360 profile edits, attendance overrides, grade publishing, user management, audit log inspection, backup export/restore. |
| `teacher` / `lecturer` | Academic Management | Course content editing, assignment creation, student grading, daily attendance check-in, batch announcements. |
| `finance` | Financial Management | Payment transaction recording, tuition balance adjustments, receipt generation, financial audit trail. |
| `student` | Student View | Personal course view, homework submission, self-attendance tracking, financial balance review, library resource access. |

---

## Development Setup

### Prerequisites
- **Node.js**: `>= 18.0.0` (Recommended: Node 20 LTS)
- **npm**: `>= 9.0.0`
- **Git**: Installed on local machine

### Standard Developer Workflow

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kpierre24/School-of-Ministry-2026.git
   cd School-of-Ministry-2026
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` to supply your Supabase, Firebase, and Gemini API keys.*

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   *App boots at `http://localhost:3000` with hot TypeScript execution via `tsx`.*

---

## How to Deploy from Zero

To deploy the HTEIM School of Ministry platform to a fresh cloud container or server from scratch:

```bash
# Step 1: Clone the clean codebase
git clone https://github.com/kpierre24/School-of-Ministry-2026.git
cd School-of-Ministry-2026

# Step 2: Install node dependencies
npm install

# Step 3: Run static type-checking and code quality linting
npm run lint

# Step 4: Run test suite
npm test

# Step 5: Run build suite (Vite client SPA + esbuild server bundle to dist/server.cjs)
npm run build

# Step 6: Launch production server
npm start
```

Your server will spin up on `PORT=3000` listening on host `0.0.0.0`.

---

## Production Deployment

### Cloud Run / Docker Container

The application natively supports Google Cloud Run and Docker container runtimes. The backend `server.ts` automatically binds to host `0.0.0.0` and listens on `PORT` (or defaults to `3000` behind reverse proxy layers).

#### Docker CLI Deployment:
```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run
```

#### Docker Compose:
```bash
npm run docker:compose
```

#### Google Cloud Run:
```bash
gcloud run deploy hteim-school-of-ministry \
  --source . \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key,VITE_SUPABASE_URL=your_url
```

### Vercel Deployment

The project includes `@vercel/analytics` and static build output compatibility. To deploy to Vercel:
1. Connect the repository to Vercel.
2. Set Framework Preset to **Vite**.
3. Set Build Command to `npm run build`.
4. Output Directory: `dist`.
5. Add environment variables in Vercel Project Settings.

---

## Environment Variables

The application references the following environment variables (see `.env.example`):

| Variable | Required | Scope | Description |
|----------|----------|-------|-------------|
| `GEMINI_API_KEY` | Yes | Server | Google Gemini API key for server-side essay evaluation |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server | Privileged Supabase admin key for server-side DB operations |
| `VITE_SUPABASE_URL` | Yes | Client/Server | Supabase PostgreSQL endpoint URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Client/Server | Supabase public anonymous client key |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Client/Server | Firebase project identifier |
| `VITE_FIREBASE_API_KEY` | Yes | Client/Server | Firebase web application API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Client/Server | Firebase authentication domain |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Client/Server | Firebase cloud storage bucket |

---

## Progressive Web App (PWA)

The portal is built as a Progressive Web App powered by `vite-plugin-pwa`:
- **Offline Caching**: Static JS, CSS, fonts, and core assets are cached via Service Worker (`sw.js`).
- **Web App Manifest**: Configured in `vite.config.ts` with app icons, dark/light theme colors, and standalone display mode.
- **Install Prompt**: Interactive in-app prompt allows users to install the portal directly to desktop or mobile home screens.

---

## Android Integration (Capacitor 8)

Native Android support is built using Capacitor 8 (`@capacitor/core: ^8.5.2`):

```bash
# 1. Build web application and sync native Android project assets
npm run cap:sync

# 2. Open project in Android Studio
npm run cap:open
```

Native capabilities include Android platform biometrics (`KeyguardManager` / `BiometricPrompt`), camera upload hooks, and haptic feedback.

---

## Testing

Run linting, static type verification, and Vitest unit testing:

```bash
# Run ESLint rules and TypeScript type checking
npm run lint

# Run Vitest test suite once
npm test

# Run Vitest in watch mode during development
npm run test:watch
```

---

## Backup / Recovery

- **Automated JSON Backup**: Administrators can export the complete institutional dataset (student roster, attendance records, grade sheets, financial transaction ledger) from **Admin → System Health → Backup Suite**.
- **System Restoration**: Upload a previously generated backup JSON file to restore portal state instantly.
- **Database Maintenance**: Maintenance scripts are provided in `scripts/maintenance/db-health-check.cjs` for schema validation and database integrity monitoring (`npm run db:health`).

---

## Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Port `3000` occupied | Background node process active | Terminate process with `lsof -i :3000` or `fuser -k 3000/tcp` and re-run `npm run dev`. |
| Supabase connection error | Missing environment credentials | Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are defined in `.env`. |
| Biometrics unavailable | Uninsecure HTTP context | WebAuthn requires HTTPS or `localhost` origin to access native biometric hardware. |
| Offline sync pending | Disconnected network | Reconnect to internet; PWA sync buffer will automatically flush pending queue. |

---

*© 2026 Heaven Touching Earth International Ministries (HTEIM) School of Ministry. All Rights Reserved.*
