// ========================================
// ルートレイアウト: アプリケーション全体の基盤
// ========================================
// このファイルは、Next.jsアプリケーション全体のレイアウトを定義します。
// ChatGPTのiframe内での動作を保証するための特別な設定が含まれています。

import "@/app/globals.css";
import { AppsSDKUIProvider } from "@/components/apps-sdk-ui-provider";
import { CDPProviders } from "@/components/cdp-provider";
import { APP_BASE_URL } from "@/lib/config";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

// ========================================
// フォント設定
// ========================================
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ========================================
// メタデータ設定
// ========================================
export const metadata: Metadata = {
  title: "Payload.exchange",
  description: "Exchange payloads for sponsored resources",
};

// ========================================
// ルートレイアウトコンポーネント
// ========================================
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: ChatGPTがHTML要素を変更するため、ハイドレーション警告を抑制
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        {/* ChatGPT iframe内での動作を保証するためのブートストラップスクリプト */}
        <NextChatSDKBootstrap baseUrl={APP_BASE_URL} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* ========================================
            CDP モーダルのz-index修正
            ========================================
            Coinbase Developer Platform (CDP) のモーダルが
            他の要素の下に隠れないように、z-indexを強制的に設定します。
        */}
        <style
          // biome-ignore lint/security/noDangerouslySetInnerHtml: <just cause>
          dangerouslySetInnerHTML={{
            __html: `
              /* Force CDP modal to appear above everything */
              body > div[data-radix-portal],
              body > div[data-radix-portal] > div,
              [data-radix-portal],
              [data-radix-portal] > div,
              [data-radix-portal] > div > div,
              div[role="dialog"],
              div[aria-modal="true"],
              body > div[style*="position: fixed"],
              body > div[style*="position:fixed"] {
                z-index: 99999 !important;
              }
            `,
          }}
        />
        {/* ========================================
            CDP モーダルのz-index動的設定スクリプト
            ========================================
            MutationObserverを使用して、動的に追加されるモーダル要素にも
            z-indexを設定します。
        */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: <trust me bro>
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Function to set high z-index on modal elements
                function setModalZIndex() {
                  // Target all possible modal containers
                  const selectors = [
                    '[data-radix-portal]',
                    '[data-radix-portal] > div',
                    '[role="dialog"]',
                    '[aria-modal="true"]',
                    'body > div[style*="position: fixed"]',
                    'body > div[style*="position:fixed"]'
                  ];
                  
                  selectors.forEach(selector => {
                    try {
                      const elements = document.querySelectorAll(selector);
                      elements.forEach(el => {
                        if (el instanceof HTMLElement) {
                          el.style.zIndex = '99999';
                        }
                      });
                    } catch (e) {
                      // Ignore selector errors
                    }
                  });
                }
                
                // Set z-index immediately
                setModalZIndex();
                
                // Watch for new modal elements being added
                const observer = new MutationObserver(() => {
                  setModalZIndex();
                });
                
                observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['style', 'data-radix-portal', 'role', 'aria-modal']
                });
                
                // Also check periodically as a fallback
                setInterval(setModalZIndex, 100);
              })();
            `,
          }}
        />
        {/* アプリケーションのメインコンテンツ */}
        <AppsSDKUIProvider>
          <CDPProviders>{children}</CDPProviders>
        </AppsSDKUIProvider>
      </body>
    </html>
  );
}

// ========================================
// NextChatSDKBootstrap コンポーネント
// ========================================
// ChatGPTのiframe内でNext.jsアプリが正しく動作するための
// パッチとブートストラップスクリプトを提供します。
//
// 主な機能:
// 1. <base> タグでベースURLを設定
// 2. history API (pushState/replaceState) のパッチ
// 3. fetch API のパッチ（同一オリジンリクエストの書き換え）
// 4. HTML要素の属性変更を監視・防止
// 5. 外部リンクのクリックをopenai.openExternal()で処理
function NextChatSDKBootstrap({ baseUrl }: { baseUrl: string }) {
  return (
    <>
      {/* ベースURLを設定（相対URLの解決に使用） */}
      <base href={baseUrl} />
      {/* グローバル変数にベースURLを保存 */}
      <script>{`window.innerBaseUrl = ${JSON.stringify(baseUrl)}`}</script>
      {/* ChatGPTアプリ内かどうかを判定 */}
      <script>{`window.__isChatGptApp = typeof window.openai !== "undefined";`}</script>
      <script>
        {"(" +
          (() => {
            const baseUrl = window.innerBaseUrl;
            const htmlElement = document.documentElement;
            
            // ========================================
            // HTML要素の属性変更を監視・防止
            // ========================================
            // ChatGPTがHTML要素に属性を追加するのを防ぎます。
            // suppressHydrationWarning以外の属性が追加された場合、即座に削除します。
            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                if (
                  mutation.type === "attributes" &&
                  mutation.target === htmlElement
                ) {
                  const attrName = mutation.attributeName;
                  if (attrName && attrName !== "suppresshydrationwarning") {
                    htmlElement.removeAttribute(attrName);
                  }
                }
              });
            });
            observer.observe(htmlElement, {
              attributes: true,
              attributeOldValue: true,
            });

            // ========================================
            // history.replaceState のパッチ
            // ========================================
            // ChatGPTのiframe内では、フルURLではなくパス+クエリ+ハッシュのみを使用します。
            const originalReplaceState = history.replaceState;
            history.replaceState = (_s, unused, url) => {
              const u = new URL(url ?? "", window.location.href);
              const href = u.pathname + u.search + u.hash;
              originalReplaceState.call(history, unused, href);
            };

            // ========================================
            // history.pushState のパッチ
            // ========================================
            // replaceStateと同様に、パス+クエリ+ハッシュのみを使用します。
            const originalPushState = history.pushState;
            history.pushState = (_s, unused, url) => {
              const u = new URL(url ?? "", window.location.href);
              const href = u.pathname + u.search + u.hash;
              originalPushState.call(history, unused, href);
            };

            const appOrigin = new URL(baseUrl).origin;
            const isInIframe = window.self !== window.top;

            // ========================================
            // 外部リンクのクリックハンドリング
            // ========================================
            // 外部リンクをクリックした場合、openai.openExternal()で開きます。
            window.addEventListener(
              "click",
              (e) => {
                const a = (e?.target as HTMLElement)?.closest("a");
                if (!a?.href) return;
                const url = new URL(a.href, window.location.href);
                if (
                  url.origin !== window.location.origin &&
                  url.origin !== appOrigin
                ) {
                  try {
                    if (window.openai) {
                      window.openai?.openExternal({ href: a.href });
                      e.preventDefault();
                    }
                  } catch {
                    console.warn(
                      "openExternal failed, likely not in OpenAI client",
                    );
                  }
                }
              },
              true,
            );

            // ========================================
            // fetch API のパッチ
            // ========================================
            // iframe内で同一オリジンリクエストを正しいベースURLに書き換えます。
            if (isInIframe && window.location.origin !== appOrigin) {
              const originalFetch = window.fetch;

              window.fetch = (input: URL | RequestInfo, init?: RequestInit) => {
                let url: URL;
                if (typeof input === "string" || input instanceof URL) {
                  url = new URL(input, window.location.href);
                } else {
                  url = new URL(input.url, window.location.href);
                }

                // アプリのオリジンへのリクエストはそのまま通す
                if (url.origin === appOrigin) {
                  if (typeof input === "string" || input instanceof URL) {
                    input = url.toString();
                  } else {
                    input = new Request(url.toString(), input);
                  }

                  return originalFetch.call(window, input, {
                    ...init,
                    mode: "cors",
                  });
                }

                // 同一オリジンリクエストをベースURLに書き換え
                if (url.origin === window.location.origin) {
                  const newUrl = new URL(baseUrl);
                  newUrl.pathname = url.pathname;
                  newUrl.search = url.search;
                  newUrl.hash = url.hash;
                  url = newUrl;

                  if (typeof input === "string" || input instanceof URL) {
                    input = url.toString();
                  } else {
                    input = new Request(url.toString(), input);
                  }

                  return originalFetch.call(window, input, {
                    ...init,
                    mode: "cors",
                  });
                }

                // その他のリクエストはそのまま通す
                return originalFetch.call(window, input, init);
              };
            }
          }).toString() +
          ")()"}
      </script>
    </>
  );
}
