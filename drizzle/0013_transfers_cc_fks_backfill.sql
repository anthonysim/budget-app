ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_transfer_account_fk"
  FOREIGN KEY ("budget_id", "transfer_account_id") REFERENCES "accounts" ("budget_id", "id")
  ON DELETE SET NULL ("transfer_account_id");
--> statement-breakpoint
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_transfer_pair_fk"
  FOREIGN KEY ("budget_id", "transfer_transaction_id") REFERENCES "transactions" ("budget_id", "id")
  ON DELETE SET NULL ("transfer_transaction_id");
--> statement-breakpoint
ALTER TABLE "categories"
  ADD CONSTRAINT "categories_linked_account_fk"
  FOREIGN KEY ("budget_id", "linked_account_id") REFERENCES "accounts" ("budget_id", "id")
  ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "transactions_transfer_pair_idx" ON "transactions" ("transfer_transaction_id");
--> statement-breakpoint
-- one payment category per card, one Credit Card Payments group per budget
CREATE UNIQUE INDEX "categories_one_payment_per_account" ON "categories" ("linked_account_id") WHERE "system_kind" = 'cc_payment';
--> statement-breakpoint
CREATE UNIQUE INDEX "category_groups_one_cc_group_per_budget" ON "category_groups" ("budget_id") WHERE "system_kind" = 'credit_card_payments';
--> statement-breakpoint

-- Mark existing Inflow groups
UPDATE public.category_groups SET system_kind = 'inflow' WHERE system AND name = 'Inflow' AND system_kind IS NULL;
--> statement-breakpoint

-- Debt accounts: the starting balance is pre-budget debt, not income. Do not feed Ready to Assign.
UPDATE public.transactions t
SET category_id = NULL
FROM public.accounts a
WHERE t.account_id = a.id
  AND t.memo = 'Starting Balance'
  AND a.type IN ('credit_card', 'line_of_credit');
--> statement-breakpoint

-- Backfill: Credit Card Payments group + one payment category per on-budget credit card
DO $$
DECLARE
  acc record;
  g_id uuid;
BEGIN
  FOR acc IN
    SELECT a.id, a.budget_id, a.name FROM public.accounts a
    WHERE a.type = 'credit_card' AND a.on_budget
      AND NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.linked_account_id = a.id AND c.system_kind = 'cc_payment')
  LOOP
    SELECT id INTO g_id FROM public.category_groups
      WHERE budget_id = acc.budget_id AND system_kind = 'credit_card_payments';
    IF g_id IS NULL THEN
      INSERT INTO public.category_groups (budget_id, name, sort, system, system_kind)
      VALUES (acc.budget_id, 'Credit Card Payments', 1000, true, 'credit_card_payments')
      RETURNING id INTO g_id;
    END IF;
    INSERT INTO public.categories (budget_id, group_id, name, sort, system_kind, linked_account_id)
    VALUES (acc.budget_id, g_id, acc.name,
            (SELECT COALESCE(MAX(sort), -1) + 1 FROM public.categories WHERE group_id = g_id),
            'cc_payment', acc.id);
  END LOOP;
END $$;
