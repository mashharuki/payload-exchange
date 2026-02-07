# Payload Exchange

**何でも支払いに！** スポンサーがユーザーの行動と引き換えにアクセス費用を支払う、x402プロキシです。

Payload Exchangeは、x402の支払い要求を横取りし、**スポンサー**という第三者を導入するプロキシ層です。

これにより、エンドユーザーはステーブルコインなどの通貨以外の代替的な支払い体験が可能になります。

スポンサーが支払いを（全額または一部）肩代わりし、その代わりにユーザーの行動やデータを提供してもらう仕組みです。

## ソースコード解析レポート

[こちら](./docs/codebase-analysis.md)

## 🎯 概要

近い将来、質の高いコンテンツ提供者が、API・記事・動画・データエンドポイント・デジタル商品などをx402の課金壁の背後に置く世界を想像してみてください。多くは小額の簡単なタスクで、AIエージェントが消費するものもあるでしょう。より良いUXと高度なエージェントワークフローのために、x402支払いはユーザーから軽い行動やデータを得ることと引き換えにスポンサーされる――つまり「手元にあるもので支払える」本当に無料な方法です。

### 主な機能

- **x402プロキシ層**:  
    x402支払い要求をインターセプトし管理
- **スポンサー統合**:   
    ユーザーの行動と引き換えにスポンサーが支払いを肩代わり
- **アクションプラグイン**:   
    行動タイプごとの柔軟なプラグイン（メール取得、アンケート、GitHubスター、コード検証）
- **ChatGPT統合**:   
    OpenAI Apps SDKとMCPによりChatGPTウィジェットをネイティブ描画
- **ウォレット対応**:   
    CDP（Coinbase Developer Platform）埋め込みウォレットによるシームレス決済
- **リソース探索**:   
    x402保護リソースの検索・閲覧

## 🏗️ アーキテクチャ

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

## 📁 プロジェクト構成

```
payload-exchange/
├── app/
│   ├── (dashboard)/          # ダッシュボードのルート
│   │   ├── sponsor/          # スポンサー管理
│   │   └── user/             # ユーザー管理
│   ├── api/
│   │   ├── payload/         # x402プロキシエンドポイント
│   │   └── proxy/           # 一般プロキシルート
│   ├── mcp/
│   │   └── route.ts         # ChatGPT統合用MCPサーバー
│   ├── paywall/
│   │   └── paywall-client.tsx  # ペイウォールUIコンポーネント
│   └── resources/           # リソース探索UI
│
├── components/
│   ├── paywall-widget.tsx   # メインのペイウォール
│   ├── cdp-provider.tsx     # CDPウォレットプロバイダ
│   └── ui/                  # 再利用可能UIコンポーネント
│
├── server/
│   ├── core/
│   │   ├── actions/         # アクションプラグインシステム
│   │   │   ├── registry.ts  # プラグインレジストリ
│   │   │   └── plugins/     # アクションプラグイン
│   │   ├── resources/       # リソース管理
│   │   │   └── registry.ts  # リソースレジストリ
│   │   └── x402/            # x402クライアント実装
│   ├── db/                  # DBスキーマとクエリ
│   └── hono/                # Hono APIルート
│
└── hooks/                   # アプリ用React hooks
```

## 🚀 はじめ方

### 前提条件

