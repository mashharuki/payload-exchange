# Core Flows

**Last Updated:** 2025-11-22

This document details the **exact step-by-step flows** for all major operations in Payload Exchange. Use this as the implementation guide.

---

## Flow 1: Proxy Request (First Time)

**Scenario:** User calls x402 API for the first time through proxy.

### Request

```http
GET /api/payload/proxy/weather.com/forecast?city=SF
Headers:
  User-Agent: AgentX/1.0
  X-User-ID: 0xAlice...
```

### Steps

```typescript
// 1. Extract target URL
const targetUrl = "https://weather.com/forecast?city=SF";
const userId = req.headers.get("X-User-ID") || generateSessionId();

// 2. Forward request to x402 API
const response = await fetch(targetUrl);

// 3. Check for x402 challenge
if (response.status === 402) {
  const challenge = await response.json();
  // { price: "1000000", currency: "USDC:base", nonce: "abc123" }

  // 4. Find matching sponsor actions
  const actions = await db.query.actions.findMany({
    where: and(
      eq(actions.status, "active"),
      gte(actions.totalBudget - actions.spent, challenge.price)
    ),
  });

  if (actions.length === 0) {
    return json({ error: "no_sponsor" }, 402);
  }

  // 5. Check if user has already redeemed any action
  const redemption = await db.query.redemptions.findFirst({
    where: and(
      eq(redemptions.userId, userId),
      inArray(redemptions.actionId, actions.map(a => a.id))
    ),
  });

  if (redemption) {
    // Check recurrence rules
    const action = actions.find(a => a.id === redemption.actionId);
    const canRedeem = await checkRecurrence(action, redemption, userId);

    if (!canRedeem) {
      return json({
        error: "already_redeemed",
        message: "Action already completed",
        next_available: calculateNextAvailable(action.config.recurrence),
      }, 429);
    }
  }

  // 6. Select action (simple: first match)
  const selectedAction = actions[0];

  // 7. Get plugin and generate instructions
  const plugin = getPlugin(selectedAction.pluginId);
  const actionInstance = await plugin.start({
    userId,
    actionId: selectedAction.id,
    resourceUrl: targetUrl,
  });

  // 8. Store pending redemption
  await db.insert(redemptions).values({
    id: crypto.randomUUID(),
    actionId: selectedAction.id,
    userId,
    resourceId: null, // Or lookup from resources table
    status: "pending",
    amountPaid: 0n,
    currency: challenge.currency,
    validationData: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 9. Return action to user
  return json({
    action_required: true,
    action: {
      id: actionInstance.actionInstanceId,
      plugin: selectedAction.pluginId,
      name: selectedAction.name,
      instructions: actionInstance.instructions,
      url: actionInstance.url,
    },
  });
}

// 10. If no challenge, return response as-is
return response;
```

### Response

```json
{
  "action_required": true,
  "action": {
    "id": "redemption-123",
    "plugin": "github-star",
    "name": "Star my repo",
    "instructions": "Please star the repository microchipgnu/payload-exchange on GitHub",
    "url": "https://github.com/microchipgnu/payload-exchange"
  }
}
```

---

## Flow 2: Validate Action

**Scenario:** User completed the action and wants to validate it.

### Request

```http
POST /api/payload/actions/validate
Content-Type: application/json

{
  "redemption_id": "redemption-123",
  "user_id": "0xAlice...",
  "proof": {
    "username": "alice"
  }
}
```

### Steps

