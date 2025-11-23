# Implementation Status

**Last Updated:** 2025-11-22

This document tracks what's been implemented vs what's still TODO.

---

## ✅ IMPLEMENTED

### Database & ORM
- ✅ Drizzle ORM setup with Neon PostgreSQL
- ✅ Schema with 3 tables: `sponsors`, `actions`, `redemptions`
- ✅ Drizzle relations configured
- ✅ Migration system (`pnpm db:generate`, `pnpm db:migrate`)
- ✅ Query helpers in `server/db/queries.ts`

### Server (Hono API)
- ✅ Hono app setup at `/api/payload/route.ts`
- ✅ Health check endpoint (`/health`)
- ✅ Proxy router (`/proxy/:resourceId/*`)
- ✅ Actions router (`/actions/validate`)
- ✅ Sponsors router:
  - `/sponsors/actions` (GET, POST)
  - `/sponsors/fund` (POST)
  - `/sponsors/withdraw` (POST)
  - `/sponsors/analytics` (GET)
  - `/sponsors/plugins` (GET)

### Core Logic
- ✅ Action plugin system
  - Interface defined (`ActionPlugin`)
  - Registry (`getPlugin`, `listPlugins`)
  - 4 plugins implemented:
    - `act_email_capture`
    - `act_survey_answer`
    - `act_star_github`
    - `act_code_verification`
- ✅ Coverage system (`computeCoverage`)
  - Full coverage (100%)
  - Partial coverage (percentage)
- ✅ Recurrence checking (`canRedeemActionForUser`)
  - `one_time_per_user`
  - `per_request`

### Frontend Routes
- ✅ Route groups: `(marketing)`, `(dashboard)`
- ✅ Sponsor dashboard:
  - `/sponsor` - Home page
  - `/sponsor/actions` - List/configure actions
  - `/sponsor/billing` - Fund/withdraw
  - `/sponsor/analytics` - Stats
- ✅ User pages:
  - `/user` - Search resources
  - `/user/resources/[id]` - Resource details

### Components
- ✅ UI components (shadcn/ui):
  - Button, Card, Dialog, Input, Label, Select, etc.
- ✅ CDP wallet integration:
  - `cdp-provider.tsx`
  - `wallet-auth.tsx`
  - `wallet-balance.tsx`
- ✅ Transaction components:
  - `send-transaction.tsx`
  - `fund-faucet.tsx`

### Hooks
- ✅ `use-sponsors.ts` - Fetch sponsor data
- ✅ `use-actions.ts` - Fetch/manage actions
- ✅ `use-resources.ts` - Fetch resources
- ✅ CDP hooks (from `@coinbase/cdp-hooks`)
- ✅ MCP/ChatGPT app hooks

### Configuration
- ✅ Drizzle config (`drizzle.config.ts`)
- ✅ TypeScript paths (`@/...`)
- ✅ Biome linting/formatting
- ✅ Tailwind CSS 4.0
- ✅ pnpm scripts

---

## 🚧 STUB / TODO

### x402 Integration
- 🚧 **STUB:** `getX402ChallengeForResource()` - Returns mock challenge
  - TODO: Integrate real x402 client (MCPay)
  - TODO: Parse actual 402 responses
  - TODO: Handle challenge metadata
- 🚧 **STUB:** `payX402()` - Simulates payment
  - TODO: Integrate MCPay for real payments
  - TODO: Sign transactions
  - TODO: Wait for confirmations
  - TODO: Handle payment failures

**Location:** `server/core/x402/client.ts`

**Current behavior:**
```typescript
// Always returns mock data
return {
  amount: 1000000n,
  currency: "USDC:base",
  network: "base"
};
```

### Resource Registry
- 🚧 **STUB:** `listResources()` - Returns empty array
- 🚧 **STUB:** `getResource()` - Returns null
- 🚧 **STUB:** `searchResources()` - Returns empty array

**Location:** `server/core/resources/registry.ts`

**Workaround:** Resources stored in `public/resources.json` (2.6MB file)

**TODO:**
- Implement resource listing from JSON file
- Add search/filter functionality
- Consider migrating to database if needed

### Missing Features
- ❌ Challenge amount storage in redemptions
  - Currently hardcoded: `const challengeAmount = 1000000n`
  - TODO: Store actual challenge amount in redemptions table
- ❌ Actual payment replay after validation
  - TODO: Re-run original API call with payment signature
  - TODO: Return actual API response to user
- ❌ Sponsor balance checks before creating actions
  - TODO: Validate sponsor has enough balance for action budget
