ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_created_by_auth_users_fk"
  FOREIGN KEY ("created_by") REFERENCES auth.users ("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "budget_members"
  ADD CONSTRAINT "budget_members_user_id_auth_users_fk"
  FOREIGN KEY ("user_id") REFERENCES auth.users ("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX "budget_members_user_id_idx" ON "budget_members" ("user_id");
--> statement-breakpoint

-- Membership check used by RLS policies on every budget-scoped table.
-- SECURITY DEFINER so it can read budget_members without recursing into its own RLS.
CREATE OR REPLACE FUNCTION public.is_budget_member(
  p_budget_id uuid,
  p_roles public.budget_role[] DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.budget_members m
    WHERE m.budget_id = p_budget_id
      AND m.user_id = (SELECT auth.uid())
      AND (p_roles IS NULL OR m.role = ANY (p_roles))
  );
$$;
--> statement-breakpoint

-- budgets: members read; owners rename/delete. Inserts happen server-side only.
CREATE POLICY "budgets_select_member" ON "budgets"
  FOR SELECT TO authenticated USING (public.is_budget_member(id));
--> statement-breakpoint
CREATE POLICY "budgets_update_owner" ON "budgets"
  FOR UPDATE TO authenticated
  USING (public.is_budget_member(id, ARRAY['owner']::public.budget_role[]))
  WITH CHECK (public.is_budget_member(id, ARRAY['owner']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "budgets_delete_owner" ON "budgets"
  FOR DELETE TO authenticated
  USING (public.is_budget_member(id, ARRAY['owner']::public.budget_role[]));
--> statement-breakpoint

-- budget_members: members can see who else is in their budgets. No client writes.
CREATE POLICY "budget_members_select_member" ON "budget_members"
  FOR SELECT TO authenticated USING (public.is_budget_member(budget_id));
