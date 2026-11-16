ALTER TABLE "transactions" ADD COLUMN "transfer_account_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "transfer_transaction_id" uuid;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "linked_account_id" uuid;--> statement-breakpoint
ALTER TABLE "category_groups" ADD COLUMN "system_kind" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_budget_id_id_unique" UNIQUE("budget_id","id");