```typescript
// 1. Validate request
const { redemption_id, user_id, proof } = validateActionSchema.parse(req.body);

// 2. Fetch redemption
const redemption = await db.query.redemptions.findFirst({
  where: and(
    eq(redemptions.id, redemption_id),
    eq(redemptions.userId, user_id),
    eq(redemptions.status, "pending")
  ),
});

if (!redemption) {
  return json({ error: "redemption_not_found" }, 404);
}

// 3. Fetch action
const action = await db.query.actions.findFirst({
  where: eq(actions.id, redemption.actionId),
});

// 4. Get plugin and validate
const plugin = getPlugin(action.pluginId);
const validation = await plugin.validate({
  userId: user_id,
  config: action.config,
  proof,
});

if (!validation.success) {
  return json({
    error: "validation_failed",
    reason: validation.reason,
  }, 400);
}

// 5. Update redemption to "validated"
await db.update(redemptions)
  .set({
    status: "validated",
    validationData: validation.data,
    updatedAt: new Date(),
  })
  .where(eq(redemptions.id, redemption_id));

// 6. Deduct sponsor balance
const sponsor = await db.query.sponsors.findFirst({
  where: eq(sponsors.id, action.sponsorId),
});

const balance = await db.query.sponsorBalances.findFirst({
  where: and(
    eq(sponsorBalances.sponsorId, sponsor.id),
    eq(sponsorBalances.currency, action.currency)
  ),
});

if (balance.amount < action.pricePerRedemption) {
  return json({ error: "insufficient_sponsor_balance" }, 500);
}

await db.update(sponsorBalances)
  .set({
    amount: balance.amount - action.pricePerRedemption,
    updatedAt: new Date(),
  })
  .where(eq(sponsorBalances.id, balance.id));

// 7. Update action.spent
await db.update(actions)
  .set({
    spent: action.spent + action.pricePerRedemption,
    status: (action.spent + action.pricePerRedemption >= action.totalBudget)
      ? "depleted"
      : action.status,
    updatedAt: new Date(),
  })
  .where(eq(actions.id, action.id));

// 8. Update redemption to "paid"
await db.update(redemptions)
  .set({
    status: "paid",
    amountPaid: action.pricePerRedemption,
    completedAt: new Date(),
    updatedAt: new Date(),
  })
  .where(eq(redemptions.id, redemption_id));

// 9. Return success
return json({
  success: true,
  redemption_id,
  amount_paid: action.pricePerRedemption.toString(),
  currency: action.currency,
});
```

### Response

```json
{
  "success": true,
  "redemption_id": "redemption-123",
  "amount_paid": "500000",
  "currency": "USDC:base"
}
```

---

## Flow 3: Re-run API Call After Validation

**Scenario:** After action validation, user re-runs the original API call.

### Request

```http
GET /api/payload/proxy/weather.com/forecast?city=SF
Headers:
  X-User-ID: 0xAlice...
  X-Redemption-ID: redemption-123
```

### Steps

```typescript
// 1. Extract redemption ID
const redemptionId = req.headers.get("X-Redemption-ID");

if (redemptionId) {
  // 2. Fetch redemption
  const redemption = await db.query.redemptions.findFirst({
    where: and(
      eq(redemptions.id, redemptionId),
      eq(redemptions.status, "paid")
    ),
  });

  if (!redemption) {
    return json({ error: "invalid_redemption" }, 400);
  }

  // 3. Fetch action and sponsor
  const action = await db.query.actions.findFirst({
    where: eq(actions.id, redemption.actionId),
  });

  const sponsor = await db.query.sponsors.findFirst({
    where: eq(sponsors.id, action.sponsorId),
  });

  // 4. Pay x402 API using sponsor funds
  const targetUrl = "https://weather.com/forecast?city=SF";
  const payment = await payX402Challenge({
    url: targetUrl,
    amount: redemption.amountPaid,
    currency: redemption.currency,
    sponsorAddress: sponsor.address,
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
    metadata: payment.receipt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 6. Make authenticated request to x402 API
  const response = await fetch(targetUrl, {
    headers: {
      "X-402-Payment": payment.signature,
    },
  });

  // 7. Return real data
  return response;
}

// If no redemption ID, follow normal flow (Flow 1)
// ...
```

### Response

```json
{
  "forecast": "Sunny, 72°F",
  "location": "San Francisco",
  "date": "2025-11-22"
}
```

---

## Flow 4: Sponsor Funding

**Scenario:** Sponsor adds funds to their balance.

### Request

```http
POST /api/payload/sponsors/fund
Content-Type: application/json
Headers:
  X-Sponsor-ID: sponsor-123

{
  "amount": "10.0",
  "currency": "USDC:base"
}
```

### Steps

```typescript
// 1. Validate request
const { amount, currency } = fundBalanceSchema.parse(req.body);
const sponsorId = req.headers.get("X-Sponsor-ID");

// 2. Convert amount to bigint
const amountBigInt = parseCurrency(amount, currency);  // 10.0 → 10000000n

// 3. Generate x402 payment challenge
const challenge = {
  nonce: crypto.randomUUID(),
  price: amountBigInt.toString(),
  currency,
  paymentUrl: `https://payment.x402.com/pay?nonce=${nonce}`,
};

// 4. Store pending transaction
await db.insert(transactions).values({
  id: crypto.randomUUID(),
  sponsorId,
  type: "funding",
  amount: amountBigInt,
  currency,
  status: "pending",
  nonce: challenge.nonce,
  createdAt: new Date(),
});

