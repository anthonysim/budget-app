CREATE TYPE "public"."budget_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "budget_members" (
	"budget_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "budget_role" DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_members_budget_id_user_id_pk" PRIMARY KEY("budget_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "budget_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"date_format" text DEFAULT 'MM/DD/YYYY' NOT NULL,
	"first_month" date NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "budget_members" ADD CONSTRAINT "budget_members_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;