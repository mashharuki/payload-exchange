// ========================================
// アクションプラグインレジストリ
// ========================================
// このファイルは、利用可能なアクションプラグインを管理するレジストリです。
// プラグインは、ユーザーが実行できる行動（メール登録、アンケート、GitHubスターなど）を定義します。

import type { ActionPlugin } from "./action-plugin";
import { codeVerificationPlugin } from "./plugins/code-verification";
import { emailCapturePlugin } from "./plugins/email-capture";
import { githubStarPlugin } from "./plugins/github-star";
import { surveyPlugin } from "./plugins/survey";

// ========================================
// プラグインマップ: 利用可能なプラグインを登録
// ========================================
// 各プラグインIDに対応するプラグイン実装を定義します。
const plugins: Record<string, ActionPlugin> = {
  "email-capture": emailCapturePlugin, // メールアドレス取得プラグイン
  survey: surveyPlugin, // アンケートプラグイン
  "github-star": githubStarPlugin, // GitHubスタープラグイン
  "code-verification": codeVerificationPlugin, // コード検証プラグイン（VLayer使用）
};

// ========================================
// プラグイン取得関数
// ========================================
// プラグインIDから対応するプラグインを取得します。
export function getPlugin(pluginId: string): ActionPlugin | undefined {
  return plugins[pluginId];
}

// ========================================
// プラグイン一覧取得関数
// ========================================
// 登録されているすべてのプラグインを配列で返します。
export function listPlugins(): ActionPlugin[] {
  return Object.values(plugins);
}
