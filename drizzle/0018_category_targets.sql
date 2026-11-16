CREATE TYPE "public"."target_behavior" AS ENUM('set_aside', 'refill');--> statement-breakpoint
CREATE TYPE "public"."target_repeat" AS ENUM('weekly', 'monthly', 'yearly', 'once');--> statement-breakpoint
CREATE TYPE "public"."target_type" AS ENUM('needed_for_spending', 'have_balance', 'monthly_funding');--> statement-breakpoint
CREATE TABLE "category_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"type" "target_type" NOT NULL,
	"amount" bigint NOT NULL,
	"repeat" "target_repeat",
	"due_date" date,
	"behavior" "target_behavior",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_targets_category_unique" UNIQUE("category_id")
);
--> statement-breakpoint
ALTER TABLE "category_targets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "category_targets" ADD CONSTRAINT "category_targets_category_budget_fk" FOREIGN KEY ("budget_id","category_id") REFERENCES "public"."categories"("budget_id","id") ON DELETE cascade ON UPDATE no action;