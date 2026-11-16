ALTER TABLE "subtransactions"
  ADD CONSTRAINT "subtransactions_category_budget_fk"
  FOREIGN KEY ("budget_id", "category_id") REFERENCES "categories" ("budget_id", "id")
  ON DELETE SET NULL ("category_id");
--> statement-breakpoint
CREATE INDEX "subtransactions_transaction_idx" ON "subtransactions" ("transaction_id");
--> statement-breakpoint
CREATE INDEX "subtransactions_category_idx" ON "subtransactions" ("category_id");
--> statement-breakpoint

CREATE POLICY "subtransactions_select_member" ON "subtransactions"
  FOR SELECT TO authenticated USING (public.is_budget_member(budget_id));
--> statement-breakpoint
CREATE POLICY "subtransactions_insert_editor" ON "subtransactions"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "subtransactions_update_editor" ON "subtransactions"
  FOR UPDATE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]))
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "subtransactions_delete_editor" ON "subtransactions"
  FOR DELETE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
