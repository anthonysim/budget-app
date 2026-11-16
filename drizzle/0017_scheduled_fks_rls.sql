ALTER TABLE "scheduled_transactions"
  ADD CONSTRAINT "scheduled_payee_budget_fk"
  FOREIGN KEY ("budget_id", "payee_id") REFERENCES "payees" ("budget_id", "id")
  ON DELETE SET NULL ("payee_id");
--> statement-breakpoint
ALTER TABLE "scheduled_transactions"
  ADD CONSTRAINT "scheduled_category_budget_fk"
  FOREIGN KEY ("budget_id", "category_id") REFERENCES "categories" ("budget_id", "id")
  ON DELETE SET NULL ("category_id");
--> statement-breakpoint
ALTER TABLE "scheduled_transactions"
  ADD CONSTRAINT "scheduled_transfer_account_budget_fk"
  FOREIGN KEY ("budget_id", "transfer_account_id") REFERENCES "accounts" ("budget_id", "id")
  ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "scheduled_transactions"
  ADD CONSTRAINT "scheduled_anchor_day_range" CHECK ("anchor_day" BETWEEN 1 AND 31);
--> statement-breakpoint
CREATE INDEX "scheduled_budget_next_idx" ON "scheduled_transactions" ("budget_id", "next_date");
--> statement-breakpoint

CREATE POLICY "scheduled_select_member" ON "scheduled_transactions"
  FOR SELECT TO authenticated USING (public.is_budget_member(budget_id));
--> statement-breakpoint
CREATE POLICY "scheduled_insert_editor" ON "scheduled_transactions"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "scheduled_update_editor" ON "scheduled_transactions"
  FOR UPDATE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]))
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "scheduled_delete_editor" ON "scheduled_transactions"
  FOR DELETE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
