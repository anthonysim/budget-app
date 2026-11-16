CREATE INDEX "accounts_budget_sort_idx" ON "accounts" ("budget_id", "sort");
--> statement-breakpoint
CREATE INDEX "transactions_account_idx" ON "transactions" ("account_id");
--> statement-breakpoint
CREATE INDEX "transactions_budget_date_idx" ON "transactions" ("budget_id", "date");
--> statement-breakpoint

-- accounts: members read; owners and editors write
CREATE POLICY "accounts_select_member" ON "accounts"
  FOR SELECT TO authenticated USING (public.is_budget_member(budget_id));
--> statement-breakpoint
CREATE POLICY "accounts_insert_editor" ON "accounts"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "accounts_update_editor" ON "accounts"
  FOR UPDATE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]))
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "accounts_delete_editor" ON "accounts"
  FOR DELETE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint

-- transactions: same rules
CREATE POLICY "transactions_select_member" ON "transactions"
  FOR SELECT TO authenticated USING (public.is_budget_member(budget_id));
--> statement-breakpoint
CREATE POLICY "transactions_insert_editor" ON "transactions"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "transactions_update_editor" ON "transactions"
  FOR UPDATE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]))
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "transactions_delete_editor" ON "transactions"
  FOR DELETE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
