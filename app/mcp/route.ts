// ========================================
// MCP (Model Context Protocol) サーバー
// ========================================
// このファイルは、ChatGPTとPayload Exchangeを統合するためのMCPサーバーを実装しています。
// MCPは、AIシステムと外部ツール・データソースを接続するための標準プロトコルです。

import { APP_BASE_URL } from "@/lib/config";
import {
    getResource,
    listResources,
    searchResources,
} from "@/server/core/resources/registry";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod/v3";

// ========================================
// ヘルパー関数: HTMLウィジェットの取得
// ========================================
// ChatGPTのiframe内で表示するHTMLコンテンツを取得します。
const getAppsSdkCompatibleHtml = async (baseUrl: string, path: string) => {
  const result = await fetch(`${baseUrl}${path}`);
  return await result.text();
};

// ========================================
// ウィジェット型定義
// ========================================
// ChatGPTに表示されるウィジェットの設定を定義します。
type ContentWidget = {
  id: string; // ウィジェットの一意識別子
  title: string; // ウィジェットのタイトル
  templateUri: string; // OpenAI側で参照するテンプレートURI
  invoking: string; // ツール実行中に表示されるメッセージ
  invoked: string; // ツール実行完了後に表示されるメッセージ
  html: string; // ウィジェットのHTMLコンテンツ
  description: string; // ウィジェットの説明
  widgetDomain: string; // ウィジェットのドメイン
};

// ========================================
// ウィジェットメタデータ生成関数
// ========================================
// OpenAI Apps SDKが必要とするメタデータを生成します。
function widgetMeta(widget: ContentWidget) {
  return {
    "openai/outputTemplate": widget.templateUri, // ウィジェットのテンプレートURI
    "openai/toolInvocation/invoking": widget.invoking, // 実行中メッセージ
    "openai/toolInvocation/invoked": widget.invoked, // 完了メッセージ
    "openai/widgetAccessible": false, // ウィジェットがアクセス可能かどうか
    "openai/resultCanProduceWidget": true, // ツールの結果がウィジェットを生成できるか
  } as const;
}

