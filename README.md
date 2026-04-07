# ContentPro — AI-Powered LinkedIn Content Studio

> A professional SaaS web application for LinkedIn content creators.
> Generate posts using AI personas, score your content, save to a library,
> plan on a calendar, and maintain your writing style — all powered by
> 7 AI providers with full Arabic & English support.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3.x-38bdf8?logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-f38020?logo=cloudflare)

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Cloudflare Setup](#cloudflare-setup)
8. [First Use Guide](#first-use-guide)
9. [Project Structure](#project-structure)
10. [Development](#development)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)
13. [API Reference](#api-reference)
14. [License](#license)

---

## Features

- **7 AI Providers** — OpenRouter, Groq, OpenAI, Anthropic, Google Gemini, Together AI, Mistral
- **LinkedIn-Specialized Personas** — AI experts that understand LinkedIn content best practices
- **Real-time Streaming** — Token-by-token AI response streaming via SSE
- **Content Scoring** — Rate and analyze your LinkedIn posts before publishing
- **Post Library** — Save, organize, and search your generated content
- **Content Calendar** — Schedule posts on a drag-and-drop calendar
- **Professional Profile** — Tell the AI about your career, skills, and style
- **Bilingual UI** — Full Arabic (RTL) and English (LTR) support
- **Dark & Light Mode** — Emerald & Gold design system, dark mode by default
- **PWA Support** — Installable on mobile and desktop
- **Freemium Model** — Generous free tier, Premium at $9/month or $79/year
- **Admin Dashboard** — Full control over users, API keys, personas, and settings
- **Telegram Notifications** — Real-time alerts for admin events
- **Conversation Export** — TXT (free), PDF & Markdown (premium)
- **Private API Keys** — Users can bring their own keys for unlimited access
- **$0 Infrastructure** — Runs entirely on free tiers (Supabase, Cloudflare)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript 5.x, Tailwind CSS 3.x |
| UI Components | Shadcn/UI |
| State Management | Zustand 4.x (6 stores) |
| AI SDK | Vercel AI SDK (streaming) |
| Internationalization | next-intl (Arabic RTL + English LTR) |
| Backend | Cloudflare Workers (serverless proxy) |
| Database | Supabase PostgreSQL (17 tables, RLS on all) |
| Auth | Supabase Auth (email + password) |
| Hosting | Cloudflare Pages |
| Notifications | Telegram Bot API |
| Fonts | Inter, IBM Plex Sans Arabic, JetBrains Mono |
| Icons | Lucide Icons |

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.x or later
- **npm** (comes with Node.js) or **yarn** / **pnpm**
- A **Supabase** account — [supabase.com](https://supabase.com) (free tier)
- A **Cloudflare** account — [cloudflare.com](https://cloudflare.com) (free tier)
- At least **one AI platform API key** (e.g., OpenRouter, Groq, OpenAI)

---

## Quick Start

```bash
# 1. Clone the repository
git clone <your-repo-url> linkedin-content-studio
cd linkedin-content-studio

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Fill in all required environment variables (see next section)

# 5. Set up the database (see Database Setup section)

# 6. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL. Find it in Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key. Found in Supabase → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key. **Keep secret!** Found in Supabase → Settings → API → service_role key |
| `ENCRYPTION_KEY` | ✅ | 32-character random string for AES-256 key encryption. Generate: `openssl rand -hex 16` |
| `TELEGRAM_BOT_TOKEN` | ❌ | Telegram bot token for admin notifications. Create via [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | ❌ | Your Telegram chat ID for receiving notifications. Use [@userinfobot](https://t.me/userinfobot) to find it |
| `SUPER_ADMIN_EMAIL` | ✅ | The email address that will automatically become the super admin on first registration |
| `SUPER_ADMIN_PASSWORD` | ✅ | Password for the super admin account (used during initial registration only) |
| `NEXT_PUBLIC_APP_NAME` | ❌ | Display name of the platform (default: "ContentPro") |
| `NEXT_PUBLIC_APP_URL` | ❌ | Public URL of the deployed app (e.g., `https://your-app.pages.dev`) |

### Generating the Encryption Key

```bash
# Option 1: Using openssl
openssl rand -hex 16

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

The result is a 32-character hex string. Paste it as your `ENCRYPTION_KEY`.

---

## Database Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose a name, database password, and region
4. Wait for the project to be created

### Step 2: Run the SQL Scripts

In the Supabase dashboard, go to **SQL Editor** and run these scripts **in order**:

```
1. supabase/schema.sql          — Creates all 17 tables
2. supabase/rls-policies.sql    — Applies Row Level Security policies
3. supabase/functions.sql       — Creates database functions and triggers
4. supabase/seed.sql            — Inserts default system configuration
```

### Step 3: Disable Email Confirmation

1. Go to **Authentication** → **Providers** → **Email**
2. Toggle OFF "Confirm email"
3. Save

This allows users to sign in immediately after registration.

### Step 4: Verify Setup

Check that all **17 tables** exist in the Table Editor:

```
profiles, user_professional_profiles, conversations, messages,
personas, persona_categories, premium_persona_daily_usage,
api_keys, global_models, folders, invite_codes, invite_code_uses,
notifications, post_library, user_favorites, usage_stats, system_config
```

---

## Cloudflare Setup

### Cloudflare Pages (Frontend Hosting)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Click **Create a project** → Connect to Git
3. Select your repository
4. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `.next`
   - **Framework preset:** Next.js
5. Add all environment variables from `.env.local`
6. Deploy

### Cloudflare Workers (AI Proxy)

1. Install Wrangler CLI: `npm install -g wrangler`
2. Authenticate: `wrangler login`
3. Deploy the worker:

```bash
wrangler deploy workers/proxy.ts
```

4. Set worker secrets:

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put ENCRYPTION_KEY
```

---

## First Use Guide

After completing setup, follow these steps to get the platform running:

### 1. Create the Super Admin Account

1. Open your app URL (localhost:3000 or deployed URL)
2. Click **Sign Up**
3. Register with the exact email from `SUPER_ADMIN_EMAIL`
4. You will automatically be promoted to admin

### 2. Configure AI Providers

1. Go to `/admin/api-keys`
2. Click **Add API Key**
3. Select a platform (e.g., OpenRouter)
4. Paste your API key and give it a label
5. Repeat for additional providers

### 3. Add AI Models

1. Go to `/admin/models`
2. For each API key, add the models you want available
3. Set sort order to control display priority

### 4. Create Persona Categories

1. Go to `/admin/categories`
2. Create categories like "Content Writing", "Strategy", "Marketing"
3. Add icons and set sort order

### 5. Create Personas

1. Go to `/admin/personas`
2. Create at least 2-3 Basic personas
3. Optionally create Premium personas
4. Assign categories and system prompts

### 6. Configure System Settings

1. Go to `/admin/settings`
2. Set rate limits, message limits, and feature flags
3. Optionally configure Telegram notifications

### 7. Test the Chat

1. Go to `/chat`
2. Select a persona from the sidebar
3. Choose an AI model from the header
4. Send a message and verify streaming response

---

## Project Structure

```
linkedin-content-studio/
├── app/
│   ├── [locale]/           # Locale-wrapped pages (ar, en)
│   │   ├── page.tsx        # Landing page
│   │   ├── chat/           # Chat interface
│   │   ├── personas/       # Persona library & creation
│   │   ├── library/        # Post library
│   │   ├── calendar/       # Content calendar
│   │   ├── settings/       # User settings & profile
│   │   ├── login/          # Authentication
│   │   ├── register/       # Registration
│   │   └── admin/          # Admin dashboard (8 sub-pages)
│   └── api/                # API routes
│       ├── chat/           # AI chat streaming
│       ├── conversations/  # Conversation CRUD
│       ├── personas/       # Persona CRUD
│       ├── library/        # Post library CRUD
│       ├── export/         # Conversation export
│       └── admin/          # Admin API routes
├── components/             # React components
│   ├── ui/                 # Shadcn/UI base components
│   ├── chat/               # Chat-specific components
│   ├── sidebar/            # Sidebar components
│   ├── header/             # Header components
│   ├── personas/           # Persona components
│   ├── library/            # Library components
│   ├── calendar/           # Calendar components
│   ├── admin/              # Admin components
│   └── common/             # Shared/reusable components
├── hooks/                  # Custom React hooks
├── stores/                 # Zustand state stores
├── types/                  # TypeScript type definitions
├── lib/                    # Library code (Supabase clients, AI providers, etc.)
├── utils/                  # Utility functions
├── i18n/                   # Internationalization files (ar.json, en.json)
├── workers/                # Cloudflare Workers
├── supabase/               # Database SQL scripts
└── public/                 # Static assets
```

---

## Development

```bash
# Start dev server
npm run dev

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Build for production
npm run build

# Start production server locally
npm run start
```

### Coding Conventions

- **Components:** PascalCase (`ChatArea.tsx`)
- **Hooks:** `use` prefix (`useAuth.ts`)
- **Stores:** camelCase + Store suffix (`authStore.ts`)
- **Types:** camelCase (`user.ts`)
- **DB columns:** snake_case (`user_id`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_MESSAGES`)

---

## Deployment

### Automatic (Recommended)

Push to your connected GitHub branch. Cloudflare Pages will auto-deploy.

### Manual

```bash
# Build the project
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy .next
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Module not found` | Run `npm install` to install all dependencies |
| `Invalid JWT` / `Unauthorized` | Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct |
| `Port 3000 already in use` | Kill the process: `lsof -ti:3000 \| xargs kill -9` or use `npm run dev -- -p 3001` |
| `RLS policy violation` | Run `supabase/rls-policies.sql` again in the SQL Editor |
| `Encryption error` | Verify `ENCRYPTION_KEY` is exactly 32 characters (hex string) |
| `Streaming not working` | Check that your AI API key has sufficient credits/balance |
| `RTL layout broken` | Ensure the URL starts with `/ar/` for Arabic |
| `Dark mode not switching` | Check that the `dark` class is toggling on the `<html>` element |
| `Personas not showing` | Admin must create personas in `/admin/personas` first |
| `Chat shows "No models"` | Admin must add API keys and models in the admin dashboard |

---

## API Reference

### Public Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Stream AI response (public key) |
| POST | `/api/chat-private` | Stream AI response (user's key) |
| GET | `/api/models` | List available models |
| GET/POST/PATCH/DELETE | `/api/conversations` | Conversation CRUD |
| GET/POST | `/api/messages` | Message CRUD |
| GET/POST/PATCH/DELETE | `/api/folders` | Folder CRUD |
| GET/POST/DELETE | `/api/favorites` | Favorites CRUD |
| GET/POST/PATCH/DELETE | `/api/personas` | Persona CRUD |
| POST | `/api/persona-trial` | Premium persona trial check |
| POST | `/api/score` | Content scoring |
| GET/POST/PATCH/DELETE | `/api/library` | Post library CRUD |
| GET/PATCH | `/api/calendar` | Calendar operations |
| GET/POST/PATCH | `/api/profile` | Professional profile |
| POST | `/api/export` | Export conversation |

### Admin Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PATCH/DELETE | `/api/admin/users` | User management |
| GET/POST/PATCH/DELETE | `/api/admin/api-keys` | API key management |
| GET/POST/PATCH/DELETE | `/api/admin/models` | Model management |
| GET/POST/PATCH/DELETE | `/api/admin/personas` | Persona management |
| GET/POST/PATCH/DELETE | `/api/admin/categories` | Category management |
| GET/POST/PATCH/DELETE | `/api/admin/invite-codes` | Invite code management |
| GET/PATCH/DELETE | `/api/admin/notifications` | Notification management |
| GET/PATCH | `/api/admin/settings` | System settings |
| GET | `/api/admin/stats` | Dashboard statistics |

All API responses follow the format:

```json
{
  "success": true,
  "data": { },
  "message": "Success"
}
```

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```