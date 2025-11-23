# Payload Exchange

**Accept anything as payment!** An x402 proxy where sponsors pay for user access in exchange for actions.

Payload Exchange is a proxy layer that intercepts x402 payment requests and introduces a third party: **Sponsors**. This expands the end users' experience to alternative payments other than stablecoins or other monetary currencies, by having sponsors cover the payment (fully or partially) in exchange for user actions or data.

## 🎯 Overview

Imagine a near future where quality content providers put their resources (APIs, articles, videos, data endpoints, digital goods...) behind x402 payment walls. Majority of them might be trivial tasks with small fees, some even consumed by AI agents. For better user experience and more sophisticated agentic workflows, these x402 payments can be sponsored in exchange for some minor action or data from the user—a really free way to pay with whatever you've got to offer.

### Key Features

- **x402 Proxy Layer**: Intercepts and manages x402 payment requests
- **Sponsor Integration**: Allows sponsors to cover payments in exchange for user actions
- **Action Plugins**: Flexible plugin system for different action types (email capture, surveys, GitHub stars, code verification)
- **ChatGPT Integration**: Built with OpenAI Apps SDK and Model Context Protocol (MCP) for native ChatGPT widget rendering
- **Wallet Support**: CDP (Coinbase Developer Platform) embedded wallets for seamless payments
- **Resource Discovery**: Search and browse available x402-protected resources

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "ChatGPT Client"
        ChatGPT[ChatGPT Interface]
        Widget[Widget Renderer]
    end

    subgraph "Payload Exchange"
        MCP[MCP Server<br/>app/mcp/route.ts]
        Proxy[Proxy Layer<br/>app/api/proxy]
        Paywall[Paywall System<br/>app/paywall]
        Resources[Resource Registry<br/>server/core/resources]
    end

    subgraph "Action System"
        Registry[Action Registry<br/>server/core/actions]
        Email[Email Capture Plugin]
        Survey[Survey Plugin]
        GitHub[GitHub Star Plugin]
        Code[Code Verification Plugin]
    end

    subgraph "Payment Layer"
        X402[x402 Client<br/>server/core/x402]
        CDP[CDP Wallets<br/>components/cdp-provider]
        Treasury[Treasury Wallet]
    end

    subgraph "External Services"
        Upstream[Upstream x402 Resources]
        Sponsor[Sponsors]
        User[End Users]
    end

    ChatGPT -->|Tool Calls| MCP
    MCP -->|Widget HTML| Widget
    Widget -->|Renders| Paywall
    
    User -->|Requests Resource| Proxy
    Proxy -->|Intercepts| Upstream
    Upstream -->|402 Payment Required| Proxy
    Proxy -->|Shows| Paywall
    
    Paywall -->|Lists Actions| Registry
    Registry --> Email
    Registry --> Survey
    Registry --> GitHub
    Registry --> Code
    
    User -->|Completes Action| Paywall
    Paywall -->|Validates| Registry
    Registry -->|Reward Eligible| Sponsor
    
    Sponsor -->|Covers Payment| X402
    X402 -->|Pays| Upstream
    Upstream -->|Returns Resource| Proxy
    Proxy -->|Delivers| User
    
    Paywall -->|Direct Payment| CDP
    CDP -->|USDC Payment| X402
    
    X402 -->|Settles| Treasury
    
    MCP -->|Queries| Resources
    Resources -->|Metadata| Paywall
