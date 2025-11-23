CREATE TYPE "public"."action_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."coverage_type" AS ENUM('full', 'percent');--> statement-breakpoint
CREATE TYPE "public"."recurrence" AS ENUM('one_time_per_user', 'per_request');--> statement-breakpoint
CREATE TABLE "actions" (
	"id" text PRIMARY KEY NOT NULL,
	"sponsor_id" text NOT NULL,
	"plugin_id" varchar(100) NOT NULL,
	"config" jsonb NOT NULL,
	"coverage_type" "coverage_type" NOT NULL,
	"coverage_percent" bigint,
	"recurrence" "recurrence" NOT NULL,
	"resource_id" varchar(500) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemptions" (
	"id" text PRIMARY KEY NOT NULL,
	"action_id" text NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"resource_id" varchar(500) NOT NULL,
	"instance_id" varchar(255) NOT NULL,
	"status" "action_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sponsors" (
	"id" text PRIMARY KEY NOT NULL,
	"wallet_address" varchar(255) NOT NULL,
	"balance" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sponsors_wallet_address_unique" UNIQUE("wallet_address")
);
--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;