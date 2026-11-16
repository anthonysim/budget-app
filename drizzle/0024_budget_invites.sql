CREATE TABLE "budget_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budget_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "budget_role" NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_invites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "budget_invites" ADD CONSTRAINT "budget_invites_budget_id_budgets_id_fk" FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;