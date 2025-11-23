# System Architecture

**Last Updated:** 2025-11-22

## Overview

Payload Exchange is a **proxy-first architecture** that sits between users and x402-protected APIs, replacing payment challenges with sponsor-funded actions.

```
┌─────────┐                                  ┌──────────────┐
│  User/  │   1. API call                    │  x402 API    │
│  Agent  │ ─────────────────────┐           │  (Weather,   │
└─────────┘                      │           │   News, etc) │
                                 ▼           └──────────────┘
                    ┌────────────────────────┐       ▲
                    │  Payload Exchange      │       │
                    │       Proxy            │───────┘
                    │  (Hono + Next.js)      │  4. Pay x402
                    └────────────────────────┘
                                 │
                  ┌──────────────┴─────────────┐
                  │                            │
                  ▼                            ▼
         2. Match Sponsor           3. Validate Action
         ┌────────────┐             ┌────────────────┐
         │  Sponsors  │             │ Action Plugins │
         │  (Balance, │             │ (Email, Star,  │
         │   Config)  │             │  Survey, etc)  │
         └────────────┘             └────────────────┘
```

## Core Components

### 1. Next.js App Layer

**Location:** `src/app/`

**Responsibilities:**
- Render marketing pages (`(marketing)/`)
- Render dashboards (`(dashboard)/sponsor`, `(dashboard)/user`)
- Mount Hono API at `/api/payload/route.ts`

**Technology:** Next.js 16 App Router (React Server Components)

---

### 2. Hono API Layer

**Location:** `src/server/hono/`

**Responsibilities:**
- Proxy x402 API calls (`/proxy/*`)
- Handle sponsor funding (`/sponsors/fund`)
- Start actions (`/actions/start`)
- Validate actions (`/actions/validate`)

**Technology:** Hono (lightweight HTTP framework)

**Why Hono?**
- Fast, minimal overhead
- Clean middleware system
- Works perfectly inside Next.js API routes
- Better DX than raw Next.js route handlers

---

### 3. Core Business Logic

**Location:** `src/server/core/`

**Modules:**

**Actions (`actions/`)**
- Action plugin interface
- Plugin registry
- Coverage/recurrence logic
- Built-in plugins (email, GitHub, survey, code)

**x402 (`x402/`)**
- x402 client (parse challenges, make payments)
- Challenge validation
- Payment flow

**Resources (`resources/`)**
- Resource registry (list available x402 APIs)
- Resource metadata
- Search/filter logic

---

### 4. Database Layer

**Location:** `src/server/db/`

**Responsibilities:**
- Schema definitions (`schema.ts`)
- Database client (`client.ts`)
- Pre-built queries (`queries.ts`)

**Technology:** Drizzle ORM + SQLite (or PostgreSQL)

---

### 5. Frontend UI

**Location:** `src/lib/ui/`, `src/lib/hooks/`

**Components:**
- shadcn/ui components (`Button`, `Card`, `Dialog`, etc.)
- Custom components (wallet auth, transaction sender)

**Hooks:**
- `useSponsors` - Fetch sponsor data
- `useActions` - Manage actions
- `useResources` - Browse x402 APIs

---

## Data Flow: User Calls x402 API

### Happy Path

```
1. User makes request to proxy
   GET /api/payload/proxy/weather.com/forecast?city=SF

2. Proxy forwards to x402 API
   GET https://weather.com/forecast?city=SF

3. x402 API responds with challenge
   HTTP 402 Payment Required
   {
     "price": "1000000",  // 1 USDC (6 decimals)
     "currency": "USDC:base",
     "nonce": "abc123"
   }

4. Proxy matches with sponsor action
   - Find active actions for this resource
   - Check sponsor has sufficient balance
   - Select best match (highest reward, round-robin, etc.)

5. Proxy checks if user has redeemed this action
   - Query redemptions table
   - Check recurrence rules (once, daily, unlimited)

6. If first time → respond with action
   HTTP 200 OK
   {
     "action_required": true,
     "action": {
       "id": "action-123",
       "plugin": "github-star",
       "instructions": "Star microchipgnu/payload-exchange on GitHub",
       "url": "https://github.com/microchipgnu/payload-exchange"
     }
   }

7. User completes action → calls validate endpoint
   POST /api/payload/actions/validate
   {
     "action_id": "action-123",
     "user_id": "0x...",
     "proof": { "username": "alice" }
   }

8. Plugin validates action
   - GitHub plugin checks if user starred repo
   - Returns validated: true/false

9. If validated → deduct sponsor balance
   - Create redemption record
   - Create x402_payment record
   - Update sponsor_balances.amount

10. Pay x402 API using sponsor balance
    - Sign x402 payment challenge
    - Send payment to API

11. Re-run original API call
    GET https://weather.com/forecast?city=SF
    Headers: X-402-Payment: <signature>

12. Return real data to user
    HTTP 200 OK
    { "forecast": "Sunny, 72°F" }
```

