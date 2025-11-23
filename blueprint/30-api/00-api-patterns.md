# API Patterns & Conventions

**Last Updated:** 2025-11-22

All Hono API routes follow these conventions for consistency and maintainability.

## Hono App Structure

**Location:** `src/server/hono/app.ts`

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import proxyRoutes from "./routes/proxy";
import actionsRoutes from "./routes/actions";
import sponsorsRoutes from "./routes/sponsors";

const app = new Hono();

// Global middleware
app.use("*", cors());
app.use("*", logger());

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Mount routes
app.route("/proxy", proxyRoutes);
app.route("/actions", actionsRoutes);
app.route("/sponsors", sponsorsRoutes);

export default app;
```

**Mounted in Next.js:**

```typescript
// src/app/api/payload/route.ts
import app from "@/server/hono/app";

export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const DELETE = app.fetch;
export const PATCH = app.fetch;
```

---

## Route Organization

**Pattern:** One file per resource group.

```
src/server/hono/routes/
├── proxy.ts        # /proxy/*
├── actions.ts      # /actions/*
└── sponsors.ts     # /sponsors/*
```

**Example:** `routes/actions.ts`

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { validateActionSchema } from "../validators";

const actions = new Hono();

// POST /actions/validate
actions.post("/validate", zValidator("json", validateActionSchema), async (c) => {
  const data = c.req.valid("json");
  // ... handle validation
  return c.json({ success: true });
});

export default actions;
```

---

## Request Validation

**Use Zod + Hono validator:**

```typescript
// src/server/hono/validators.ts
import { z } from "zod";

export const validateActionSchema = z.object({
  redemption_id: z.string().uuid(),
  user_id: z.string().min(1),
  proof: z.record(z.unknown()),
});

export const createActionSchema = z.object({
  plugin_id: z.string().min(1),
  name: z.string().min(1).max(255),
  config: z.union([
    emailCaptureConfigSchema,
    githubStarConfigSchema,
    // ... other plugins
  ]),
  price_per_redemption: z.string().regex(/^\d+(\.\d+)?$/),
  total_budget: z.string().regex(/^\d+(\.\d+)?$/),
  currency: z.string(),
});
```

**Usage:**

```typescript
import { zValidator } from "@hono/zod-validator";

app.post("/sponsors/actions", zValidator("json", createActionSchema), async (c) => {
  const data = c.req.valid("json");  // Typed and validated
  // ...
});
```

---

## Response Patterns

### Success Response (200 OK)

```typescript
return c.json({
  success: true,
  data: { ... },
});
```

### Created (201 Created)

```typescript
return c.json({ id: "...", ...data }, 201);
```

### Error Responses

**Standard format:**

```typescript
return c.json({
  error: "error_code",
  message: "Human-readable message",
  details: { /* optional */ },
}, statusCode);
```

**Examples:**

```typescript
// 400 Bad Request
return c.json({
  error: "validation_failed",
  message: "Could not verify GitHub star",
}, 400);

// 402 Payment Required
return c.json({
  error: "no_sponsor",
  message: "No sponsor available for this resource",
  fallback: "Pay with USDC directly",
}, 402);

// 404 Not Found
return c.json({
  error: "not_found",
  message: "Redemption not found",
}, 404);

// 429 Too Many Requests
return c.json({
  error: "already_redeemed",
  message: "Action already completed",
  next_available: "2025-11-23T00:00:00Z",
}, 429);

// 500 Internal Server Error
return c.json({
  error: "internal_error",
  message: "An unexpected error occurred",
}, 500);
```

---

## Error Handling

**Pattern:** Centralized error handler middleware.

```typescript
// src/server/hono/middleware/error-handler.ts
import type { Context } from "hono";

export function errorHandler(err: Error, c: Context) {
  console.error(err);

  if (err instanceof ZodError) {
    return c.json({
      error: "validation_error",
      message: "Invalid request data",
      details: err.errors,
    }, 400);
  }

  return c.json({
    error: "internal_error",
    message: "An unexpected error occurred",
  }, 500);
}
```

**Register:**

```typescript
app.onError(errorHandler);
```

---

## Authentication (Future)

**Pattern:** Middleware for protected routes.

```typescript
// src/server/hono/middleware/auth.ts
import type { Context, Next } from "hono";

export async function requireSponsor(c: Context, next: Next) {
  const sponsorId = c.req.header("X-Sponsor-ID");

  if (!sponsorId) {
    return c.json({ error: "unauthorized" }, 401);
  }

  // Verify sponsor exists
  const sponsor = await db.query.sponsors.findFirst({
    where: eq(sponsors.id, sponsorId),
  });

  if (!sponsor) {
    return c.json({ error: "unauthorized" }, 401);
  }

  c.set("sponsor", sponsor);
  await next();
}
```

**Usage:**

```typescript
app.post("/sponsors/actions", requireSponsor, async (c) => {
  const sponsor = c.get("sponsor");
  // ...
});
```

---

## CORS Configuration

**Hackathon:** Allow all origins.

```typescript
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
}));
```

**Production:** Restrict origins.

```typescript
app.use("*", cors({
  origin: ["https://payload.exchange", "https://app.payload.exchange"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
}));
```

---

## Logging

**Use Hono logger:**

```typescript
import { logger } from "hono/logger";

app.use("*", logger());
```

**Custom logger (production):**

```typescript
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.url} - ${c.res.status} (${ms}ms)`);
});
```

---

## Rate Limiting (Future)

**Pattern:** Per-user or per-sponsor limits.

```typescript
import { rateLimiter } from "hono-rate-limiter";

app.use("/proxy/*", rateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,             // 100 requests per minute
  keyGenerator: (c) => c.req.header("X-User-ID") || c.req.header("CF-Connecting-IP"),
}));
```

---

## API Versioning (Future)

**Pattern:** Route prefix for versions.

```typescript
// v1 routes (default)
app.route("/v1", v1Routes);

// v2 routes
app.route("/v2", v2Routes);

// Default to v1
app.route("/", v1Routes);
```

---

## Testing Patterns

**Unit tests for validators:**

```typescript
import { describe, it, expect } from "vitest";
import { validateActionSchema } from "./validators";

describe("validateActionSchema", () => {
  it("accepts valid data", () => {
    const result = validateActionSchema.parse({
      redemption_id: crypto.randomUUID(),
      user_id: "0xAlice",
      proof: { username: "alice" },
    });
    expect(result).toBeDefined();
  });

  it("rejects invalid UUID", () => {
    expect(() => {
      validateActionSchema.parse({
        redemption_id: "not-a-uuid",
        user_id: "0xAlice",
        proof: {},
      });
    }).toThrow();
  });
});
```

**Integration tests for routes:**

```typescript
import { describe, it, expect } from "vitest";
import app from "../app";

describe("POST /actions/validate", () => {
  it("validates action successfully", async () => {
    const res = await app.request("/actions/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        redemption_id: "...",
        user_id: "0xAlice",
        proof: { username: "alice" },
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
```

---

## Related Files

- `01-x402-integration.md` - x402 payment patterns
- `02-proxy-design.md` - Proxy-specific patterns
- `../20-architecture/01-core-flows.md` - Request flows
- `src/server/hono/app.ts` - Hono app entry point