- ❌ Transaction history / audit log
- ❌ Webhook for x402 payment confirmations
- ❌ Rate limiting
- ❌ Caching

---

## 📝 Next Steps (Priority Order)

### 1. x402 Integration (HIGH PRIORITY)
Replace stubs with real MCPay integration:
```typescript
// TODO: Replace in server/core/x402/client.ts
import { MCPay } from '@coinbase/mcpay'; // or wherever it is

export async function getX402ChallengeForResource(...) {
  // Real implementation
  const response = await fetch(resourceUrl);
  if (response.status === 402) {
    // Parse x402 challenge from headers/body
    return parseX402Challenge(response);
  }
}

export async function payX402(request: X402PaymentRequest) {
  // Real MCPay payment
  const mcpay = new MCPay(...);
  return await mcpay.pay(request);
}
```

### 2. Store Challenge Amount
Add field to redemptions table:
```typescript
// In schema.ts
redemptions {
  // ... existing fields
  challengeAmount: bigint("challenge_amount").notNull(),
  currency: varchar("currency", { length: 50 }).notNull(),
}
```

### 3. Resource Registry
Implement actual resource loading:
```typescript
// In server/core/resources/registry.ts
export async function listResources(): Promise<Resource[]> {
  const data = await fs.readFile('public/resources.json', 'utf-8');
  return JSON.parse(data);
}
```

### 4. Payment Replay
After validation succeeds:
```typescript
// In server/hono/routes/actions.ts
// 1. Pay x402 upstream
const paymentResult = await payX402({
  amount: redemption.challengeAmount,
  currency: redemption.currency,
});

// 2. Replay original API call with payment signature
const apiResponse = await fetch(resourceUrl, {
  headers: {
    'X-402-Payment': paymentResult.signature,
  },
});

// 3. Return actual data to user
return c.json(await apiResponse.json());
```

### 5. Frontend Polish
- Connect forms to API endpoints
- Add loading states
- Error handling
- Success messages

---

## File Structure Status

```
✅ = Fully implemented
🚧 = Stub/partial
❌ = Not implemented

server/
├── core/
│   ├── actions/
│   │   ├── ✅ action-plugin.ts
│   │   ├── ✅ coverage.ts
│   │   ├── ✅ registry.ts
│   │   └── plugins/
│   │       ├── ✅ email-capture.ts
│   │       ├── ✅ survey.ts
│   │       ├── ✅ github-star.ts
│   │       └── ✅ code-verification.ts
│   ├── x402/
│   │   ├── 🚧 client.ts (STUB - needs MCPay)
│   │   └── ✅ types.ts
│   └── resources/
│       ├── 🚧 registry.ts (STUB - returns empty)
│       └── ✅ types.ts
├── db/
│   ├── ✅ client.ts
│   ├── ✅ schema.ts
│   └── ✅ queries.ts
└── hono/
    ├── ✅ app.ts
    └── routes/
        ├── ✅ proxy.ts
        ├── ✅ actions.ts
        └── ✅ sponsors.ts

app/
├── (marketing)/
│   └── ✅ page.tsx
├── (dashboard)/
│   ├── sponsor/
│   │   ├── ✅ page.tsx
│   │   ├── ✅ actions/page.tsx
│   │   ├── ✅ billing/page.tsx
│   │   └── ✅ analytics/page.tsx
│   └── user/
│       ├── ✅ page.tsx
│       └── resources/[id]/
│           ├── ✅ page.tsx
│           └── ✅ resource-detail-client.tsx
└── api/
    └── payload/
        └── ✅ route.ts
```

---

## Testing Checklist

### Manual Testing Needed:
- [ ] Create sponsor via API
- [ ] Fund sponsor balance
- [ ] Create action
- [ ] Trigger proxy request
- [ ] Validate action
- [ ] Check sponsor balance decreased
- [ ] Verify redemption status updated

### Integration Testing:
- [ ] Full flow: user → action → payment → API response
- [ ] Recurrence: one_time_per_user enforcement
- [ ] Recurrence: per_request multiple redemptions
- [ ] Coverage: full vs percent calculation
- [ ] Error cases: insufficient balance, invalid plugin, etc.

---

## Related Files

- `00-overview.md` - Project overview
- `01-tech-stack.md` - Technologies used
- `02-project-structure.md` - Folder organization
- `../10-data/00-schema-core.md` - Database schema
- `../20-architecture/01-core-flows.md` - Implementation flows
