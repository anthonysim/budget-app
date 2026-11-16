CREATE INDEX "category_groups_budget_sort_idx" ON "category_groups" ("budget_id", "sort");
--> statement-breakpoint
CREATE INDEX "categories_group_sort_idx" ON "categories" ("group_id", "sort");
--> statement-breakpoint
-- one Ready to Assign category per budget
CREATE UNIQUE INDEX "categories_one_inflow_per_budget" ON "categories" ("budget_id") WHERE "system_kind" = 'inflow';
--> statement-breakpoint

CREATE POLICY "category_groups_select_member" ON "category_groups"
  FOR SELECT TO authenticated USING (public.is_budget_member(budget_id));
--> statement-breakpoint
CREATE POLICY "category_groups_insert_editor" ON "category_groups"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "category_groups_update_editor" ON "category_groups"
  FOR UPDATE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]))
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "category_groups_delete_editor" ON "category_groups"
  FOR DELETE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint

CREATE POLICY "categories_select_member" ON "categories"
  FOR SELECT TO authenticated USING (public.is_budget_member(budget_id));
--> statement-breakpoint
CREATE POLICY "categories_insert_editor" ON "categories"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "categories_update_editor" ON "categories"
  FOR UPDATE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]))
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "categories_delete_editor" ON "categories"
  FOR DELETE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner','editor']::public.budget_role[]));
--> statement-breakpoint

-- Backfill default groups/categories for budgets created before this migration.
-- Keep in sync with src/lib/default-categories.ts.
DO $$
DECLARE
  b record;
  g_id uuid;
  g_sort int;
  c_sort int;
  grp jsonb;
  cat text;
  defaults jsonb := '[
    {"name":"Bills","categories":["Rent / Mortgage","Electric","Water","Internet","Phone"]},
    {"name":"Needs","categories":["Groceries","Transportation","Medical","Household"]},
    {"name":"Wants","categories":["Dining Out","Entertainment","Shopping","Hobbies"]},
    {"name":"Savings","categories":["Emergency Fund","Vacation"]}
  ]'::jsonb;
BEGIN
  FOR b IN SELECT id FROM public.budgets WHERE NOT EXISTS (SELECT 1 FROM public.category_groups cg WHERE cg.budget_id = budgets.id) LOOP
    INSERT INTO public.category_groups (budget_id, name, sort, hidden, system)
    VALUES (b.id, 'Inflow', -1, true, true) RETURNING id INTO g_id;
    INSERT INTO public.categories (budget_id, group_id, name, sort, system_kind)
    VALUES (b.id, g_id, 'Ready to Assign', 0, 'inflow');

    g_sort := 0;
    FOR grp IN SELECT * FROM jsonb_array_elements(defaults) LOOP
      INSERT INTO public.category_groups (budget_id, name, sort)
      VALUES (b.id, grp ->> 'name', g_sort) RETURNING id INTO g_id;
      c_sort := 0;
      FOR cat IN SELECT jsonb_array_elements_text(grp -> 'categories') LOOP
        INSERT INTO public.categories (budget_id, group_id, name, sort)
        VALUES (b.id, g_id, cat, c_sort);
        c_sort := c_sort + 1;
      END LOOP;
      g_sort := g_sort + 1;
    END LOOP;
  END LOOP;
END $$;
