# Tech Stack

**Last Updated:** 2025-11-22

## Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.0.3 | React framework, routing, SSR/RSC |
| **React** | 19.2.0 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Node.js** | 18+ | Runtime |

## Server & API

| Technology | Version | Purpose |
|------------|---------|---------|
| **Hono** | Latest | Lightweight API framework for proxy routes |
| **Next.js API Routes** | 16.0.3 | Mounting Hono at `/api/payload/route.ts` |

**Why Hono?**
- Ultra-fast for proxy workloads
- Clean middleware system
- Works seamlessly inside Next.js API routes
- Better DX than raw Next.js route handlers for complex APIs

## Database

**DECISION NEEDED:** Choose one:

**Option A: Drizzle ORM + SQLite (Hackathon-friendly)**
- ✅ Zero setup, file-based
- ✅ Fast for MVP
- ✅ Easy to inspect
- ❌ Not production-ready

**Option B: Drizzle ORM + PostgreSQL (Production-like)**
- ✅ Production-ready
- ✅ Better for analytics queries
- ❌ Requires Docker/Neon/Supabase

**Recommendation:** Start with SQLite, upgrade to Postgres if needed.

## Styling & UI

| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 4.x | Utility-first CSS |
| **Radix UI** | Latest | Headless UI primitives |
| **Lucide React** | 0.554.0 | Icon library |
| **shadcn/ui** | Latest | Pre-built components |
| **class-variance-authority** | 0.7.1 | Component variants |
| **tailwind-merge** | 3.4.0 | Merge Tailwind classes |

## Web3 & Payments

| Technology | Version | Purpose |
|------------|---------|---------|
| **viem** | 2.39.3 | Ethereum interactions |
| **@coinbase/cdp-*** | 0.0.67 | CDP embedded wallets |
| **Zod** | 3.24.2 | Schema validation |

**x402 Protocol:**
- **DECISION NEEDED:** Is there an x402 client library, or do we build it custom?
- If custom: We'll need to implement x402 challenge parsing and payment flows
- If library exists: Document it here

## Dev Tools

| Technology | Version | Purpose |
|------------|---------|---------|
| **Biome** | 2.3.7 | Linting + formatting (replaces ESLint + Prettier) |
| **bun** | Latest | Package manager (optional, npm/pnpm also work) |

## Deployment

| Platform | Purpose |
|----------|---------|
| **Vercel** | Next.js hosting (auto-detected via `VERCEL_PROJECT_PRODUCTION_URL`) |
| **Neon/Supabase** | PostgreSQL hosting (if we choose Postgres) |

## Environment Variables

Required for development:

```bash
# CDP Embedded Wallets
NEXT_PUBLIC_CDP_PROJECT_ID=your-project-id

# Database (if Postgres)
DATABASE_URL=postgresql://...

# x402 Configuration (TBD)
X402_MERCHANT_ID=...
X402_API_KEY=...
```

## Package Manager

**Current:** `bun` (see `bun.lock`)

**Also supports:** `npm`, `pnpm`, `yarn`

## Build & Run Commands

```bash
# Development
bun dev              # or npm run dev

# Linting & Formatting
bun run check        # Check for issues
bun run fix          # Auto-fix issues

# Production
bun run build        # Build for production
bun start            # Start production server
```

## Version Pinning

**Policy:** Pin exact versions for core dependencies, allow ranges for dev tools.

- Next.js, React: **Exact versions** (breaking changes frequent)
- Tailwind, Biome: **Caret ranges** (`^4.0.0`) - safe to upgrade
- Types: **Latest** - always safe

## Related Files

- `00-overview.md` - Project overview
- `02-project-structure.md` - Folder organization
- `../10-data/00-schema-core.md` - Database schema (once DB is chosen)
