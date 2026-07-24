-- Task 12 (Milestone 1): AiCreditsTab.tsx performed a direct, unauthenticated-payment
-- client-side update() of ai_usage_credits.credits_purchased_addon. The table's only RLS
-- policy was `FOR ALL USING (check_workspace_access(workspace_id))` with no WITH CHECK —
-- a row-visibility gate only, no restriction on which columns a member could write. Any
-- workspace member could grant themselves unlimited free AI credits from the browser
-- console (confirmed live against a real row: a plain 'member' user set
-- credits_purchased_addon to 999999 via a direct client update()).
--
-- Fix: lock the table down to SELECT-only for normal client sessions. All legitimate writes
-- now go through either a SECURITY DEFINER function (deduct_ai_credit for usage deduction,
-- fn_provision_ai_usage_credits for new-workspace provisioning — both already had fixed,
-- parameterized, non-dynamic-SQL bodies, so elevating them is safe) or the service-role
-- client (e.g. a future verified-payment webhook, or an admin action).

DROP POLICY IF EXISTS "Workspace access for usage_credits" ON public.ai_usage_credits;

CREATE POLICY "Workspace members can view usage_credits" ON public.ai_usage_credits
    FOR SELECT USING (check_workspace_access(workspace_id));

-- No INSERT/UPDATE/DELETE policy exists for ai_usage_credits anymore — RLS defaults to deny
-- for any operation with no matching policy, so all three are now blocked for authenticated
-- and anon roles alike.

ALTER FUNCTION deduct_ai_credit(UUID, INT) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION fn_provision_ai_usage_credits() SECURITY DEFINER SET search_path = public;
