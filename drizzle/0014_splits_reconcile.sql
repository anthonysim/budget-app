CREATE TABLE "subtransactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"transaction_id" uuid NOT NULL,
	"category_id" uuid,
	"memo" text,
	"amount" bigint NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subtransactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "last_reconciled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "last_reconciled_balance" bigint;--> statement-breakpoint
ALTER TABLE "subtransactions" ADD CONSTRAINT "subtransactions_transaction_budget_fk" FOREIGN KEY ("budget_id","transaction_id") REFERENCES "public"."transactions"("budget_id","id") ON DELETE cascade ON UPDATE no action;