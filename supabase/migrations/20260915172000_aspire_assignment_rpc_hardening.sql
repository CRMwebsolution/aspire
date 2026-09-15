begin;

alter function public.aspire_set_appointment_assignments(uuid, uuid[])
  security invoker;

create policy aspire_appointment_assignments_admin_insert
on public.aspire_appointment_assignments for insert to authenticated
with check ((select aspire_private.has_business_role(
  business_key,
  array['owner', 'admin', 'support']
)));

create policy aspire_appointment_assignments_admin_delete
on public.aspire_appointment_assignments for delete to authenticated
using ((select aspire_private.has_business_role(
  business_key,
  array['owner', 'admin', 'support']
)));

grant insert, delete on table public.aspire_appointment_assignments to authenticated;

create index aspire_appointment_assignments_appointment_idx
  on public.aspire_appointment_assignments (business_key, appointment_id);

create index aspire_appointment_assignments_assigned_by_idx
  on public.aspire_appointment_assignments (assigned_by)
  where assigned_by is not null;

commit;
