begin;

alter table public.aspire_employee_access
  drop constraint if exists aspire_employee_access_role_check;

alter table public.aspire_employee_access
  add constraint aspire_employee_access_role_check
  check (role in ('owner', 'admin', 'employee', 'support'));

alter table public.aspire_employee_access
  add column if not exists email text;

update public.aspire_employee_access access
set email = lower(users.email)
from auth.users users
where users.id = access.user_id
  and access.email is null;

alter table public.aspire_employee_access
  alter column email set not null,
  alter column role set default 'employee',
  alter column is_hidden set default false;

alter table public.aspire_employee_access
  add constraint aspire_employee_access_email_check
  check (email = lower(email) and char_length(email) between 3 and 254);

create unique index aspire_employee_access_email_unique
  on public.aspire_employee_access (business_key, lower(email));

alter table public.aspire_appointments
  add constraint aspire_appointments_business_id_unique unique (business_key, id);

create table public.aspire_appointment_assignments (
  business_key text not null,
  appointment_id uuid not null,
  user_id uuid not null,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (appointment_id, user_id),
  constraint aspire_appointment_assignments_business_check
    check (business_key = 'aspire-mobile-detailing'),
  constraint aspire_appointment_assignments_appointment_fk
    foreign key (business_key, appointment_id)
    references public.aspire_appointments(business_key, id)
    on delete cascade,
  constraint aspire_appointment_assignments_employee_fk
    foreign key (business_key, user_id)
    references public.aspire_employee_access(business_key, user_id)
    on delete cascade
);

create index aspire_appointment_assignments_user_idx
  on public.aspire_appointment_assignments (business_key, user_id, appointment_id);

insert into public.aspire_appointment_assignments (
  business_key,
  appointment_id,
  user_id,
  assigned_by
)
select
  appointment.business_key,
  appointment.id,
  appointment.assigned_user_id,
  appointment.updated_by
from public.aspire_appointments appointment
join public.aspire_employee_access access
  on access.business_key = appointment.business_key
 and access.user_id = appointment.assigned_user_id
where appointment.assigned_user_id is not null
on conflict (appointment_id, user_id) do nothing;

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
      or exists (
        select 1
        from public.aspire_appointment_assignments assignment
        where assignment.business_key = requested_business_key
          and assignment.appointment_id = requested_appointment_id
          and assignment.user_id = (select auth.uid())
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
  select (select auth.uid()) is not null
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

create or replace function public.aspire_set_appointment_assignments(
  p_appointment_id uuid,
  p_user_ids uuid[]
)
returns setof public.aspire_appointment_assignments
language plpgsql
security definer
set search_path = ''
as $$
declare
  appointment_business_key text;
begin
  select appointment.business_key
  into appointment_business_key
  from public.aspire_appointments appointment
  where appointment.id = p_appointment_id;

  if appointment_business_key is null then
    raise exception 'Calendar item not found.';
  end if;

  if not (select aspire_private.has_business_role(
    appointment_business_key,
    array['owner', 'admin', 'support']
  )) then
    raise exception 'You do not have permission to manage this calendar.';
  end if;

  delete from public.aspire_appointment_assignments
  where appointment_id = p_appointment_id;

  insert into public.aspire_appointment_assignments (
    business_key,
    appointment_id,
    user_id,
    assigned_by
  )
  select distinct
    appointment_business_key,
    p_appointment_id,
    requested_user_id,
    (select auth.uid())
  from unnest(coalesce(p_user_ids, array[]::uuid[])) requested_user_id
  join public.aspire_employee_access access
    on access.business_key = appointment_business_key
   and access.user_id = requested_user_id
   and access.is_active
   and not access.is_hidden
   and access.role in ('owner', 'admin', 'employee');

  update public.aspire_appointments
  set assigned_user_id = (
    select assignment.user_id
    from public.aspire_appointment_assignments assignment
    where assignment.appointment_id = p_appointment_id
    order by assignment.assigned_at, assignment.user_id
    limit 1
  )
  where id = p_appointment_id;

  return query
  select assignment.*
  from public.aspire_appointment_assignments assignment
  where assignment.appointment_id = p_appointment_id
  order by assignment.assigned_at, assignment.user_id;
end;
$$;

revoke all on function aspire_private.has_calendar_access(text, uuid) from public, anon;
revoke all on function aspire_private.can_view_employee(text, uuid) from public, anon;
grant execute on function aspire_private.has_calendar_access(text, uuid) to authenticated;
grant execute on function aspire_private.can_view_employee(text, uuid) to authenticated;

revoke all on function public.aspire_set_appointment_assignments(uuid, uuid[]) from public, anon;
grant execute on function public.aspire_set_appointment_assignments(uuid, uuid[]) to authenticated;

drop policy if exists aspire_employee_access_select on public.aspire_employee_access;
create policy aspire_employee_access_select
on public.aspire_employee_access for select to authenticated
using ((select aspire_private.can_view_employee(business_key, user_id)));

drop policy if exists aspire_appointments_employee_select on public.aspire_appointments;
drop policy if exists aspire_appointments_employee_insert on public.aspire_appointments;
drop policy if exists aspire_appointments_employee_update on public.aspire_appointments;
drop policy if exists aspire_appointments_employee_delete on public.aspire_appointments;

create policy aspire_appointments_role_select
on public.aspire_appointments for select to authenticated
using ((select aspire_private.has_calendar_access(business_key, id)));

create policy aspire_appointments_admin_insert
on public.aspire_appointments for insert to authenticated
with check ((select aspire_private.has_business_role(
  business_key,
  array['owner', 'admin', 'support']
)));

create policy aspire_appointments_admin_update
on public.aspire_appointments for update to authenticated
using ((select aspire_private.has_business_role(
  business_key,
  array['owner', 'admin', 'support']
)))
with check ((select aspire_private.has_business_role(
  business_key,
  array['owner', 'admin', 'support']
)));

create policy aspire_appointments_admin_delete
on public.aspire_appointments for delete to authenticated
using ((select aspire_private.has_business_role(
  business_key,
  array['owner', 'admin', 'support']
)));

alter table public.aspire_appointment_assignments enable row level security;

create policy aspire_appointment_assignments_select
on public.aspire_appointment_assignments for select to authenticated
using ((select aspire_private.has_calendar_access(business_key, appointment_id)));

revoke all on table public.aspire_appointment_assignments from anon, authenticated;
grant select on table public.aspire_appointment_assignments to authenticated;

commit;
