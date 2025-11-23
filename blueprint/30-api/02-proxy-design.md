# Proxy Design

**Last Updated:** 2025-11-22

The Payload Exchange proxy sits between users and x402 APIs, intercepting payment challenges and replacing them with sponsor-funded actions.

---

## Proxy Architecture

```
User Request → Proxy → x402 API → 402 Challenge → Match Sponsor → Return Action
                ↓
         (if validated)
                ↓
    Pay with Sponsor Funds → Re-run Request → Return Data
```

---

## Route Structure

**Base:** `/api/payload/proxy/`

**Pattern:** `/api/payload/proxy/{domain}/{path}`

**Examples:**
```
/api/payload/proxy/weather.com/forecast?city=SF
/api/payload/proxy/news.api/articles/latest
/api/payload/proxy/api.github.com/repos/microchipgnu/payload-exchange
```

---

## Implementation

**Location:** `src/server/hono/routes/proxy.ts`

```typescript
import { Hono } from "hono";
import { fetchWithX402, payX402Challenge, fetchWithPayment } from "@/server/core/x402/client";
import { findMatchingActions } from "@/server/core/actions/matcher";
import { getPlugin } from "@/server/core/actions/registry";
import { db } from "@/server/db/client";

const proxy = new Hono();

/**
 * Proxy all requests through Payload Exchange.
 * Pattern: /proxy/{domain}/{path}
 */
proxy.all("/*", async (c) => {
  // 1. Parse target URL
  const path = c.req.path.replace("/proxy/", "");
  const targetUrl = `https://${path}${c.req.url.includes("?") ? `?${c.req.url.split("?")[1]}` : ""}`;

  // 2. Extract user ID (from header or generate session)
  const userId = c.req.header("X-User-ID") || generateSessionId();

  // 3. Check for redemption ID (if user already validated action)
  const redemptionId = c.req.header("X-Redemption-ID");

  if (redemptionId) {
    // User has already validated an action, pay and return data
    return handleAuthenticatedRequest(c, targetUrl, userId, redemptionId);
  }

  // 4. Forward request to x402 API
  const result = await fetchWithX402(targetUrl);

  // 5. If no challenge, return response directly
  if (result.status === 200) {
    return c.json(result.data);
  }

  // 6. If 402 challenge, match with sponsor action
  if (result.status === 402 && result.challenge) {
    return handlePaymentChallenge(c, targetUrl, userId, result.challenge);
  }

  // 7. Other status codes → pass through
  return c.json({ error: "unexpected_status", status: result.status }, result.status);
});

/**
 * Handle 402 Payment Required challenge.
 */
