begin;

create or replace function aspire_private.has_calendar_access(
  requested_business_key text,
  requested_appointment_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and (
      (select aspire_private.has_business_role(
        requested_business_key,
        array['owner', 'admin', 'support']
      ))
      or (
        (select aspire_private.has_business_role(
          requested_business_key,
          array['employee']
        ))
        and exists (
          select 1
          from public.aspire_appointment_assignments assignment
          where assignment.business_key = requested_business_key
            and assignment.appointment_id = requested_appointment_id
            and assignment.user_id = (select auth.uid())
        )
      )
    );
$$;

create or replace function aspire_private.can_view_employee(
  requested_business_key text,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select aspire_private.has_business_role(
    requested_business_key,
    array['owner', 'admin', 'employee', 'support']
  ))
    and (
      target_user_id = (select auth.uid())
      or (
        exists (
          select 1
          from public.aspire_employee_access target
          where target.business_key = requested_business_key
            and target.user_id = target_user_id
            and not target.is_hidden
        )
        and (
          (select aspire_private.has_business_role(
            requested_business_key,
            array['owner', 'admin', 'support']
          ))
          or exists (
            select 1
            from public.aspire_appointment_assignments mine
            join public.aspire_appointment_assignments coworker
              on coworker.business_key = mine.business_key
             and coworker.appointment_id = mine.appointment_id
            where mine.business_key = requested_business_key
              and mine.user_id = (select auth.uid())
              and coworker.user_id = target_user_id
          )
        )
      )
    );
$$;

drop policy if exists aspire_businesses_employee_select on public.aspire_businesses;
create policy aspire_businesses_admin_select
on public.aspire_businesses for select to authenticated
using ((select aspire_private.has_business_role(
  business_key,
  array['owner', 'admin', 'support']
)));

drop policy if exists aspire_customers_employee_select on public.aspire_customers;
drop policy if exists aspire_customers_employee_insert on public.aspire_customers;
drop policy if exists aspire_customers_employee_update on public.aspire_customers;
drop policy if exists aspire_customers_employee_delete on public.aspire_customers;
create policy aspire_customers_admin_select
on public.aspire_customers for select to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));
create policy aspire_customers_admin_insert
on public.aspire_customers for insert to authenticated
with check ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));
create policy aspire_customers_admin_update
on public.aspire_customers for update to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])))
with check ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));
create policy aspire_customers_admin_delete
on public.aspire_customers for delete to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));

drop policy if exists aspire_catalog_employee_select on public.aspire_catalog_items;
drop policy if exists aspire_catalog_employee_insert on public.aspire_catalog_items;
drop policy if exists aspire_catalog_employee_update on public.aspire_catalog_items;
drop policy if exists aspire_catalog_employee_delete on public.aspire_catalog_items;
create policy aspire_catalog_admin_select
on public.aspire_catalog_items for select to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));
create policy aspire_catalog_admin_insert
on public.aspire_catalog_items for insert to authenticated
with check ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));
create policy aspire_catalog_admin_update
on public.aspire_catalog_items for update to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])))
with check ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));
create policy aspire_catalog_admin_delete
on public.aspire_catalog_items for delete to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));

drop policy if exists aspire_rewards_employee_select on public.aspire_rewards;
drop policy if exists aspire_rewards_employee_insert on public.aspire_rewards;
drop policy if exists aspire_rewards_employee_update on public.aspire_rewards;
drop policy if exists aspire_rewards_employee_delete on public.aspire_rewards;
create policy aspire_rewards_admin_select
on public.aspire_rewards for select to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));
create policy aspire_rewards_admin_insert
on public.aspire_rewards for insert to authenticated
with check ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));
create policy aspire_rewards_admin_update
on public.aspire_rewards for update to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])))
with check ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));
create policy aspire_rewards_admin_delete
on public.aspire_rewards for delete to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));

drop policy if exists aspire_loyalty_employee_select on public.aspire_loyalty_settings;
drop policy if exists aspire_loyalty_employee_update on public.aspire_loyalty_settings;
create policy aspire_loyalty_admin_select
on public.aspire_loyalty_settings for select to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));
create policy aspire_loyalty_admin_update
on public.aspire_loyalty_settings for update to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])))
with check ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));

drop policy if exists aspire_points_employee_select on public.aspire_points_transactions;
drop policy if exists aspire_points_employee_insert on public.aspire_points_transactions;
create policy aspire_points_admin_select
on public.aspire_points_transactions for select to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));
create policy aspire_points_admin_insert
on public.aspire_points_transactions for insert to authenticated
with check ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));

drop policy if exists aspire_assessments_employee_select on public.aspire_assessment_requests;
drop policy if exists aspire_assessments_employee_update on public.aspire_assessment_requests;
drop policy if exists aspire_assessments_employee_delete on public.aspire_assessment_requests;
create policy aspire_assessments_admin_select
on public.aspire_assessment_requests for select to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));
create policy aspire_assessments_admin_update
on public.aspire_assessment_requests for update to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])))
with check ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));
create policy aspire_assessments_admin_delete
on public.aspire_assessment_requests for delete to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));

drop policy if exists aspire_activity_employee_insert on public.aspire_activity_log;
drop policy if exists aspire_activity_support_select on public.aspire_activity_log;
create policy aspire_activity_admin_insert
on public.aspire_activity_log for insert to authenticated
with check (
  actor_user_id = (select auth.uid())
  and (select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support']))
);
create policy aspire_activity_admin_select
on public.aspire_activity_log for select to authenticated
using ((select aspire_private.has_business_role(business_key, array['owner', 'admin', 'support'])));

commit;