// 5. Return challenge to sponsor
return json({ challenge });
```

### Response

```json
{
  "challenge": {
    "nonce": "xyz789",
    "price": "10000000",
    "currency": "USDC:base",
    "paymentUrl": "https://payment.x402.com/pay?nonce=xyz789"
  }
}
```

### Webhook (Payment Confirmed)

```http
POST /api/payload/webhooks/x402
Content-Type: application/json

{
  "nonce": "xyz789",
  "status": "confirmed",
  "tx_hash": "0xabc...",
  "timestamp": "2025-11-22T10:00:00Z"
}
```

```typescript
// 1. Validate webhook signature (x402 specific)
// ...

// 2. Find transaction
const tx = await db.query.transactions.findFirst({
  where: eq(transactions.nonce, nonce),
});

// 3. Update or create sponsor balance
const balance = await db.query.sponsorBalances.findFirst({
  where: and(
    eq(sponsorBalances.sponsorId, tx.sponsorId),
    eq(sponsorBalances.currency, tx.currency)
  ),
});

if (balance) {
  await db.update(sponsorBalances)
    .set({
      amount: balance.amount + tx.amount,
      updatedAt: new Date(),
    })
    .where(eq(sponsorBalances.id, balance.id));
} else {
  await db.insert(sponsorBalances).values({
    id: crypto.randomUUID(),
    sponsorId: tx.sponsorId,
    currency: tx.currency,
    amount: tx.amount,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// 4. Update transaction status
await db.update(transactions)
  .set({
    status: "confirmed",
    txHash: tx_hash,
    completedAt: new Date(),
  })
  .where(eq(transactions.id, tx.id));

// 5. Return success
return json({ success: true });
```

---

## Flow 5: Create Action

**Scenario:** Sponsor creates a new action.

### Request

```http
POST /api/payload/sponsors/actions
Content-Type: application/json
Headers:
  X-Sponsor-ID: sponsor-123

{
  "plugin_id": "github-star",
  "name": "Star my repo",
  "config": {
    "type": "github-star",
    "repo": "microchipgnu/payload-exchange",
    "recurrence": "once"
  },
  "price_per_redemption": "0.5",
  "total_budget": "50.0",
  "currency": "USDC:base"
}
```

### Steps

```typescript
// 1. Validate request
const data = createActionSchema.parse(req.body);
const sponsorId = req.headers.get("X-Sponsor-ID");

// 2. Get plugin and validate config
const plugin = getPlugin(data.plugin_id);
const config = plugin.validateConfig(data.config);

// 3. Convert amounts to bigint
const pricePerRedemption = parseCurrency(data.price_per_redemption, data.currency);
const totalBudget = parseCurrency(data.total_budget, data.currency);

// 4. Check sponsor balance
const balance = await db.query.sponsorBalances.findFirst({
  where: and(
    eq(sponsorBalances.sponsorId, sponsorId),
    eq(sponsorBalances.currency, data.currency)
  ),
});

if (!balance || balance.amount < totalBudget) {
  return json({ error: "insufficient_balance" }, 400);
}

// 5. Create action
const actionId = crypto.randomUUID();
await db.insert(actions).values({
  id: actionId,
  sponsorId,
  pluginId: data.plugin_id,
  name: data.name,
  config,
  pricePerRedemption,
  currency: data.currency,
  totalBudget,
  spent: 0n,
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
});

// 6. Return action
return json({ id: actionId, ...data }, 201);
```

### Response

```json
{
  "id": "action-456",
  "plugin_id": "github-star",
  "name": "Star my repo",
  "config": {
    "type": "github-star",
    "repo": "microchipgnu/payload-exchange",
    "recurrence": "once"
  },
  "price_per_redemption": "0.5",
  "total_budget": "50.0",
  "currency": "USDC:base",
  "status": "active"
}
```

---

## Error Handling Patterns

### Standard Error Response

```json
{
  "error": "error_code",
  "message": "Human-readable message",
  "details": { /* optional */ }
}
```

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `no_sponsor` | 402 | No sponsor available for resource |
| `already_redeemed` | 429 | Action already completed (recurrence limit) |
| `validation_failed` | 400 | Action validation failed |
| `sponsor_depleted` | 500 | Sponsor budget exhausted |
| `insufficient_balance` | 400 | Sponsor has insufficient balance |
| `invalid_redemption` | 400 | Redemption not found or invalid |

---

## Related Files

- `00-system-architecture.md` - Overall architecture
- `02-plugin-system.md` - Plugin validation details
- `../30-api/00-api-patterns.md` - API design patterns
- `../30-api/01-x402-integration.md` - x402 payment flow