async function handlePaymentChallenge(
  c: Context,
  targetUrl: string,
  userId: string,
  challenge: X402Challenge
) {
  // 1. Find matching sponsor actions
  const actions = await findMatchingActions({
    resourceUrl: targetUrl,
    currency: challenge.currency,
    minAmount: BigInt(challenge.price),
  });

  if (actions.length === 0) {
    return c.json({
      error: "no_sponsor",
      message: "No sponsor available for this resource",
      fallback: "Pay with USDC directly",
      challenge,  // Allow user to pay directly if they want
    }, 402);
  }

  // 2. Check if user has already redeemed any action
  const existingRedemption = await db.query.redemptions.findFirst({
    where: and(
      eq(redemptions.userId, userId),
      inArray(redemptions.actionId, actions.map(a => a.id))
    ),
    orderBy: [desc(redemptions.createdAt)],
  });

  if (existingRedemption) {
    // Check recurrence rules
    const action = actions.find(a => a.id === existingRedemption.actionId);
    const canRedeem = await checkRecurrence(action, existingRedemption, userId);

    if (!canRedeem) {
      return c.json({
        error: "already_redeemed",
        message: "You've already completed this action",
        next_available: calculateNextAvailable(action.config.recurrence, existingRedemption),
      }, 429);
    }
  }

  // 3. Select action (simple: first match, or highest reward)
  const selectedAction = actions[0];

  // 4. Get plugin and start action
  const plugin = getPlugin(selectedAction.pluginId);
  const actionInstance = await plugin.start({
    userId,
    actionId: selectedAction.id,
    resourceUrl: targetUrl,
  });

  // 5. Create pending redemption
  const redemptionId = crypto.randomUUID();
  await db.insert(redemptions).values({
    id: redemptionId,
    actionId: selectedAction.id,
    userId,
    resourceId: null,  // TODO: lookup from resources table
    status: "pending",
    amountPaid: 0n,
    currency: challenge.currency,
    validationData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 6. Return action to user
  return c.json({
    action_required: true,
    action: {
      id: redemptionId,
      plugin: selectedAction.pluginId,
      name: selectedAction.name,
      instructions: actionInstance.instructions,
      url: actionInstance.url,
    },
  });
}

/**
 * Handle authenticated request (after action validation).
 */
async function handleAuthenticatedRequest(
  c: Context,
  targetUrl: string,
  userId: string,
  redemptionId: string
) {
  // 1. Fetch redemption
  const redemption = await db.query.redemptions.findFirst({
    where: and(
      eq(redemptions.id, redemptionId),
      eq(redemptions.userId, userId),
      eq(redemptions.status, "paid")
    ),
  });

  if (!redemption) {
    return c.json({
      error: "invalid_redemption",
      message: "Redemption not found or not paid",
    }, 400);
  }

  // 2. Fetch action and sponsor
  const action = await db.query.actions.findFirst({
    where: eq(actions.id, redemption.actionId),
  });

  const sponsor = await db.query.sponsors.findFirst({
    where: eq(sponsors.id, action.sponsorId),
  });

  // 3. Fetch original challenge (stored in redemption metadata)
  const challenge = redemption.validationData.challenge as X402Challenge;

  // 4. Pay x402 API using sponsor funds
  const payment = await payX402Challenge({
    challenge,
    sponsorAddress: sponsor.address,
    privateKey: process.env.SPONSOR_WALLET_PRIVATE_KEY!,  // Custodial for hackathon
  });

  // 5. Store payment record
  await db.insert(x402Payments).values({
    id: crypto.randomUUID(),
    sponsorId: sponsor.id,
    redemptionId: redemption.id,
    resourceId: redemption.resourceId,
    amount: redemption.amountPaid,
    currency: redemption.currency,
    txHash: payment.txHash,
    status: "confirmed",
    metadata: payment,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 6. Make authenticated request to x402 API
  const data = await fetchWithPayment(targetUrl, payment);

  // 7. Return real data
  return c.json(data);
}

/**
 * Generate a session ID for anonymous users.
 */
function generateSessionId(): string {
  return `session-${crypto.randomUUID()}`;
}

export default proxy;
```

---

## URL Parsing

### Parse Target URL

```typescript
export function parseProxyUrl(requestPath: string): {
  domain: string;
  path: string;
  fullUrl: string;
} {
  // Remove /proxy/ prefix
  const withoutPrefix = requestPath.replace(/^\/proxy\//, "");

  // Split into domain and path
  const firstSlash = withoutPrefix.indexOf("/");
  const domain = firstSlash === -1 ? withoutPrefix : withoutPrefix.slice(0, firstSlash);
  const path = firstSlash === -1 ? "" : withoutPrefix.slice(firstSlash);

  return {
    domain,
    path,
    fullUrl: `https://${domain}${path}`,
  };
}
```

**Examples:**

| Input | Domain | Path | Full URL |
|-------|--------|------|----------|
| `/proxy/weather.com/forecast` | `weather.com` | `/forecast` | `https://weather.com/forecast` |
| `/proxy/api.github.com/repos/foo/bar` | `api.github.com` | `/repos/foo/bar` | `https://api.github.com/repos/foo/bar` |

---

## Query Parameters

**Pass-through:** All query parameters are forwarded to the target API.

```http
GET /api/payload/proxy/weather.com/forecast?city=SF&units=metric

Forwards to:
GET https://weather.com/forecast?city=SF&units=metric
```

---

## Headers

### User → Proxy

| Header | Purpose | Required |
|--------|---------|----------|
| `X-User-ID` | User identifier (wallet address or session) | Optional |
| `X-Redemption-ID` | Redemption ID (after action validation) | Optional |
| `Authorization` | User's auth token (future) | Optional |

### Proxy → x402 API

| Header | Purpose |
|--------|---------|
| `X-402-Payment` | Payment signature (after validation) |
| `X-402-Nonce` | Challenge nonce |
| `X-402-TxHash` | Transaction hash (if on-chain) |
| `User-Agent` | Proxy identifier |

---

## Caching (Future)

**Pattern:** Cache responses per user/resource.

```typescript
import { createCache } from "@/server/core/cache";

const cache = createCache({ ttl: 60 * 5 });  // 5 minutes

// Before fetching x402 API
const cached = await cache.get(`${userId}:${targetUrl}`);
if (cached) {
  return c.json(cached);
}

// After successful response
await cache.set(`${userId}:${targetUrl}`, data);
```

**Cache invalidation:**
- TTL-based (5-10 minutes)
- Manual invalidation on action completion

---

## Rate Limiting

**Pattern:** Per-user limits.

```typescript
import { rateLimiter } from "hono-rate-limiter";

proxy.use("/*", rateLimiter({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,             // 100 requests per minute per user
  keyGenerator: (c) => c.req.header("X-User-ID") || "anonymous",
}));
```

---

## Error Handling

### Network Errors

```typescript
try {
  const result = await fetchWithX402(targetUrl);
} catch (err) {
  return c.json({
    error: "network_error",
    message: "Failed to reach x402 API",
    details: err.message,
  }, 502);  // Bad Gateway
}
```

### Timeout

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);  // 10s

try {
  const response = await fetch(targetUrl, { signal: controller.signal });
} catch (err) {
  if (err.name === "AbortError") {
    return c.json({ error: "timeout" }, 504);  // Gateway Timeout
  }
  throw err;
} finally {
  clearTimeout(timeout);
}
```

---

## Security

### 1. URL Validation

**Prevent SSRF (Server-Side Request Forgery):**

```typescript
const ALLOWED_DOMAINS = [
  "weather.com",
  "api.github.com",
  "news.api",
  // ... whitelist
];

export function validateProxyUrl(url: string): boolean {
  const parsed = new URL(url);

  // Only HTTPS
  if (parsed.protocol !== "https:") {
    return false;
  }

  // Whitelist domains (hackathon)
  if (!ALLOWED_DOMAINS.includes(parsed.hostname)) {
    return false;
  }

  // Prevent localhost/internal IPs
  const hostname = parsed.hostname;
  if (
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.")
  ) {
    return false;
  }

  return true;
}
```

### 2. Request Sanitization

```typescript
// Strip sensitive headers before forwarding
const BLOCKED_HEADERS = [
  "cookie",
  "authorization",
  "x-api-key",
];

function sanitizeHeaders(headers: Headers): Headers {
  const sanitized = new Headers(headers);
  BLOCKED_HEADERS.forEach(h => sanitized.delete(h));
  return sanitized;
}
```

### 3. Response Validation

```typescript
// Ensure response is JSON (prevent XSS)
const contentType = response.headers.get("content-type");
if (!contentType?.includes("application/json")) {
  return c.json({ error: "invalid_content_type" }, 500);
}
```

---

## Monitoring

### Metrics to Track

1. **Request volume:** Per resource, per user
2. **Challenge rate:** % of requests that hit 402
3. **Action completion rate:** % of actions validated
4. **Latency:** Time from request → response
5. **Error rate:** Failed validations, network errors

### Logging

```typescript
console.log({
  event: "proxy_request",
  userId,
  targetUrl,
  status: result.status,
  duration: Date.now() - start,
});
```

---

## Related Files

- `00-api-patterns.md` - API conventions
- `01-x402-integration.md` - x402 payment flow
- `../20-architecture/01-core-flows.md` - Request flows
- `src/server/hono/routes/proxy.ts` - Implementation
