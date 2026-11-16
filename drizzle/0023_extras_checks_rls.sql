ALTER TABLE "accounts" ADD CONSTRAINT "accounts_apr_bps_range" CHECK ("apr_bps" IS NULL OR "apr_bps" BETWEEN 0 AND 100000);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_min_payment_nonneg" CHECK ("min_payment" IS NULL OR "min_payment" >= 0);
--> statement-breakpoint
ALTER TABLE "month_notes" ADD CONSTRAINT "month_notes_first_of_month" CHECK (EXTRACT(day FROM "month") = 1);
--> statement-breakpoint
CREATE INDEX "transactions_flag_idx" ON "transactions" ("account_id") WHERE "flag" IS NOT NULL;
--> statement-breakpoint

CREATE POLICY "month_notes_select_member" ON "month_notes"
  FOR SELECT TO authenticated USING (public.is_budget_member(budget_id));
--> statement-breakpoint
CREATE POLICY "month_notes_insert_editor" ON "month_notes"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "month_notes_update_editor" ON "month_notes"
  FOR UPDATE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]))
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "month_notes_delete_editor" ON "month_notes"
  FOR DELETE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
