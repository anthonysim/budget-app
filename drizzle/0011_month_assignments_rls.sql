-- month is always the first of a month
ALTER TABLE "month_assignments"
  ADD CONSTRAINT "month_assignments_first_of_month"
  CHECK (EXTRACT(day FROM "month") = 1);
--> statement-breakpoint
CREATE INDEX "month_assignments_budget_month_idx" ON "month_assignments" ("budget_id", "month");
--> statement-breakpoint

CREATE POLICY "month_assignments_select_member" ON "month_assignments"
  FOR SELECT TO authenticated USING (public.is_budget_member(budget_id));
--> statement-breakpoint
CREATE POLICY "month_assignments_insert_editor" ON "month_assignments"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "month_assignments_update_editor" ON "month_assignments"
  FOR UPDATE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]))
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "month_assignments_delete_editor" ON "month_assignments"
  FOR DELETE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
