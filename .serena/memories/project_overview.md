# プロジェクト概要
- 名前: Payload Exchange
- 目的: x402の支払い要求をプロキシで仲介し、スポンサーがユーザーのアクションと引き換えに支払いを肩代わりできる仕組みを提供する。
- 主な機能: x402プロキシ、スポンサー支払い、アクションプラグイン、MCP/ChatGPT連携、CDPウォレット、リソース探索。

## 技術スタック
- フロントエンド: Next.js 16, React 19, Tailwind CSS
- サーバー: Next.js API routes, Hono
- DB/ORM: PostgreSQL, Drizzle
- 連携: OpenAI Apps SDK / MCP, x402, CDP
- ツール: Biome (lint/format), TypeScript

## おおまかな構成
- app/: Next.js ルーティング、MCPルート、paywall UI
- components/: UIコンポーネント、CDP provider、paywall widget
- server/: core( actions/resources/x402 ), db, hono
- hooks/: React hooks
- drizzle/: マイグレーション
