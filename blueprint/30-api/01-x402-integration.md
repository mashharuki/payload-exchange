# x402 Integration

**Last Updated:** 2025-11-22

This document describes how Payload Exchange integrates with the x402 payment protocol.

---

## x402 Protocol Overview

**DECISION NEEDED:** Clarify exact x402 protocol details.

**Assumptions (to be confirmed):**
- x402 is an HTTP-based micropayment protocol
- APIs return `402 Payment Required` with payment challenge
- Payment is made via signed transaction or message
- Payment receipt is sent back to API in subsequent request

---

## Challenge Flow

### 1. API Returns 402

```http
GET /api/weather/forecast?city=SF
Host: weather.com

HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "price": "1000000",        # Amount in smallest unit (e.g., 6 decimals for USDC)
  "currency": "USDC:base",   # Currency and chain
  "nonce": "abc123",         # Unique challenge ID
  "expires_at": "2025-11-22T10:05:00Z",
  "payment_url": "https://payment.x402.com/pay?nonce=abc123"  # Optional
}
```

**DECISION NEEDED:**
- What other fields are in the challenge?
- Is there a `recipient` address?
- Are there protocol-specific metadata fields?

---

## Payment Methods

### Option A: On-Chain Transaction

**Flow:**
1. Parse challenge
2. Create on-chain transaction (ERC-20 transfer)
3. Sign with sponsor wallet
4. Submit to blockchain
5. Wait for confirmation
6. Send tx hash back to API

**Pros:** Fully decentralized, trustless
**Cons:** Slow (block confirmations), expensive (gas fees)

### Option B: Off-Chain Signature (EIP-712)

**Flow:**
1. Parse challenge
2. Create EIP-712 typed message
3. Sign with sponsor wallet (no gas)
4. Send signature to API
5. API verifies signature

**Pros:** Instant, no gas fees
**Cons:** Requires API to trust off-chain signatures

**DECISION NEEDED:** Which method does x402 use?

---

## Implementation: x402 Client

**Location:** `src/server/core/x402/client.ts`

```typescript
export type X402Challenge = {
  price: string;
  currency: string;
  nonce: string;
  expiresAt?: string;
  paymentUrl?: string;
  recipient?: string;
};

export type X402Payment = {
  nonce: string;
  signature: string;
  txHash?: string;
  timestamp: string;
};

/**
 * Fetch a resource and check for x402 challenge.
 */
export async function fetchWithX402(url: string): Promise<{
  status: number;
  data?: any;
  challenge?: X402Challenge;
}> {
  const response = await fetch(url);

  if (response.status === 402) {
    const challenge = await response.json();
    return { status: 402, challenge };
  }

  if (response.ok) {
    const data = await response.json();
    return { status: 200, data };
  }

  throw new Error(`Unexpected status: ${response.status}`);
}

/**
 * Pay an x402 challenge using sponsor funds.
 */
export async function payX402Challenge(params: {
  challenge: X402Challenge;
  sponsorAddress: string;
  privateKey: string;  // Or use wallet connector
}): Promise<X402Payment> {
  // DECISION NEEDED: Implement based on x402 payment method

  // Example (EIP-712 signature):
  const message = {
    nonce: params.challenge.nonce,
    price: params.challenge.price,
    currency: params.challenge.currency,
    sponsor: params.sponsorAddress,
  };

  const signature = await signEIP712(message, params.privateKey);

  return {
    nonce: params.challenge.nonce,
    signature,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Make authenticated request with x402 payment.
 */
export async function fetchWithPayment(
  url: string,
  payment: X402Payment
): Promise<any> {
  const response = await fetch(url, {
    headers: {
      "X-402-Payment": payment.signature,
      "X-402-Nonce": payment.nonce,
      ...(payment.txHash && { "X-402-TxHash": payment.txHash }),
    },
  });

  if (!response.ok) {
    throw new Error(`Payment failed: ${response.status}`);
  }

  return response.json();
}
```

---

## Sponsor Wallet Management

**DECISION NEEDED:** How are sponsor wallets managed?