- Node.js 18+ または Bun
- PostgreSQL（本番用）
- [Coinbase Developer Platform](https://portal.cdp.coinbase.com) のCDP Project ID

### インストール

```bash
# 依存関係のインストール
npm install
# or
pnpm install
# or
bun install
```

### 環境設定

`.env.example` を `.env.local` にコピーして設定します。

```bash
# アプリURL（iframe描画に必須）
TUNNEL_URL=http://localhost:3000

# DB接続
DATABASE_URL=postgresql://user:password@localhost:5432/payload_exchange

# CDP設定
NEXT_PUBLIC_CDP_PROJECT_ID=your-project-id

# 支払い受領用トレジャリーウォレット
TREASURY_WALLET_ADDRESS=0x...
TREASURY_PRIVATE_KEY=0x...

# x402エンドポイント（任意、独自実装向け）
X402_ENDPOINT=https://...

# VLayer設定（検証用）
VLAYER_API_ENDPOINT=https://...
VLAYER_CLIENT_ID=...
VLAYER_BEARER_TOKEN=...
```

### CDP埋め込みウォレットの設定

1. **CDP Project IDを取得**
	 - [CDP Portal](https://portal.cdp.coinbase.com) に登録
	 - 新規プロジェクト作成後、Project IDをコピー

2. **ドメインを設定**
	 - [Domains Configuration](https://portal.cdp.coinbase.com/products/embedded-wallets/domains) へ移動
	 - ローカル開発用に `http://localhost:3000` を追加
	 - 本番デプロイ時は本番ドメインを追加

3. **環境変数を設定**
	 ```bash
	 NEXT_PUBLIC_CDP_PROJECT_ID=your-actual-project-id
	 ```

### データベース設定

```bash
# マイグレーション生成
npm run db:generate

# Docker compose起動
docker compose up -d

# マイグレーション実行
npm run db:migrate

# 直接スキーマ反映（開発向け）
npm run db:push

# Drizzle Studio起動（任意）
npm run db:studio
```

### 開発

```bash
npm run dev
# or
pnpm dev
```

[http://localhost:3000](http://localhost:3000) を開いてアプリを確認します。

## 🤖 ChatGPT統合

Payload Exchangeは **OpenAI Apps SDKのModel Context Protocol（MCP）** を使ってChatGPTと統合します。

### MCPサーバー

MCPサーバーは `/mcp` で利用でき、以下を提供します。

**Tools:**
- `open_app` - Payload Exchangeアプリウィジェットを開く
- `get_resource_by_url` - URLから特定リソースを取得
- `list_resources` - 利用可能なx402リソースを一覧
- `search_resources` - クエリでリソース検索
- `show_paywall` - リソースのペイウォールを表示

**Resources:**
- `content-widget` - メインアプリウィジェットHTML
- `resource-widget` - リソース閲覧ウィジェットHTML
- `paywall-widget` - ペイウォールウィジェットHTML

### ChatGPTへの接続

1. Vercelなどにアプリをデプロイ
2. ChatGPTで **Settings → Connectors → Create** へ
3. MCPサーバーURLを追加: `https://your-app.vercel.app/mcp`

**注記:** ChatGPTにMCPサーバーを接続するには開発者モードのアクセスが必要です。

設定は[接続ガイド](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt)を参照してください。

## 🔌 アクションプラグイン

Payload Exchangeは、行動タイプごとのプラグイン方式を採用しています。

### 利用可能なプラグイン

1. **Email Capture** (`email-capture`)
	 - ユーザーのメールアドレスを取得
	 - メール形式を検証

2. **Survey** (`survey`)
	 - カスタムアンケートの回答を収集
	 - 質問と回答タイプを設定可能

3. **GitHub Star** (`github-star`)
	 - GitHubリポジトリのスターを検証
	 - GitHub OAuth連携

4. **Code Verification** (`code-verification`)
	 - コード断片や解答を検証
	 - VLayerを利用

### カスタムプラグインの作成

`ActionPlugin` インターフェースを実装します。

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

`server/core/actions/registry.ts` に登録します。

## 💰 仕組み

1. **ユーザーがx402保護されたリソースを要求**
2. **プロキシが要求をインターセプト**し、402 Payment Requiredを受信
3. **ペイウォールが支払いオプションを表示**
	 - 直接支払い（CDP経由のUSDC）
	 - スポンサー行動（行動で支払い代替）
4. **ユーザーが行動または直接支払いを選択**
5. **行動の検証**（行動を選んだ場合）
6. **スポンサーが支払いを肩代わり**（行動完了時）
7. **x402支払い**が上流リソースへ
8. **リソースがユーザーに配信**

## 🛠️ 主要コンポーネント

### MCPサーバー（`app/mcp/route.ts`）

ChatGPTにツールとリソースを公開するMCPサーバーの中核実装。

**主な機能:**
- OpenAI向けメタデータを含むツール登録
- HTMLウィジェット描画のためのリソース登録
- `templateUri` によるツールとリソースの関連付け

### アセット設定（`next.config.ts`）

**重要:** `assetPrefix` を設定し、`/_next/` 静的アセットが正しいオリジンから取得されるようにします。

```typescript
const nextConfig: NextConfig = {
	assetPrefix: APP_BASE_URL,  // iframe内で /_next/ が404にならないようにする
};
```

これを設定しないと、Next.jsはiframeのURLからアセットを読み込もうとして404になります。

### SDKブートストラップ（`app/layout.tsx`）

`<NextChatSDKBootstrap>` がChatGPTのiframe内でブラウザAPIが正しく動くようにパッチします。

**パッチ対象:**
- `history.pushState` / `history.replaceState` 
    - 履歴にフルオリジンURLが入らないようにする
- `window.fetch` 
    - 同一オリジンリクエストを正しいベースURLへ書き換え
- `<html>`属性の監視 
    - ChatGPTがroot要素を改変するのを防止

**必須設定:**

```tsx
<html lang="en" suppressHydrationWarning>
	<head>
		<NextChatSDKBootstrap baseUrl={APP_BASE_URL} />
	</head>
	<body>{children}</body>
</html>
```

**注記:** ChatGPTが初期HTMLを変更するため、Next.jsのハイドレーションと差分が出ないように `suppressHydrationWarning` が必要です。

## 📚 参考

- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [OpenAI Apps SDK - MCP Server Guide](https://developers.openai.com/apps-sdk/build/mcp-server)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [x402 Protocol](https://402.fyi)
- [Next.js Documentation](https://nextjs.org/docs)
- [CDP Embedded Wallets Documentation](https://docs.cdp.coinbase.com/embedded-wallets/docs)
- [CDP Web SDK Reference](https://docs.cdp.coinbase.com/sdks/cdp-sdks-v2/frontend)
- [ETHGlobal Showcase](https://ethglobal.com/showcase/payload-exchange-x07pi)

## 🚢 デプロイ

このプロジェクトは [Vercel](https://vercel.com) でのデプロイに最適化されています。

`baseUrl.ts` の設定がVercelの環境変数を自動検出して、正しいアセットURLを設定します。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mashharuki/payload-exchange)

自動的に以下を処理します:
- `VERCEL_PROJECT_PRODUCTION_URL` による本番URL
- `VERCEL_BRANCH_URL` によるプレビュー/ブランチURL
- iframe内で正しく読み込むためのアセットプレフィックス

### 本番用の環境変数

Vercelのプロジェクト設定に以下を必ず設定してください:

- `TUNNEL_URL` または `VERCEL_URL`（自動検出）
- `DATABASE_URL`
- `NEXT_PUBLIC_CDP_PROJECT_ID`
- `TREASURY_WALLET_ADDRESS`
- `TREASURY_PRIVATE_KEY`
- `VLAYER_API_ENDPOINT`（コード検証を使う場合）
- `VLAYER_CLIENT_ID`
- `VLAYER_BEARER_TOKEN`

## 📝 スクリプト

```bash
# Development
npm run dev              # 開発サーバー起動

# Database
npm run db:generate      # Drizzleマイグレーション生成
npm run db:migrate       # マイグレーション実行
npm run db:push          # スキーマ直接反映（開発用）
npm run db:studio        # Drizzle Studio起動

# Code Quality
npm run check            # Biomeリント実行
npm run fix              # リント修正

# Utilities
npm run create-account   # 新規アカウント作成（スクリプト）
```

## 参考文献
- [Deepwiki payload-exchange](https://deepwiki.com/mashharuki/payload-exchange)
