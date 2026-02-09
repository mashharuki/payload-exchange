import { relations } from "drizzle-orm";
import {
    bigint,
    boolean,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    varchar,
} from "drizzle-orm/pg-core";

// ========================================
// Enum定義: データベースで使用する列挙型
// ========================================

// アクションの状態を表すEnum（保留中、完了、失敗）
export const actionStatusEnum = pgEnum("action_status", [
  "pending",
  "completed",
  "failed",
]);

// スポンサーの支払いカバー範囲のタイプ（全額、または割合）
export const coverageTypeEnum = pgEnum("coverage_type", ["full", "percent"]);

// アクションの繰り返し可能性（ユーザーごとに1回のみ、またはリクエストごと）
export const recurrenceEnum = pgEnum("recurrence", [
  "one_time_per_user",
  "per_request",
]);

// 資金調達トランザクションの状態（保留中、完了、失敗）
export const fundingStatusEnum = pgEnum("funding_status", [
  "pending",
  "completed",
  "failed",
]);

// ========================================
// Sponsorsテーブル: スポンサー情報を管理
// ========================================
// スポンサーは、ユーザーの行動と引き換えにリソースへのアクセス費用を支払う第三者です。
export const sponsors = pgTable("sponsors", {
  id: text("id").primaryKey(), // スポンサーの一意識別子
  walletAddress: varchar("wallet_address", { length: 255 }).notNull().unique(), // スポンサーのウォレットアドレス（一意）
  balance: bigint("balance", { mode: "bigint" }).notNull(), // スポンサーの残高（支払いに使用）
  createdAt: timestamp("created_at").notNull().defaultNow(), // 作成日時
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // 更新日時
});

// ========================================
// Actionsテーブル: スポンサーが提供するアクション（行動）を定義
// ========================================
// アクションは、ユーザーが実行できる行動（メール登録、アンケート、GitHubスターなど）を表します。
// スポンサーはこれらのアクションと引き換えにリソースへのアクセス費用を支払います。
export const actions = pgTable("actions", {
  id: text("id").primaryKey(), // アクションの一意識別子
  sponsorId: text("sponsor_id")
    .notNull()
    .references(() => sponsors.id, { onDelete: "cascade" }), // このアクションを提供するスポンサーのID
  pluginId: varchar("plugin_id", { length: 100 }).notNull(), // アクションプラグインのID（例: "email-capture", "survey"）
  config: jsonb("config").notNull().$type<Record<string, unknown>>(), // プラグイン固有の設定（JSON形式）
  coverageType: coverageTypeEnum("coverage_type").notNull(), // 支払いカバー範囲のタイプ（全額 or 割合）
  coveragePercent: bigint("coverage_percent", { mode: "number" }), // カバー割合（coverageTypeが"percent"の場合に使用）
  recurrence: recurrenceEnum("recurrence").notNull(), // アクションの繰り返し可能性
  max_redemption_price: bigint("max_redemption_price", {
    mode: "bigint",
  }).notNull(), // このアクションで償還可能な最大価格
  active: boolean("active").notNull().default(true), // アクションが有効かどうか
  createdAt: timestamp("created_at").notNull().defaultNow(), // 作成日時
});

// ========================================
// Redemptionsテーブル: ユーザーによるアクションの実行記録
// ========================================
// ユーザーがアクションを完了し、スポンサーによる支払いが行われた記録を保存します。
export const redemptions = pgTable("redemptions", {
  id: text("id").primaryKey(), // 償還記録の一意識別子
  actionId: text("action_id")
    .notNull()
    .references(() => actions.id, { onDelete: "cascade" }), // 実行されたアクションのID
  userId: varchar("user_id", { length: 255 }).notNull(), // アクションを実行したユーザーのID
  resourceId: varchar("resource_id", { length: 500 }).notNull(), // アクセスされたリソースのID（URL）
  instanceId: varchar("instance_id", { length: 255 }).notNull(), // アクション実行のインスタンスID（重複防止用）
  status: actionStatusEnum("status").notNull().default("pending"), // 償還の状態（保留中、完了、失敗）
  sponsored_amount: bigint("sponsored_amount", { mode: "bigint" }).notNull(), // スポンサーが支払った金額
  metadata: jsonb("metadata").$type<Record<string, unknown>>(), // 追加のメタデータ（JSON形式）
  createdAt: timestamp("created_at").notNull().defaultNow(), // 作成日時
  completedAt: timestamp("completed_at"), // 完了日時
});

