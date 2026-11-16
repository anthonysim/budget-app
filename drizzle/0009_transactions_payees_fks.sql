-- Payee names are unique per budget, case-insensitively
CREATE UNIQUE INDEX "payees_budget_lower_name_unique" ON "payees" ("budget_id", lower("name"));
--> statement-breakpoint

-- Same-budget foreign keys. SET NULL (column) needs PostgreSQL 15+ and leaves budget_id intact.
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_payee_budget_fk"
  FOREIGN KEY ("budget_id", "payee_id") REFERENCES "payees" ("budget_id", "id")
  ON DELETE SET NULL ("payee_id");
--> statement-breakpoint
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_category_budget_fk"
  FOREIGN KEY ("budget_id", "category_id") REFERENCES "categories" ("budget_id", "id")
  ON DELETE SET NULL ("category_id");
--> statement-breakpoint
ALTER TABLE "payees"
  ADD CONSTRAINT "payees_last_category_budget_fk"
  FOREIGN KEY ("budget_id", "last_category_id") REFERENCES "categories" ("budget_id", "id")
  ON DELETE SET NULL ("last_category_id");
--> statement-breakpoint
CREATE INDEX "transactions_category_idx" ON "transactions" ("category_id");
--> statement-breakpoint
CREATE INDEX "transactions_payee_idx" ON "transactions" ("payee_id");
--> statement-breakpoint

CREATE POLICY "payees_select_member" ON "payees"
  FOR SELECT TO authenticated USING (public.is_budget_member(budget_id));
--> statement-breakpoint
CREATE POLICY "payees_insert_editor" ON "payees"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "payees_update_editor" ON "payees"
  FOR UPDATE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]))
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "payees_delete_editor" ON "payees"
  FOR DELETE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint

-- Backfill: existing "Starting Balance" transactions get a payee, and on-budget ones
-- are categorized as inflow (Ready to Assign).
INSERT INTO public.payees (budget_id, name)
SELECT DISTINCT t.budget_id, 'Starting Balance'
FROM public.transactions t
WHERE t.memo = 'Starting Balance'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE public.transactions t
SET payee_id = p.id
FROM public.payees p
WHERE t.memo = 'Starting Balance'
  AND t.payee_id IS NULL
  AND p.budget_id = t.budget_id
  AND lower(p.name) = 'starting balance';
--> statement-breakpoint
UPDATE public.transactions t
SET category_id = c.id
FROM public.accounts a, public.categories c
WHERE t.memo = 'Starting Balance'
  AND t.category_id IS NULL
  AND a.id = t.account_id
  AND a.on_budget
  AND c.budget_id = t.budget_id
  AND c.system_kind = 'inflow';
