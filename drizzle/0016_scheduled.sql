CREATE TYPE "public"."schedule_frequency" AS ENUM('once', 'daily', 'weekly', 'biweekly', 'twice_monthly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'yearly');--> statement-breakpoint
CREATE TABLE "scheduled_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"next_date" date NOT NULL,
	"frequency" "schedule_frequency" NOT NULL,
	"anchor_day" integer NOT NULL,
	"end_date" date,
	"payee_id" uuid,
	"category_id" uuid,
	"transfer_account_id" uuid,
	"memo" text,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "scheduled_transactions" ADD CONSTRAINT "scheduled_account_budget_fk" FOREIGN KEY ("budget_id","account_id") REFERENCES "public"."accounts"("budget_id","id") ON DELETE cascade ON UPDATE no action;