CREATE TYPE "public"."funding_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "funding_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"sponsor_id" text NOT NULL,
	"amount" bigint NOT NULL,
	"transaction_hash" varchar(255),
	"status" "funding_status" DEFAULT 'pending' NOT NULL,
	"treasury_wallet" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "funding_transactions" ADD CONSTRAINT "funding_transactions_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;