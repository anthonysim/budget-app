CREATE TYPE "public"."rule_match_type" AS ENUM('contains', 'starts_with', 'equals');--> statement-breakpoint
CREATE TABLE "payee_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"match_type" "rule_match_type" NOT NULL,
	"pattern" text NOT NULL,
	"payee_name" text NOT NULL,
	"category_id" uuid,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payee_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "import_mapping" jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "import_id" text;--> statement-breakpoint
ALTER TABLE "payee_rules" ADD CONSTRAINT "payee_rules_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;