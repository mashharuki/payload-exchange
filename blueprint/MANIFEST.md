# Blueprint Manifest

**Last Updated:** 2025-11-22
**Blueprint Version:** 2.0.0
**Repo Status:** ✅ IMPLEMENTED (with stubs)

This is the single source of truth for Payload Exchange architecture and conventions. Every file here is maintained with care and reviewed line-by-line.

**Legend:**
- ✅ = Fully implemented
- 🚧 = Partial/stub implementation
- ❌ = Not yet implemented
- 📝 = Planning/design only

## Directory Structure

### 00-core/ - Essential Foundations
- `00-overview.md` - **START HERE** - What is Payload Exchange, value proposition, hackathon scope
- `01-tech-stack.md` - ✅ Framework versions (Next.js 16, Hono, Drizzle, Neon, pnpm)
- `02-project-structure.md` - ✅ Folder conventions, naming patterns, import boundaries
- `03-quick-start.md` - ✅ Get running in 5 minutes (pnpm + Neon setup)
- `04-implementation-status.md` - **✅ IMPLEMENTATION STATUS** - What's done, what's stub, what's TODO

### 10-data/ - Data Layer
- `00-schema-core.md` - **✅ IMPLEMENTED** - 3 tables (sponsors, actions, redemptions), coverage system
- `01-type-contracts.md` - **CRITICAL** - TypeScript type rules (prevents 90% of bugs) - DB → App → API layers

### 20-architecture/ - System Architecture
- `00-system-architecture.md` - Overall system design, components, data flows, security model
- `01-core-flows.md` - **📝 NEEDS UPDATE** - Original design, actual implementation differs
- `02-plugin-system.md` - **✅ IMPLEMENTED** - 4 plugins, coverage system, recurrence logic

### 30-api/ - API Layer
- `00-api-patterns.md` - **✅ IMPLEMENTED** - Hono routes, validation, error handling
- `01-x402-integration.md` - **🚧 STUB** - x402 stubs need MCPay integration (see 04-implementation-status.md)
- `02-proxy-design.md` - **✅ IMPLEMENTED** - Proxy at `/proxy/:resourceId/*`


## Maintenance Rules

1. **Review Frequency**: Critical files (10-data, 20-auth, 30-api) reviewed monthly. Others quarterly.
2. **Update Trigger**: Update immediately when:
   - Database schema changes
   - New API patterns introduced
   - Breaking changes to core libraries
   - Critical bugs discovered that reveal missing rules
3. **Size Limit**: No blueprint file should exceed 300 lines. Split if needed.
4. **Generic vs Project-Specific**: Move to `90-generic/` only after proven on 2+ projects.

## How to Add New Blueprint Files

1. Create file in appropriate directory
2. Add entry to this MANIFEST
3. Update AGENTS.md to include it
4. Tag initial commit with "blueprint:add"


