ALTER TABLE "category_targets"
  ADD CONSTRAINT "category_targets_amount_positive" CHECK ("amount" > 0);
--> statement-breakpoint
CREATE INDEX "category_targets_budget_idx" ON "category_targets" ("budget_id");
--> statement-breakpoint

CREATE POLICY "category_targets_select_member" ON "category_targets"
  FOR SELECT TO authenticated USING (public.is_budget_member(budget_id));
--> statement-breakpoint
CREATE POLICY "category_targets_insert_editor" ON "category_targets"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "category_targets_update_editor" ON "category_targets"
  FOR UPDATE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]))
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "category_targets_delete_editor" ON "category_targets"
  FOR DELETE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
