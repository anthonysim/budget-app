CREATE TABLE "month_assignments" (
	"budget_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"month" date NOT NULL,
	"assigned" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "month_assignments_category_id_month_pk" PRIMARY KEY("category_id","month")
);
--> statement-breakpoint
ALTER TABLE "month_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "month_assignments" ADD CONSTRAINT "month_assignments_category_budget_fk" FOREIGN KEY ("budget_id","category_id") REFERENCES "public"."categories"("budget_id","id") ON DELETE cascade ON UPDATE no action;