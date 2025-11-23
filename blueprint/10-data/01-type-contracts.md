# Type Contracts

**Last Updated:** 2025-11-22

**CRITICAL:** These type rules prevent 90% of bugs. Follow them religiously.

## Core Principle

**Database types ≠ Application types**

- **Database:** Exact schema representation (nullable, bigint, etc.)
- **Application:** User-friendly types (non-null, decimals, parsed JSON)
- **API:** Serializable types (strings instead of bigints, ISO dates)

## Type Layers

### Layer 1: Database Types (Raw)

Generated from schema, used **only** in `src/server/db/`.

```typescript
// src/server/db/schema.ts (Drizzle example)
import { pgTable, uuid, varchar, bigint, json, timestamp } from "drizzle-orm/pg-core";

export const sponsors = pgTable("sponsors", {
  id: uuid("id").primaryKey().defaultRandom(),
  address: varchar("address", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Inferred type (used in queries)
export type SponsorDB = typeof sponsors.$inferSelect;
export type SponsorInsert = typeof sponsors.$inferInsert;
```

**Rules:**
- ✅ Use only in `src/server/db/queries.ts`
- ❌ Never export to application layer
- ❌ Never use in API responses

---

### Layer 2: Application Types (Parsed)

User-friendly types for business logic in `src/server/core/`.

```typescript
// src/server/core/sponsors/types.ts
export type Sponsor = {
  id: string;
  address: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SponsorBalance = {
  id: string;
  sponsorId: string;
  currency: string;
  amount: bigint;           // Still bigint for precision
  amountDecimal: string;    // Human-readable (e.g., "1.5 USDC")
  createdAt: Date;
  updatedAt: Date;
};

export type Action = {
  id: string;
  sponsorId: string;
  pluginId: string;
  name: string;
  config: ActionConfig;     // Parsed JSON → typed object
  pricePerRedemption: bigint;
  currency: string;
  totalBudget: bigint;
  spent: bigint;
  status: ActionStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ActionStatus = "active" | "paused" | "depleted";

// Plugin-specific configs (union type)
export type ActionConfig =
  | EmailCaptureConfig
  | GitHubStarConfig
  | SurveyConfig
  | CodeVerificationConfig;

export type EmailCaptureConfig = {
  type: "email-capture";
  listId: string;
  recurrence: "once" | "daily" | "unlimited";
};

export type GitHubStarConfig = {
  type: "github-star";
  repo: string;  // Format: "owner/repo"
  recurrence: "once";
};
```

**Rules:**
- ✅ Use in business logic (`src/server/core/`)
- ✅ Dates as `Date` objects
- ✅ JSON as typed objects
- ✅ Enums as union types
- ❌ Never send bigints to client (not JSON-serializable)

---

### Layer 3: API Types (Serializable)

JSON-safe types for API requests/responses.

```typescript
// src/server/hono/types.ts (or src/lib/types/api.ts)
export type SponsorResponse = {
  id: string;
  address: string;
  name: string | null;
  createdAt: string;  // ISO 8601
  updatedAt: string;
};

export type SponsorBalanceResponse = {
  id: string;
  sponsorId: string;
  currency: string;
  amount: string;           // Bigint → string
  amountDecimal: string;    // Human-readable
  createdAt: string;
  updatedAt: string;
};

export type ActionResponse = {
  id: string;
  sponsorId: string;
  pluginId: string;
  name: string;
  config: ActionConfig;     // Same as app layer (already JSON-safe)
  pricePerRedemption: string;  // Bigint → string
  currency: string;
  totalBudget: string;
  spent: string;
  status: ActionStatus;
  createdAt: string;
  updatedAt: string;
};

// Request types (validation with Zod)
export type CreateActionRequest = {
  pluginId: string;
  name: string;
  config: ActionConfig;
  pricePerRedemption: string;  // "1.5" → converted to bigint
  currency: string;
  totalBudget: string;
};
```

**Rules:**
- ✅ Dates as ISO 8601 strings
- ✅ Bigints as strings (avoid precision loss)
- ✅ Use Zod for validation
- ❌ No `Date` objects (not JSON-serializable)
- ❌ No `bigint` (not JSON-serializable)

---

## Conversion Helpers

**Database → Application:**

```typescript
// src/server/db/mappers.ts
import type { SponsorDB } from "./schema";
import type { Sponsor } from "../core/sponsors/types";

export function mapSponsor(db: SponsorDB): Sponsor {
  return {
    id: db.id,
    address: db.address,
    name: db.name,
    createdAt: db.createdAt,
    updatedAt: db.updatedAt,
  };
}

export function mapSponsorBalance(db: SponsorBalanceDB): SponsorBalance {
  return {
    ...db,
    amount: db.amount,
    amountDecimal: formatCurrency(db.amount, db.currency),
  };
}

function formatCurrency(amount: bigint, currency: string): string {
  const decimals = getCurrencyDecimals(currency);  // USDC = 6
  const divisor = 10n ** BigInt(decimals);
  return (Number(amount) / Number(divisor)).toFixed(decimals);
}
```

**Application → API:**

