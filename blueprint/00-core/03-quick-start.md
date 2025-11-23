# Quick Start

**Last Updated:** 2025-11-22

Get Payload Exchange running locally in **5 minutes**.

## Prerequisites

- **Node.js** 18+ or **Bun** latest
- **Git**
- **CDP Project ID** (get free at [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com))

## 1. Clone & Install

```bash
git clone <repo-url>
cd payload-exchange

# Install dependencies
bun install
# or: npm install
```

## 2. Environment Setup

Create `.env.local`:

```bash
# Required: CDP Embedded Wallets
NEXT_PUBLIC_CDP_PROJECT_ID=your-project-id-here

# Database (if using Postgres)
# DATABASE_URL=postgresql://user:password@localhost:5432/payload_exchange

# x402 Configuration (TBD based on x402 implementation)
# X402_MERCHANT_ID=...
# X402_API_KEY=...
```

**Get CDP Project ID:**
1. Sign up at [CDP Portal](https://portal.cdp.coinbase.com)
2. Create new project
3. Copy Project ID
4. Add `http://localhost:3000` to allowed domains

## 3. Database Setup

**Option A: SQLite (Hackathon/Development)**

```bash
# Auto-creates local.db file
bun run db:generate    # Generate schema
bun run db:migrate     # Run migrations
```

**Option B: PostgreSQL (Production-like)**

```bash
# Start Postgres (Docker)
docker run -d \
  --name payload-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=payload_exchange \
  -p 5432:5432 \
  postgres:16

# Update .env.local with DATABASE_URL
# Then run migrations
bun run db:migrate
```

## 4. Run Development Server

```bash
bun dev
# or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 5. Verify Setup

You should see:
- ✅ Landing page loads
- ✅ CDP wallet auth works
- ✅ No console errors

Test the Hono API:
```bash
curl http://localhost:3000/api/payload/health
# Expected: {"status":"ok"}
```

## Project Scripts

```bash
# Development
bun dev              # Start dev server (hot reload)

# Linting & Formatting
bun run check        # Check for issues
bun run fix          # Auto-fix issues

# Database
bun run db:generate  # Generate migrations from schema
bun run db:migrate   # Run migrations
bun run db:studio    # Open Drizzle Studio (if using Drizzle)

# Build & Production
bun run build        # Build for production
bun start            # Start production server
```

## Common Issues

### "CDP Project ID not found"

**Fix:** Make sure `.env.local` exists and has `NEXT_PUBLIC_CDP_PROJECT_ID`

### "Database connection failed"

**Fix:** Check `DATABASE_URL` in `.env.local` and ensure Postgres is running

### "Module not found: @/server/..."

**Fix:** TypeScript paths issue. Restart dev server: `bun dev`

### Port 3000 already in use

**Fix:** Kill the process or use a different port:
```bash
PORT=3001 bun dev
```

## First-Time Setup Checklist

- [ ] Clone repo
- [ ] Install dependencies (`bun install`)
- [ ] Create `.env.local` with CDP Project ID
- [ ] Run database migrations (`bun run db:migrate`)
- [ ] Start dev server (`bun dev`)
- [ ] Verify http://localhost:3000 loads
- [ ] Test CDP wallet auth
- [ ] Check `/api/payload/health` responds

## What's Next?

**For Users:**
- Browse x402 resources at `/user`
- Try calling an API through the proxy

**For Sponsors:**
- Fund your balance at `/sponsor/billing`
- Configure actions at `/sponsor/actions`
- View analytics at `/sponsor/analytics`

**For Developers:**
- Read `../20-architecture/00-system-architecture.md` to understand the flow
- Check `../10-data/00-schema-core.md` for database schema
- Explore `src/server/core/actions/plugins/` for action examples

## Development Workflow

1. **Feature work:**
   - Create new route in `src/app/`
   - Add server logic in `src/server/`
   - Use components from `src/lib/ui/`

2. **Before committing:**
   ```bash
   bun run check     # Lint & format check
   bun run fix       # Auto-fix issues
   ```

3. **Testing:**
   - Manual testing in browser
   - Test API endpoints with `curl` or Postman

## Deployment

**Vercel (Recommended):**

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

**Environment variables needed:**
- `NEXT_PUBLIC_CDP_PROJECT_ID`
- `DATABASE_URL` (use Neon or Supabase for Postgres)
- x402 config (TBD)

## Related Files

- `00-overview.md` - What is Payload Exchange?
- `01-tech-stack.md` - Technologies used
- `02-project-structure.md` - Where everything lives
- `../20-architecture/01-core-flows.md` - How requests flow through the system
