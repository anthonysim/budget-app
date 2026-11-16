-- imported transactions are unique per account by their import id
CREATE UNIQUE INDEX "transactions_account_import_id_unique"
  ON "transactions" ("account_id", "import_id") WHERE "import_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "transactions_unapproved_idx" ON "transactions" ("account_id") WHERE NOT "approved";
--> statement-breakpoint

ALTER TABLE "payee_rules"
  ADD CONSTRAINT "payee_rules_category_budget_fk"
  FOREIGN KEY ("budget_id", "category_id") REFERENCES "categories" ("budget_id", "id")
  ON DELETE SET NULL ("category_id");
--> statement-breakpoint
CREATE INDEX "payee_rules_budget_sort_idx" ON "payee_rules" ("budget_id", "sort");
--> statement-breakpoint

CREATE POLICY "payee_rules_select_member" ON "payee_rules"
  FOR SELECT TO authenticated USING (public.is_budget_member(budget_id));
--> statement-breakpoint
CREATE POLICY "payee_rules_insert_editor" ON "payee_rules"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "payee_rules_update_editor" ON "payee_rules"
  FOR UPDATE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]))
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "payee_rules_delete_editor" ON "payee_rules"
  FOR DELETE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