### Error Cases

**No sponsor available:**
```json
{
  "error": "no_sponsor",
  "message": "No sponsor available for this resource",
  "fallback": "Pay with USDC directly"
}
```

**User already redeemed (recurrence limit):**
```json
{
  "error": "already_redeemed",
  "message": "You've already completed this action today",
  "next_available": "2025-11-23T00:00:00Z"
}
```

**Action validation failed:**
```json
{
  "error": "validation_failed",
  "message": "Could not verify GitHub star"
}
```

**Sponsor balance depleted:**
```json
{
  "error": "sponsor_depleted",
  "message": "Sponsor budget exhausted",
  "fallback": "Try another resource or pay directly"
}
```

---

## Data Flow: Sponsor Funds Balance

```
1. Sponsor navigates to /sponsor/billing

2. Clicks "Fund Balance" → amount input

3. Frontend calls funding endpoint
   POST /api/payload/sponsors/fund
   { "amount": "10.0", "currency": "USDC:base" }

4. Hono responds with x402 challenge
   HTTP 200 OK
   {
     "challenge": {
       "price": "10000000",  // 10 USDC
       "currency": "USDC:base",
       "nonce": "xyz789",
       "paymentUrl": "https://payment.x402.com/..."
     }
   }

5. User pays via x402 (external flow)
   - Opens paymentUrl
   - Connects wallet
   - Signs transaction

6. Payment confirmed → webhook callback
   POST /api/payload/webhooks/x402
   { "nonce": "xyz789", "status": "confirmed", "tx_hash": "0x..." }

7. Update sponsor balance
   - Find sponsor by x402 identity
   - Increment sponsor_balances.amount
   - Create transaction record

8. Redirect to dashboard
   - Show updated balance
   - Enable action configuration
```

---

## Data Flow: Configure Action

```
1. Sponsor navigates to /sponsor/actions

2. Clicks "Create Action" → form

3. Selects plugin (e.g., "GitHub Star")

4. Fills config:
   - Repo: "microchipgnu/payload-exchange"
   - Price per redemption: "0.5 USDC"
   - Total budget: "50 USDC"

5. Submits form
   POST /api/payload/sponsors/actions
   {
     "plugin_id": "github-star",
     "name": "Star my repo",
     "config": { "repo": "microchipgnu/payload-exchange" },
     "price_per_redemption": "0.5",
     "total_budget": "50",
     "currency": "USDC:base"
   }

6. Backend validates
   - Check sponsor has sufficient balance (50 USDC)
   - Validate config against plugin schema
   - Ensure budget > price_per_redemption

7. Create action record
   - Insert into actions table
   - Status: "active"
   - Spent: 0

8. Return success
   - Redirect to /sponsor/actions
   - Show new action in list
```

---

## Security Model

### 1. Sponsor Isolation

- Sponsors can only access their own data
- Balance checks on every redemption
- Actions tied to sponsor_id (foreign key)

### 2. Action Validation

- Plugins validate actions server-side
- No client-side trust
- Validation proof stored in `redemptions.validation_data`

### 3. Recurrence Enforcement

- `redemptions` table tracks user actions
- Query history before allowing redemption
- Rules enforced at application layer

### 4. x402 Payment Security

- Payments signed by sponsor wallet
- Transaction hashes stored for audit
- Failed payments logged

---

## Scalability Considerations

**Hackathon (MVP):**
- Single server (Vercel Edge or Node.js)
- SQLite or single Postgres instance
- No caching, no queues

**Production (Future):**
- **Database:** Postgres with connection pooling
- **Caching:** Redis for sponsor balances, action configs
- **Queues:** BullMQ for async x402 payments
- **CDN:** Vercel Edge for static resources
- **Monitoring:** Sentry for errors, PostHog for analytics

---

## Deployment Architecture

**Hackathon:**
```
Vercel (Next.js + Hono API)
   ├── Edge Functions (SSR)
   ├── Serverless Functions (API routes)
   └── SQLite (local file or Turso)
```

**Production:**
```
Vercel (Next.js + Hono API)
   ├── Edge Functions (SSR)
   └── Serverless Functions (API routes)

Neon/Supabase (Postgres)
Redis (Upstash)
BullMQ Worker (separate service)
```

---

## Related Files

- `01-core-flows.md` - Detailed request/response flows
- `02-plugin-system.md` - Action plugin architecture
- `../10-data/00-schema-core.md` - Database schema
- `../30-api/00-api-patterns.md` - API design patterns