// ========================================
// MCPハンドラーの作成
// ========================================
// MCPサーバーのメインハンドラーを作成します。
// このハンドラーは、ChatGPTからのリクエストを処理し、ツールやリソースを提供します。
const handler = createMcpHandler(async (server) => {
  // 各ウィジェットのHTMLコンテンツを事前に取得
  const embedHtml = await getAppsSdkCompatibleHtml(APP_BASE_URL, "/embed");
  const resourcesHtml = await getAppsSdkCompatibleHtml(
    APP_BASE_URL,
    "/resources",
  );
  const paywallHtml = await getAppsSdkCompatibleHtml(APP_BASE_URL, "/paywall");

  // ========================================
  // ウィジェット定義: メインアプリウィジェット
  // ========================================
  // Payload Exchangeのメインアプリケーションを表示するウィジェット
  const contentWidget: ContentWidget = {
    id: "open_app",
    title: "Open Payload.exchange App",
    templateUri: "ui://widget/content-template.html",
    invoking: "Loading app...",
    invoked: "App loaded",
    html: embedHtml,
    description: "Displays Payload.exchange app",
    widgetDomain: "https://payload.exchange",
  };

  // ========================================
  // ウィジェット定義: リソースビューアーウィジェット
  // ========================================
  // x402保護されたリソースを一覧・検索・表示するウィジェット
  const resourceWidget: ContentWidget = {
    id: "resource_widget",
    title: "Resource Viewer",
    templateUri: "ui://widget/resource.html",
    invoking: "Loading resource...",
    invoked: "Resource loaded",
    html: resourcesHtml,
    description: "Displays resource content",
    widgetDomain: "https://payload.exchange",
  };

  // ========================================
  // ウィジェット定義: ペイウォールウィジェット
  // ========================================
  // リソースへのアクセスに必要な支払いオプション（直接支払い or アクション）を表示するウィジェット
  const paywallWidget: ContentWidget = {
    id: "paywall_widget",
    title: "Paywall",
    templateUri: "ui://widget/paywall.html",
    invoking: "Loading paywall...",
    invoked: "Paywall displayed",
    html: paywallHtml,
    description: "Displays payment options for accessing a resource",
    widgetDomain: "https://payload.exchange",
  };

  // ========================================
  // リソース登録: メインアプリウィジェット
  // ========================================
  // MCPリソースとして登録することで、ChatGPTがこのウィジェットを表示できるようになります。
  server.registerResource(
    "content-widget",
    contentWidget.templateUri,
    {
      title: contentWidget.title,
      description: contentWidget.description,
      mimeType: "text/html+skybridge", // Skybridgeは、OpenAIのiframe内でHTMLを表示するためのMIMEタイプ
      _meta: {
        "openai/widgetDescription": contentWidget.description,
        "openai/widgetPrefersBorder": true, // ウィジェットに枠線を表示するか
      },
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "text/html+skybridge",
          text: `<html>${contentWidget.html}</html>`,
          _meta: {
            "openai/widgetDescription": contentWidget.description,
            "openai/widgetPrefersBorder": true,
            "openai/widgetDomain": contentWidget.widgetDomain,
          },
        },
      ],
    }),
  );

  server.registerResource(
    "resource-widget",
    resourceWidget.templateUri,
    {
      title: resourceWidget.title,
      description: resourceWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": resourceWidget.description,
        "openai/widgetPrefersBorder": true,
      },
    },
    async (uri) => {
      const url = new URL(uri.href);
      const mode = url.searchParams.get("mode") || "list";
      const resourceUrl = url.searchParams.get("url") || "";
      const query = url.searchParams.get("query") || "";

      // We need to fetch the HTML with the correct search params to render the correct state
      const dynamicHtml = await getAppsSdkCompatibleHtml(
        APP_BASE_URL,
        `/resources?mode=${mode}&url=${encodeURIComponent(resourceUrl)}&query=${encodeURIComponent(query)}`,
      );

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/html+skybridge",
            text: `<html>${dynamicHtml}</html>`,
            _meta: {
              "openai/widgetDescription": resourceWidget.description,
              "openai/widgetPrefersBorder": true,
              "openai/widgetDomain": resourceWidget.widgetDomain,
            },
          },
        ],
      };
    },
  );

  server.registerResource(
    "paywall-widget",
    paywallWidget.templateUri,
    {
      title: paywallWidget.title,
      description: paywallWidget.description,
      mimeType: "text/html+skybridge",
      _meta: {
        "openai/widgetDescription": paywallWidget.description,
        "openai/widgetPrefersBorder": false,
      },
    },
    async (uri) => {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/html+skybridge",
            text: `<html>${paywallWidget.html}</html>`,
            _meta: {
              "openai/widgetDescription": paywallWidget.description,
              "openai/widgetPrefersBorder": false,
              "openai/widgetDomain": paywallWidget.widgetDomain,
            },
          },
        ],
      };
    },
  );

  // ========================================
  // ツール登録: メインアプリを開く
  // ========================================
  // ChatGPTから呼び出せるツールとして登録します。
  // ユーザーが「Payload Exchangeを開いて」と言うと、このツールが実行されます。
  //@ts-ignore
  server.registerTool(
    contentWidget.id,
    {
      title: contentWidget.title,
      description:
        "Fetch and display the homepage content with the name of the user",
      inputSchema: {
        name: z
          .string()
          .describe("The name of the user to display on the homepage"),
      },
      _meta: widgetMeta(contentWidget), // ウィジェット表示のためのメタデータ
    },
    async ({ name }) => ({
      content: [
        {
          type: "text",
          text: name,
        },
      ],
      structuredContent: {
        name,
        timestamp: new Date().toISOString(),
      },
      _meta: widgetMeta(contentWidget),
    }),
  );

  // ========================================
  // ツール登録: URLからリソースを取得
  // ========================================
  // 指定されたURLのx402リソース情報を取得し、リソースビューアーウィジェットで表示します。
  server.registerTool(
    "get_resource_by_url",
    {
      title: "Get Resource by URL",
      description: "Fetch a specific resource by its URL",
      inputSchema: {
        url: z.string().describe("The URL of the resource to fetch"),
      },
      _meta: widgetMeta(resourceWidget),
    },
    async ({ url }) => {
      const resource = await getResource(url);
      if (!resource) {
        return {
          content: [
            {
              type: "text",
              text: `Resource not found: ${url}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(resource, null, 2),
          },
        ],
        _meta: {
          ...widgetMeta(resourceWidget),
          // URLパラメータを使ってウィジェットの表示モードを制御
          "openai/outputTemplate": `${resourceWidget.templateUri}?mode=view&url=${encodeURIComponent(url)}`,
        },
      };
    },
  );

  // ========================================
  // ツール登録: ペイウォールを表示
  // ========================================
  // x402リソースへのアクセスに必要な支払いオプションを表示します。
  // ユーザーは直接支払い（USDC）またはアクション（メール登録など）を選択できます。
  server.registerTool(
    "show_paywall",
    {
      title: "Show Paywall",
      description:
        "Display paywall for an x402 resource. Use this when the user wants to access a resource that requires payment.",
      inputSchema: {
        resourceUrl: z.string().describe("The URL of the x402 resource"),
      },
      _meta: widgetMeta(paywallWidget),
    },
    async ({ resourceUrl }) => {
      const resource = await getResource(resourceUrl);
      if (!resource) {
        return {
          content: [
            {
              type: "text",
              text: `Resource not found: ${resourceUrl}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `To access ${resource.resource}, please complete one of the payment options below.`,
          },
        ],
        structuredContent: {
          resource: resource,
          timestamp: new Date().toISOString(),
        },
        _meta: {
          ...widgetMeta(paywallWidget),
          "openai/outputTemplate": `${paywallWidget.templateUri}?resourceUrl=${encodeURIComponent(resourceUrl)}`,
        },
      };
    },
  );
  // ========================================
  // ツール登録: リソース一覧を表示
  // ========================================
  // 利用可能なx402リソースの一覧を取得し、リソースビューアーウィジェットで表示します。
  server.registerTool(
    "list_resources",
    {
      title: "List Resources",
      description: "List all available x402 resources",
      inputSchema: {}, // 入力パラメータなし
      _meta: widgetMeta(resourceWidget),
    },
    async () => {
      const resources = await listResources();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(resources, null, 2),
          },
        ],
        _meta: {
          ...widgetMeta(resourceWidget),
          "openai/outputTemplate": `${resourceWidget.templateUri}?mode=list`,
        },
      };
    },
  );

  // ========================================
  // ツール登録: リソースを検索
  // ========================================
  // クエリ文字列でx402リソースを検索し、リソースビューアーウィジェットで結果を表示します。
  server.registerTool(
    "search_resources",
    {
      title: "Search Resources",
      description: "Search resources by query string",
      inputSchema: {
        query: z.string().describe("The search query"),
      },
      _meta: widgetMeta(resourceWidget),
    },
    async ({ query }) => {
      const results = await searchResources(query);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
        _meta: {
          ...widgetMeta(resourceWidget),
          "openai/outputTemplate": `${resourceWidget.templateUri}?mode=search&query=${encodeURIComponent(query)}`,
        },
      };
    },
  );
});

// ========================================
// Next.js Route Handler設定
// ========================================
export const runtime = "nodejs"; // Node.jsランタイムを使用
export const dynamic = "force-dynamic"; // 動的レンダリングを強制（キャッシュを無効化）

// GETとPOSTリクエストの両方をMCPハンドラーで処理
export const GET = handler;
export const POST = handler;