// ========================================
// リレーション定義: テーブル間の関係を定義
// ========================================

// Sponsorsテーブルのリレーション: 1人のスポンサーは複数のアクションを持つ
export const sponsorsRelations = relations(sponsors, ({ many }) => ({
  actions: many(actions),
}));

// Actionsテーブルのリレーション: 1つのアクションは1人のスポンサーに属し、複数の償還記録を持つ
export const actionsRelations = relations(actions, ({ one, many }) => ({
  sponsor: one(sponsors, {
    fields: [actions.sponsorId],
    references: [sponsors.id],
  }),
  redemptions: many(redemptions),
}));

// Redemptionsテーブルのリレーション: 1つの償還記録は1つのアクションに属する
export const redemptionsRelations = relations(redemptions, ({ one }) => ({
  action: one(actions, {
    fields: [redemptions.actionId],
    references: [actions.id],
  }),
}));

// ========================================
// FundingTransactionsテーブル: スポンサーの資金調達トランザクション
// ========================================
// スポンサーが残高をチャージするためのトランザクション記録を保存します。
export const fundingTransactions = pgTable("funding_transactions", {
  id: text("id").primaryKey(), // トランザクションの一意識別子
  sponsorId: text("sponsor_id")
    .notNull()
    .references(() => sponsors.id, { onDelete: "cascade" }), // 資金を提供したスポンサーのID
  amount: bigint("amount", { mode: "bigint" }).notNull(), // チャージされた金額
  transactionHash: varchar("transaction_hash", { length: 255 }), // ブロックチェーントランザクションのハッシュ
  status: fundingStatusEnum("status").notNull().default("pending"), // トランザクションの状態（保留中、完了、失敗）
  treasuryWallet: varchar("treasury_wallet", { length: 255 }).notNull(), // 資金を受け取るトレジャリーウォレットのアドレス
  createdAt: timestamp("created_at").notNull().defaultNow(), // 作成日時
  completedAt: timestamp("completed_at"), // 完了日時
});

// FundingTransactionsテーブルのリレーション: 1つのトランザクションは1人のスポンサーに属する
export const fundingTransactionsRelations = relations(
  fundingTransactions,
  ({ one }) => ({
    sponsor: one(sponsors, {
      fields: [fundingTransactions.sponsorId],
      references: [sponsors.id],
    }),
  }),
);

// Sponsorsテーブルの資金調達リレーション: 1人のスポンサーは複数の資金調達トランザクションを持つ
export const sponsorsFundingRelations = relations(sponsors, ({ many }) => ({
  fundingTransactions: many(fundingTransactions),
}));

// ========================================
// ResponseProofsテーブル: リソースアクセスの検証可能な証明
// ========================================
// VLayerなどを使用して、リソースへのアクセスが実際に行われたことを証明するデータを保存します。
export const responseProofs = pgTable("response_proofs", {
  id: text("id").primaryKey(), // 証明の一意識別子
  resourceId: varchar("resource_id", { length: 500 }).notNull(), // アクセスされたリソースのID
  url: text("url").notNull(), // アクセスされたURL
  method: varchar("method", { length: 10 }).notNull(), // HTTPメソッド（GET, POSTなど）
  statusCode: bigint("status_code", { mode: "number" }).notNull(), // HTTPステータスコード
  statusText: varchar("status_text", { length: 255 }), // ステータステキスト
  proof: text("proof").notNull(), // 16進数形式の証明データ（VLayerなどから取得）
  userId: varchar("user_id", { length: 255 }), // リソースにアクセスしたユーザーのID
  sponsorId: text("sponsor_id").references(() => sponsors.id, {
    onDelete: "set null",
  }), // 関連するスポンサーのID（任意）
  actionId: text("action_id").references(() => actions.id, {
    onDelete: "set null",
  }), // 関連するアクションのID（任意）
  metadata: jsonb("metadata").$type<Record<string, unknown>>(), // 追加のメタデータ（JSON形式）
  createdAt: timestamp("created_at").notNull().defaultNow(), // 作成日時
});

// ResponseProofsテーブルのリレーション: 1つの証明は1人のスポンサーと1つのアクションに関連付けられる
export const responseProofsRelations = relations(responseProofs, ({ one }) => ({
  sponsor: one(sponsors, {
    fields: [responseProofs.sponsorId],
    references: [sponsors.id],
  }),
  action: one(actions, {
    fields: [responseProofs.actionId],
    references: [actions.id],
  }),
}));
