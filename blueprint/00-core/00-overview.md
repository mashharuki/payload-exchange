# Payload Exchange - Project Overview

**Last Updated:** 2025-11-22

## What is Payload Exchange?

Payload Exchange is a proxy service that allows users to access x402-protected APIs **for free** by performing sponsor-defined actions instead of paying with USDC.

**The Value Proposition:**

- **For Users/Agents:** Access premium APIs without spending money—just complete simple actions
- **For Sponsors:** Pay for valuable user actions (emails, follows, stars, form submissions) instead of traditional ads
- **For API Providers:** Still get paid via x402—they don't care where the money came from

## How It Works (30-Second Version)

1. User wants to call an x402-protected API
2. They route the call through Payload Exchange proxy
3. Proxy intercepts the x402 payment challenge
4. Proxy matches it with a sponsor who'll pay for a specific action
5. User completes the action (e.g., "Follow @microchipgnu on X")
6. Sponsor's balance pays the API via x402
7. User gets the API response—no USDC required

## Core Architecture

```
┌─────────┐          ┌──────────────────┐          ┌─────────────┐
│  User/  │  calls   │ Payload Exchange │  pays    │  x402 API   │
│  Agent  │ ────────>│      Proxy       │ ────────>│  Provider   │
└─────────┘          └──────────────────┘          └─────────────┘
                              ▲
                              │ funds + configures
                              │
                         ┌─────────┐
                         │ Sponsor │
                         └─────────┘
```

**Components:**

1. **Payload Proxy** - Handles x402 challenges, matches sponsors, processes payments
2. **Action Plugin System** - Runtime-native plugins for validating user actions
3. **Sponsor Dashboard** - Fund balance, configure actions, view analytics
4. **User Search UI** - Browse x402 resources, access them via proxy

## Hackathon Scope (MVP)

This is a **hackathon project** focused on proving the concept works. We're building:

**IN SCOPE:**
- ✅ Proxy that intercepts x402 challenges
- ✅ Sponsor funding via x402
- ✅ Runtime-native action plugins (email, survey, GitHub star, code verification)
- ✅ Sponsor dashboard (fund, configure, analytics)
- ✅ User search engine UI
- ✅ End-to-end demo flow

**OUT OF SCOPE (for now):**
- ❌ External plugin system (third-party plugins)
- ❌ On-chain facilitator integration
- ❌ Advanced matching algorithms
- ❌ Multi-sponsor bidding
- ❌ Withdraw functionality (UI only, no actual withdrawals)

## Key Principles

1. **Simple beats clever** - This is a hackathon demo, not production software
2. **Runtime-native plugins only** - No external integrations for MVP
3. **Proxy-first architecture** - Users just change the base URL, no client changes needed
4. **Sponsor-pays model** - All x402 payments come from sponsor balances

## Success Criteria

The hackathon demo is successful if we can show:

1. User calls x402 API through our proxy
2. Proxy responds: "Do action X to unlock"
3. User completes action → plugin validates
4. Sponsor balance decreases
5. API call succeeds with real data
6. Sponsor dashboard shows the spend

## Related Files

- `01-tech-stack.md` - Technologies and versions
- `02-project-structure.md` - Folder organization
- `03-quick-start.md` - Get running in 5 minutes
- `../20-architecture/00-system-architecture.md` - Detailed architecture
- `../20-architecture/01-core-flows.md` - Request/response flows
