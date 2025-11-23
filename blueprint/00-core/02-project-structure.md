# Project Structure

**Last Updated:** 2025-11-22

## Overview

Payload Exchange uses a **Next.js 16 App Router** structure with server-side logic in `src/server/` and client/shared code in `src/lib/`.

**Key Principles:**
- **Separation:** Server logic (`src/server/`) never imported by client
- **Hono for APIs:** Heavy lifting in Hono, mounted at `/api/payload/route.ts`
- **Route groups:** `(marketing)` and `(dashboard)` for layout isolation
- **Colocation:** Keep related code together (routes + components nearby)

## Root Files

```
.
├── package.json           # Dependencies, scripts
├── tsconfig.json          # TypeScript config
├── next.config.mjs        # Next.js config (assetPrefix for Vercel)
├── .env.local             # Environment variables (not committed)
├── biome.json             # Biome linting/formatting config
└── bun.lock               # Lockfile (or package-lock.json)
```

## Source Structure (`src/`)

### Application Routes (`src/app/`)

```
src/app/
├── (marketing)/
│   └── page.tsx                    # Landing: "Get all APIs for free"
│
├── (dashboard)/
│   ├── sponsor/
│   │   ├── page.tsx                # Sponsor home dashboard
│   │   ├── actions/
│   │   │   └── page.tsx            # List & configure actions
│   │   ├── billing/
│   │   │   └── page.tsx            # Fund / withdraw (UI only for hackathon)
│   │   └── analytics/
│   │       └── page.tsx            # Spend overview, charts
│   │
│   └── user/
│       ├── page.tsx                # "Search engine" for x402 resources
│       └── resources/
│           └── [id]/
│               └── page.tsx        # Resource details + "Access via Payload"
│
├── api/
│   └── payload/
│       └── route.ts                # Hono mounted here (all proxy logic)
│
├── layout.tsx                      # Root layout (CDP provider, auth)
└── globals.css                     # Global styles
```

**Route Groups Explained:**

- `(marketing)/` - Public pages, no auth required, different layout
- `(dashboard)/` - Protected pages, shared dashboard layout

**Why groups?** They let you nest layouts without affecting the URL path.

### Server-Only Logic (`src/server/`)

**CRITICAL:** Nothing in `src/server/` should ever be imported by client components.

```
src/server/
├── hono/
│   ├── app.ts                      # Hono instance & route registration
│   ├── routes/
│   │   ├── proxy.ts                # /proxy/*: x402 proxy logic
│   │   ├── actions.ts              # /actions/start, /actions/validate
│   │   └── sponsors.ts             # /sponsors/fund, /sponsors/withdraw
│   └── types.ts                    # Request/response DTOs
│
├── core/
│   ├── actions/
│   │   ├── action-plugin.ts        # ActionPlugin interface
│   │   ├── coverage.ts             # Recurrence + coverage logic
│   │   ├── registry.ts             # Plugin registry (getPlugin)
│   │   └── plugins/
│   │       ├── email-capture.ts    # Plugin: capture emails
│   │       ├── survey.ts           # Plugin: answer survey
│   │       ├── github-star.ts      # Plugin: star GitHub repo
│   │       └── code-verification.ts # Plugin: enter verification code
│   │
│   ├── x402/
│   │   ├── client.ts               # Helper to talk to x402 endpoints
│   │   └── types.ts                # x402 challenge types
│   │
│   └── resources/
│       ├── registry.ts             # List/resolve x402 resources for search UI
│       └── types.ts                # Resource metadata types
│
└── db/
    ├── client.ts                   # DB client (Drizzle/Prisma)
    ├── schema.ts                   # sponsors, actions, redemptions, etc.
    └── queries.ts                  # Data-access helpers
```

**Hono Structure:**
- `app.ts` - Main Hono instance
- `routes/` - Route handlers (proxy, actions, sponsors)
- Types defined locally in `types.ts`

**Core Business Logic:**
- `actions/` - Action plugin system
- `x402/` - x402 protocol helpers
- `resources/` - Resource registry for search UI

**Database:**
- `db/client.ts` - Single DB client export
- `db/schema.ts` - All tables defined here
- `db/queries.ts` - Pre-built queries (e.g., `getSponsorBalance()`)

### Shared Code (`src/lib/`)

Code that can be used by **both client and server**.

```
src/lib/
├── ui/                             # Shared UI components (shadcn/ui)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
│
├── hooks/                          # React hooks (client-side only)
│   ├── use-sponsors.ts             # Fetch sponsor data
│   ├── use-actions.ts              # Fetch/manage actions
│   └── use-resources.ts            # Fetch x402 resources
│
└── utils/                          # Shared utility functions
    ├── cn.ts                       # Tailwind class merge helper
    ├── format.ts                   # Date/currency formatting
    └── validation.ts               # Shared Zod schemas
```

**Rules:**
- `ui/` - Can be used in Server or Client Components
- `hooks/` - **Client-side only** (use `"use client"`)
- `utils/` - Safe for both server and client

## Components (`components/`)

**DEPRECATED:** Components are moving into `src/lib/ui/`.

Current components will be migrated:
```
components/
├── ui/                             # shadcn/ui components (move to src/lib/ui)
├── wallet-auth.tsx                 # CDP wallet auth (move to src/lib/ui)
└── ...
```

**Action Required:** Gradually migrate to `src/lib/ui/` as you touch files.

## Import Boundaries

**CRITICAL RULES:**

1. **Server can import from:**
   - ✅ `src/server/*`
   - ✅ `src/lib/utils/*`
   - ❌ `src/lib/hooks/*` (React hooks are client-only)
   - ❌ `src/lib/ui/*` (if they use `"use client"`)

2. **Client can import from:**
   - ✅ `src/lib/*`
   - ❌ `src/server/*` (will break the build)

3. **API routes (`app/api/*/route.ts`):**
   - ✅ Can import `src/server/*`
   - This is where Hono gets mounted

## Folder Naming Conventions

- **Route groups:** `(name)/` - Parentheses = not in URL
- **Dynamic routes:** `[id]/` - Brackets = dynamic segment
- **Private folders:** `_components/` - Underscore = not a route
- **Server modules:** `src/server/` - Never imported by client

## File Naming Conventions

- **Routes:** `page.tsx` (renders at the route)
- **Layouts:** `layout.tsx` (wraps child routes)
- **Loading:** `loading.tsx` (Suspense fallback)
- **Error:** `error.tsx` (Error boundary)
- **API:** `route.ts` (API route handler)

## TypeScript Paths

Defined in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Usage:**
```typescript
// ✅ Good
import { getSponsors } from "@/server/db/queries";
import { Button } from "@/lib/ui/button";

// ❌ Bad (relative paths)
import { getSponsors } from "../../server/db/queries";
```

## Migration Path

**Current state:** Components in `components/`, hooks in `hooks/`
**Target state:** Everything in `src/`

**How to migrate:**
1. Move `components/ui/*` → `src/lib/ui/*`
2. Move `hooks/*` → `src/lib/hooks/*`
3. Update all imports to use `@/lib/*`
4. Delete old `components/` and `hooks/` folders

## Related Files

- `00-overview.md` - Project overview
- `01-tech-stack.md` - Technologies used
- `../10-data/00-schema-core.md` - Database schema
- `../20-architecture/00-system-architecture.md` - How it all connects