```

## 📁 Project Structure

```
payload-exchange/
├── app/
│   ├── (dashboard)/          # Dashboard routes
│   │   ├── sponsor/          # Sponsor management
│   │   └── user/             # User management
│   ├── api/
│   │   ├── payload/         # x402 proxy endpoints
│   │   └── proxy/           # General proxy routes
│   ├── mcp/
│   │   └── route.ts         # MCP server for ChatGPT integration
│   ├── paywall/
│   │   └── paywall-client.tsx  # Paywall UI component
│   └── resources/           # Resource discovery UI
│
├── components/
│   ├── paywall-widget.tsx   # Main paywall component
│   ├── cdp-provider.tsx     # CDP wallet provider
│   └── ui/                  # Reusable UI components
│
├── server/
│   ├── core/
│   │   ├── actions/         # Action plugin system
│   │   │   ├── registry.ts  # Plugin registry
│   │   │   └── plugins/     # Action plugins
│   │   ├── resources/       # Resource management
│   │   │   └── registry.ts  # Resource registry
│   │   └── x402/            # x402 client implementation
│   ├── db/                  # Database schema and queries
│   └── hono/                # Hono API routes
│
└── hooks/                   # React hooks for app functionality
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (for production)
- CDP Project ID from [Coinbase Developer Platform](https://portal.cdp.coinbase.com)

### Installation

```bash
# Install dependencies
npm install
# or
pnpm install
# or
bun install
```

### Environment Setup

Copy `.env.example` to `.env.local` and configure:

```bash
# Application URL (required for iframe rendering)
TUNNEL_URL=http://localhost:3000

# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/payload_exchange

# CDP Configuration
NEXT_PUBLIC_CDP_PROJECT_ID=your-project-id

# Treasury wallet for receiving payments
TREASURY_WALLET_ADDRESS=0x...
TREASURY_PRIVATE_KEY=0x...

# x402 endpoint (optional, for custom x402 implementation)
X402_ENDPOINT=https://...

# VLayer configuration (for verification)
VLAYER_API_ENDPOINT=https://...
VLAYER_CLIENT_ID=...
VLAYER_BEARER_TOKEN=...
```

### CDP Embedded Wallets Setup

1. **Get your CDP Project ID:**
   - Sign up at [CDP Portal](https://portal.cdp.coinbase.com)
   - Create a new project and copy your Project ID

2. **Configure your domain:**
   - Navigate to [Domains Configuration](https://portal.cdp.coinbase.com/products/embedded-wallets/domains)
   - Add `http://localhost:3000` for local development
   - Add your production domain when deploying

3. **Set environment variable:**
   ```bash
   NEXT_PUBLIC_CDP_PROJECT_ID=your-actual-project-id
   ```

### Database Setup

```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Or push schema directly (development)
npm run db:push

# Open Drizzle Studio (optional)
npm run db:studio
```

### Development

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🤖 ChatGPT Integration

Payload Exchange integrates with ChatGPT through the OpenAI Apps SDK using Model Context Protocol (MCP).

### MCP Server

The MCP server is available at `/mcp` and exposes:

**Tools:**
- `open_app` - Open the Payload Exchange app widget
- `get_resource_by_url` - Fetch a specific resource by URL
- `list_resources` - List all available x402 resources
- `search_resources` - Search resources by query
- `show_paywall` - Display paywall for a resource

**Resources:**
- `content-widget` - Main app widget HTML
- `resource-widget` - Resource viewer widget HTML
- `paywall-widget` - Paywall widget HTML

### Connecting to ChatGPT

1. Deploy your app to Vercel or another hosting provider
2. In ChatGPT, navigate to **Settings → Connectors → Create**
3. Add your MCP server URL: `https://your-app.vercel.app/mcp`

**Note:** Connecting MCP servers to ChatGPT requires developer mode access. See the [connection guide](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt) for setup instructions.

## 🔌 Action Plugins

Payload Exchange uses a plugin-based system for different action types:

### Available Plugins

1. **Email Capture** (`email-capture`)
   - Captures user email addresses
   - Validates email format

2. **Survey** (`survey`)
   - Collects user responses to custom surveys
   - Configurable questions and response types

3. **GitHub Star** (`github-star`)
   - Verifies GitHub repository stars
   - OAuth integration for GitHub

4. **Code Verification** (`code-verification`)
   - Verifies code snippets or solutions
   - Uses VLayer for verification

### Creating Custom Plugins

Implement the `ActionPlugin` interface:

```typescript
export interface ActionPlugin<Config = any> {
  id: string;
  name: string;
  
  describe(config?: Config): {
    humanInstructions: string;
    schema?: any;
  };
  
  start(ctx: {
    userId: string;
    resourceId: string;
    actionId: string;
    config: Config;
  }): Promise<{
    instanceId: string;
    instructions: string;
    url?: string;
    metadata?: Record<string, any>;
  }>;
  
  validate(ctx: {
    instanceId: string;
    userId: string;
    resourceId: string;
    actionId: string;
    config: Config;
    input: any;
  }): Promise<{
    status: ActionStatus;
    reason?: string;
    rewardEligible?: boolean;
  }>;
}
```

Register your plugin in `server/core/actions/registry.ts`.

## 💰 How It Works

1. **User requests a resource** protected by x402
2. **Proxy intercepts** the request and receives a 402 Payment Required response
3. **Paywall displays** available payment options:
   - Direct payment (USDC via CDP)
   - Sponsored actions (complete an action instead)
4. **User chooses** an action or direct payment
5. **Action validation** occurs (if action chosen)
6. **Sponsor covers payment** (if action completed successfully)
7. **x402 payment** is made to upstream resource
8. **Resource is delivered** to the user

## 🛠️ Key Components

### MCP Server (`app/mcp/route.ts`)

The core MCP server implementation that exposes tools and resources to ChatGPT.

**Key features:**
- Tool registration with OpenAI-specific metadata
- Resource registration for HTML widget rendering
- Cross-linking between tools and resources via `templateUri`

### Asset Configuration (`next.config.ts`)

**Critical:** Set `assetPrefix` to ensure `/_next/` static assets are fetched from the correct origin:

```typescript
const nextConfig: NextConfig = {
  assetPrefix: APP_BASE_URL,  // Prevents 404s on /_next/ files in iframe
};
```

Without this, Next.js will attempt to load assets from the iframe's URL, causing 404 errors.

### SDK Bootstrap (`app/layout.tsx`)

The `<NextChatSDKBootstrap>` component patches browser APIs to work correctly within the ChatGPT iframe:

**What it patches:**
- `history.pushState` / `history.replaceState` - Prevents full-origin URLs in history
- `window.fetch` - Rewrites same-origin requests to use the correct base URL
- `<html>` attribute observer - Prevents ChatGPT from modifying the root element

**Required configuration:**
```tsx
<html lang="en" suppressHydrationWarning>
  <head>
    <NextChatSDKBootstrap baseUrl={APP_BASE_URL} />
  </head>
  <body>{children}</body>
</html>
```

**Note:** `suppressHydrationWarning` is currently required because ChatGPT modifies the initial HTML before the Next.js app hydrates, causing hydration mismatches.

## 📚 Learn More

- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [OpenAI Apps SDK - MCP Server Guide](https://developers.openai.com/apps-sdk/build/mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [x402 Protocol](https://402.fyi)
- [Next.js Documentation](https://nextjs.org/docs)
- [CDP Embedded Wallets Documentation](https://docs.cdp.coinbase.com/embedded-wallets/docs)
- [CDP Web SDK Reference](https://docs.cdp.coinbase.com/sdks/cdp-sdks-v2/frontend)
- [ETHGlobal Showcase](https://ethglobal.com/showcase/payload-exchange-x07pi)

## 🚢 Deployment

This project is designed to work seamlessly with [Vercel](https://vercel.com) deployment. The `baseUrl.ts` configuration automatically detects Vercel environment variables and sets the correct asset URLs.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/microchipgnu/payload-exchange)

The configuration automatically handles:
- Production URLs via `VERCEL_PROJECT_PRODUCTION_URL`
- Preview/branch URLs via `VERCEL_BRANCH_URL`
- Asset prefixing for correct resource loading in iframes

### Environment Variables for Production

Ensure all required environment variables are set in your Vercel project settings:
- `TUNNEL_URL` or `VERCEL_URL` (auto-detected)
- `DATABASE_URL`
- `NEXT_PUBLIC_CDP_PROJECT_ID`
- `TREASURY_WALLET_ADDRESS`
- `TREASURY_PRIVATE_KEY`
- `VLAYER_API_ENDPOINT` (if using code verification)
- `VLAYER_CLIENT_ID`
- `VLAYER_BEARER_TOKEN`

## 📝 Scripts

```bash
# Development
npm run dev              # Start development server

# Database
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Run migrations
npm run db:push          # Push schema directly (dev)
npm run db:studio        # Open Drizzle Studio

# Code Quality
npm run check            # Run Biome linter
npm run fix              # Fix linting issues

# Utilities
npm run create-account   # Create a new account (script)
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

[Add your license here]

---

Built for [ETHGlobal Buenos Aires](https://ethglobal.com/events/buenosaires) 🚀
