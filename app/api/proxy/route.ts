// ========================================
// プロキシルートハンドラー
// ========================================
// このファイルは、x402リソースへのリクエストをインターセプトし、
// Honoサーバーに委譲するプロキシ層を実装しています。
// `/api/proxy?url=...` 形式のリクエストを `/api/payload/proxy/:resourceId` 形式に変換します。

import { app } from "@/server/hono/app";
import { handle } from "hono/vercel";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// ========================================
// Honoへのリクエスト委譲関数
// ========================================
// Next.jsのリクエストをHonoサーバーに委譲します。
// URLクエリパラメータ `url` を取得し、それをHonoのルートパラメータとしてエンコードします。
async function delegateToHono(req: NextRequest) {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url"); // アクセスしたいx402リソースのURL

  // URLパラメータが指定されていない場合はエラーを返す
  if (!targetUrl) {
    return new Response(
      JSON.stringify({ error: "Missing 'url' query parameter" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // CORS対応
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      },
    );
  }

  try {
    // ========================================
    // Honoルート用のURL構築
    // ========================================
    // フルURLをresourceIdとしてエンコード（Honoルートは完全なURLをサポート）
    const encodedResourceId = encodeURIComponent(targetUrl);

    // Honoルートを指す新しいリクエストURLを作成
    const baseUrl = new URL(req.url);
    const honoPath = `/api/payload/proxy/${encodedResourceId}`;
    const honoUrl = new URL(honoPath, baseUrl.origin);

    // クエリパラメータを転送（`url`以外）
    url.searchParams.forEach((value, key) => {
      if (key !== "url") {
        honoUrl.searchParams.set(key, value);
      }
    });

    // ========================================
    // Hono用のリクエスト作成
    // ========================================
    // 元のリクエストのヘッダーをすべてコピー
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    // リクエストボディがある場合は含める（GET/HEAD以外）
    let body: ReadableStream | null = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = req.body;
    }

    const honoRequest = new Request(honoUrl.toString(), {
      method: req.method,
      headers,
      body,
    });

    // Honoハンドラーでリクエストを処理
    return handle(app)(honoRequest);
  } catch (error) {
    console.error("[Proxy] Error delegating to Hono:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process proxy request",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}

// ========================================
// HTTPメソッドハンドラー
// ========================================
// すべてのHTTPメソッド（GET, POST, PUT, DELETE, PATCH）をHonoに委譲します。
export const GET = delegateToHono;
export const POST = delegateToHono;
export const PUT = delegateToHono;
export const DELETE = delegateToHono;
export const PATCH = delegateToHono;

// ========================================
// CORS対応: OPTIONSリクエスト
// ========================================
// すべてのオリジン、メソッド、ヘッダーに対してCORSを有効化します。
// これにより、異なるドメインからのリクエストも受け付けることができます。
export const OPTIONS = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
};
