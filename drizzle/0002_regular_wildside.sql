ALTER TABLE "actions" ADD COLUMN "max_redemption_price" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "redemptions" ADD COLUMN "sponsored_amount" bigint NOT NULL;