```typescript
// src/server/core/sponsors/serializers.ts
import type { Sponsor, SponsorBalance } from "./types";
import type { SponsorResponse, SponsorBalanceResponse } from "../../hono/types";

export function serializeSponsor(sponsor: Sponsor): SponsorResponse {
  return {
    id: sponsor.id,
    address: sponsor.address,
    name: sponsor.name,
    createdAt: sponsor.createdAt.toISOString(),
    updatedAt: sponsor.updatedAt.toISOString(),
  };
}

export function serializeSponsorBalance(balance: SponsorBalance): SponsorBalanceResponse {
  return {
    id: balance.id,
    sponsorId: balance.sponsorId,
    currency: balance.currency,
    amount: balance.amount.toString(),
    amountDecimal: balance.amountDecimal,
    createdAt: balance.createdAt.toISOString(),
    updatedAt: balance.updatedAt.toISOString(),
  };
}
```

**API → Application:**

```typescript
// src/server/hono/validators.ts
import { z } from "zod";

export const createActionSchema = z.object({
  pluginId: z.string(),
  name: z.string().min(1).max(255),
  config: z.union([
    emailCaptureConfigSchema,
    githubStarConfigSchema,
    // ... other plugins
  ]),
  pricePerRedemption: z.string().regex(/^\d+(\.\d+)?$/),
  currency: z.string(),
  totalBudget: z.string().regex(/^\d+(\.\d+)?$/),
});

export type CreateActionRequest = z.infer<typeof createActionSchema>;

// Convert to application type
export function parseCreateActionRequest(req: CreateActionRequest, currency: string): {
  ...req,
  pricePerRedemption: bigint,
  totalBudget: bigint,
} {
  const decimals = getCurrencyDecimals(currency);
  return {
    ...req,
    pricePerRedemption: parseCurrency(req.pricePerRedemption, decimals),
    totalBudget: parseCurrency(req.totalBudget, decimals),
  };
}

function parseCurrency(value: string, decimals: number): bigint {
  const num = parseFloat(value);
  const multiplier = 10 ** decimals;
  return BigInt(Math.round(num * multiplier));
}
```

---

## Validation Rules

### 1. Use Zod for API Validation

```typescript
// ✅ Good
const createActionSchema = z.object({
  pluginId: z.string().min(1),
  name: z.string().min(1).max(255),
  // ...
});

// Parse and validate
const data = createActionSchema.parse(req.body);
```

### 2. Never Trust User Input

```typescript
// ❌ Bad
function createAction(data: any) {
  db.insert(actions).values(data);
}

// ✅ Good
function createAction(data: CreateActionRequest) {
  const parsed = createActionSchema.parse(data);
  // ... convert and insert
}
```

### 3. Validate Config Against Plugin Schema

```typescript
// Each plugin exports its config schema
export const githubStarConfigSchema = z.object({
  type: z.literal("github-star"),
  repo: z.string().regex(/^[\w-]+\/[\w-]+$/),
  recurrence: z.literal("once"),
});

// Registry validates on action creation
const plugin = getPlugin(pluginId);
const config = plugin.validateConfig(rawConfig);
```

---

## Nullability Rules

### Database Layer

```typescript
// Nullable fields explicitly marked
type SponsorDB = {
  name: string | null;  // Nullable in DB
};
```

### Application Layer

```typescript
// Keep nulls explicit
type Sponsor = {
  name: string | null;
};

// Provide defaults only where it makes sense
function displayName(sponsor: Sponsor): string {
  return sponsor.name ?? sponsor.address.slice(0, 8);
}
```

### API Layer

```typescript
// Null → undefined for optional fields
type SponsorResponse = {
  name?: string;  // Omit if null
};

function serializeSponsor(sponsor: Sponsor): SponsorResponse {
  return {
    id: sponsor.id,
    address: sponsor.address,
    ...(sponsor.name && { name: sponsor.name }),
  };
}
```

---

## Enum Handling

**Database:** String literals
**Application:** Union types
**API:** Same as application (strings)

```typescript
// ✅ Good
type ActionStatus = "active" | "paused" | "depleted";

// ❌ Bad (don't use TS enums)
enum ActionStatus {
  Active = "active",
  Paused = "paused",
  Depleted = "depleted",
}
```

**Why?** TS enums are compiled into objects, adding runtime overhead. Union types are erased at compile time.

---

## FORBIDDEN

### ❌ `any` type

```typescript
// ❌ NEVER
function processAction(data: any) { ... }

// ✅ Always
function processAction(data: CreateActionRequest) { ... }
```

### ❌ Type assertions without validation

```typescript
// ❌ Bad
const config = JSON.parse(jsonString) as GitHubStarConfig;

// ✅ Good
const config = githubStarConfigSchema.parse(JSON.parse(jsonString));
```

### ❌ Mixing layers

```typescript
// ❌ Bad (DB type in API response)
export function getSponsors(): SponsorDB[] { ... }

// ✅ Good (proper layering)
export function getSponsors(): SponsorResponse[] { ... }
```

---

## Related Files

- `00-schema-core.md` - Database schema
- `src/server/db/schema.ts` - DB types (Layer 1)
- `src/server/core/*/types.ts` - App types (Layer 2)
- `src/server/hono/types.ts` - API types (Layer 3)
- `src/lib/utils/validation.ts` - Shared Zod schemas