### Option A: Custodial (Hackathon-Friendly)

- Payload Exchange holds sponsor private keys
- Sponsors fund via x402, we manage the wallet
- ✅ Simple, fast to implement
- ❌ Centralized, trust required

### Option B: Non-Custodial (Production)

- Sponsors sign with their own wallet
- We request signatures via WalletConnect or similar
- ✅ Trustless
- ❌ Requires sponsor to be online to pay APIs

**Recommendation:** Start with custodial for hackathon, migrate to non-custodial later.

---

## Funding Flow

### Sponsor Funds Balance

```
1. Sponsor calls: POST /sponsors/fund
   { amount: "10.0", currency: "USDC:base" }

2. Backend generates x402 challenge
   Response: { challenge: { nonce, price, paymentUrl } }

3. Sponsor pays via x402 (external)
   - Opens paymentUrl
   - Connects wallet
   - Signs transaction

4. x402 payment gateway confirms payment
   - Calls webhook: POST /webhooks/x402
   - Payload: { nonce, status: "confirmed", txHash }

5. Backend updates sponsor balance
   - Find transaction by nonce
   - Increment sponsor_balances.amount
   - Mark transaction as confirmed
```

---

## Payment Confirmation

### Option A: Webhook

**x402 payment gateway calls us:**

```http
POST /api/payload/webhooks/x402
Content-Type: application/json
X-Signature: <hmac-signature>

{
  "nonce": "xyz789",
  "status": "confirmed",
  "tx_hash": "0xabc...",
  "amount": "10000000",
  "currency": "USDC:base",
  "timestamp": "2025-11-22T10:00:00Z"
}
```

**Verify signature:**

```typescript
export function verifyX402Webhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  const expected = hmac.digest("hex");
  return signature === expected;
}
```

### Option B: Polling

**We poll for payment status:**

```typescript
export async function checkPaymentStatus(nonce: string): Promise<{
  status: "pending" | "confirmed" | "failed";
  txHash?: string;
}> {
  const response = await fetch(`https://payment.x402.com/status/${nonce}`);
  return response.json();
}
```

**DECISION NEEDED:** Which method does x402 support?

---

## Error Handling

### Challenge Expired

```json
{
  "error": "challenge_expired",
  "message": "Payment challenge has expired",
  "expires_at": "2025-11-22T10:05:00Z"
}
```

### Payment Failed

```json
{
  "error": "payment_failed",
  "message": "Transaction reverted or insufficient funds"
}
```

### Invalid Signature

```json
{
  "error": "invalid_signature",
  "message": "Payment signature verification failed"
}
```

---

## Security Considerations

1. **Nonce Validation:** Ensure nonces are used only once
2. **Signature Verification:** Always verify signatures server-side
3. **Amount Matching:** Verify payment amount matches challenge
4. **Expiration:** Reject expired challenges
5. **Replay Protection:** Store used nonces in DB

---

## Environment Configuration

```bash
# x402 Payment Gateway
X402_API_URL=https://payment.x402.com
X402_WEBHOOK_SECRET=<secret-for-hmac-verification>

# Sponsor Wallet (Custodial Mode)
SPONSOR_WALLET_PRIVATE_KEY=<private-key>
SPONSOR_WALLET_ADDRESS=<address>
```

---

## Testing

### Mock x402 API (Development)

```typescript
// src/server/core/x402/mock.ts
export function mockX402API() {
  return {
    "/weather/forecast": {
      challenge: {
        price: "1000000",
        currency: "USDC:base",
        nonce: "test-nonce-123",
      },
      response: {
        forecast: "Sunny, 72°F",
      },
    },
  };
}
```

### Test Cases

1. **Successful payment flow**
2. **Expired challenge**
3. **Insufficient sponsor balance**
4. **Invalid signature**
5. **Webhook replay attack**

---

## Related Files

- `00-api-patterns.md` - API design patterns
- `02-proxy-design.md` - Proxy implementation
- `../20-architecture/01-core-flows.md` - Payment flows
- `src/server/core/x402/client.ts` - x402 client implementation
