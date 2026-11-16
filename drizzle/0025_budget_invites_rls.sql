ALTER TABLE "budget_invites"
  ADD CONSTRAINT "budget_invites_invited_by_fk"
  FOREIGN KEY ("invited_by") REFERENCES auth.users ("id") ON DELETE SET NULL;
--> statement-breakpoint
-- the owner role is never invitable, and emails are stored lowercase
ALTER TABLE "budget_invites" ADD CONSTRAINT "budget_invites_role_not_owner" CHECK ("role" <> 'owner');
--> statement-breakpoint
ALTER TABLE "budget_invites" ADD CONSTRAINT "budget_invites_email_lower" CHECK ("email" = lower("email"));
--> statement-breakpoint
CREATE UNIQUE INDEX "budget_invites_budget_email_unique" ON "budget_invites" ("budget_id", "email");
--> statement-breakpoint
CREATE INDEX "budget_invites_email_idx" ON "budget_invites" ("email");
--> statement-breakpoint

-- owners manage invites for their budget
CREATE POLICY "budget_invites_select_owner" ON "budget_invites"
  FOR SELECT TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner']::public.budget_role[]));
--> statement-breakpoint
-- invitees can see invitations addressed to their own (JWT) email
CREATE POLICY "budget_invites_select_invitee" ON "budget_invites"
  FOR SELECT TO authenticated
  USING (email = lower((SELECT auth.jwt() ->> 'email')));
--> statement-breakpoint
CREATE POLICY "budget_invites_insert_owner" ON "budget_invites"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_budget_member(budget_id, ARRAY['owner']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "budget_invites_delete_owner" ON "budget_invites"
  FOR DELETE TO authenticated
  USING (public.is_budget_member(budget_id, ARRAY['owner']::public.budget_role[]));
--> statement-breakpoint
CREATE POLICY "budget_invites_delete_invitee" ON "budget_invites"
  FOR DELETE TO authenticated
  USING (email = lower((SELECT auth.jwt() ->> 'email')));
