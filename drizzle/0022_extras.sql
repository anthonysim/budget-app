CREATE TYPE "public"."transaction_flag" AS ENUM('red', 'orange', 'yellow', 'green', 'blue', 'purple');--> statement-breakpoint
CREATE TABLE "month_notes" (
	"budget_id" uuid NOT NULL,
	"month" date NOT NULL,
	"note" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "month_notes_budget_id_month_pk" PRIMARY KEY("budget_id","month")
);
--> statement-breakpoint
ALTER TABLE "month_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "apr_bps" integer;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "min_payment" bigint;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "flag" "transaction_flag";--> statement-breakpoint
ALTER TABLE "month_notes" ADD CONSTRAINT "month_notes_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;