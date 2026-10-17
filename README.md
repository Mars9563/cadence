# Cadence

A calm daily workspace: habits, tasks and loose to-dos for the day, a daily
journal, and a folder-based notes editor, all in one dark, distraction-free
app that keeps working offline.

## Features

- **Today:** habits (daily or on chosen weekdays), dated tasks, and normal
  to-dos, with a calendar to look back at any past day.
- **Daily note:** one journal entry per day.
- **Notes:** folders and Markdown notes with tabs, drag-and-drop, and code
  blocks.
- **Offline-first:** changes are saved on the device and sync when the
  connection returns.
- **Accountable days:** a configurable day boundary (e.g. 04:00), and past
  days can't be ticked off after the fact. The rules are enforced by the
  database.
- **Profile:** display name and a cropped profile photo.
- **Phones:** a dedicated layout with a bottom tab bar and an Obsidian-style
  swipe-out folder drawer.

## Stack

| Part                   | Tech                                                     |
| ---------------------- | -------------------------------------------------------- |
| Web (`apps/web`)       | Next.js 16, React 19, Tailwind CSS 4, Zustand, MDXEditor |
| Server (`apps/server`) | Express 5, Socket.IO                                     |
| Data and auth          | Supabase (Postgres with row-level security, Auth)        |
| Images                 | Cloudinary (signed uploads, private delivery)            |
| Shared (`packages/`)   | `@cadence/types`, `@cadence/validation` (Zod)            |

A pnpm + Turborepo monorepo.

## Quick start

You need **Node 20.9+**, **pnpm 10** (`corepack enable`), a
[Supabase](https://supabase.com) project (the free cloud tier or a
self-hosted instance), and a free [Cloudinary](https://cloudinary.com)
account.

**1. Install**

```bash
git clone https://github.com/Mars9563/cadence.git
cd cadence
pnpm install
```

**2. Database.** In your Supabase project open **SQL Editor**, paste all of
[`supabase/schema.sql`](supabase/schema.sql) and run it. It creates the
tables, security policies, triggers and functions.

**3. Sign-in providers.** In Supabase **Authentication**:

- **URL Configuration:** set Site URL to `http://localhost:3000` and add
  `http://localhost:3000/auth/callback` to the Redirect URLs.
- **Sign In / Providers:** Email is on by default. Enable **Google** and
  **GitHub** with OAuth apps whose callback URL is the one Supabase shows on
  each provider's page.
- **Email template (optional):** a styled sign-up confirmation email is in
  [`apps/web/public/email-templates/confirmation.html`](apps/web/public/email-templates/confirmation.html).
  Paste it into **Emails → Confirm signup**, or, when self-hosting, point
  `GOTRUE_MAILER_TEMPLATES_CONFIRMATION` at its public URL.

**4. Cloudinary.** In **Settings → Upload → Upload presets**, create a preset
with **Signing mode: Signed** and **Delivery type: Authenticated**, allowed
formats `jpg, png, webp`, and no folder or public ID options of its own.

**5. Environment.** Copy the examples and fill them in:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/server/.env.example apps/server/.env
```

| File               | Values                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `apps/web/.env`    | Supabase URL and publishable key (Project Settings → API)                                       |
| `apps/server/.env` | the same Supabase URL and key; Cloudinary cloud name, API key, API secret, and your preset name |

**6. Run**

```bash
pnpm dev
```

Web: <http://localhost:3000> · Server: <http://localhost:4000>. Create an
account and you're in.

## Scripts

| Command                               | What it does                                                            |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `pnpm dev`                            | web and server in watch mode                                            |
| `pnpm build`                          | production build: Next.js, and the server bundled to `apps/server/dist` |
| `pnpm lint`                           | lint both apps                                                          |
| `pnpm typecheck`                      | type-check both apps                                                    |
| `pnpm --filter @cadence/server start` | run the built server                                                    |

## Good to know

- The Cadence day is computed in the **Asia/Kolkata** time zone (the
  database's `app_today()`), whatever time zone the browser is in.
- Cloudinary's API secret lives only in `apps/server/.env`; the browser
  never sees it.
- The server rate-limits requests per user and per IP. Behind a reverse
  proxy, set `TRUST_PROXY` in `apps/server/.env` so it sees real client IPs.

## Docs

- [`docs/design/workspace-redesign.md`](docs/design/workspace-redesign.md): design tokens, layout, phone layout
- [`docs/sync-and-reliability.md`](docs/sync-and-reliability.md): offline sync and reconnection
- [`docs/profile-api.md`](docs/profile-api.md): profile and avatar API

## License

[MIT](LICENSE) © Mradul Raj Singh
