-- Aspire only. Does not touch other businesses' tables or rows.
-- Safe to re-run.

begin;

create or replace function public.aspire_normalize_phone(value text)
returns text
language sql
immutable
as $$
  select case
    when digits = '' then null
    when char_length(digits) = 11 and left(digits, 1) = '1' then substring(digits from 2)
    else digits
  end
  from (
    select regexp_replace(coalesce(value, ''), '\D', '', 'g') as digits
  ) parsed;
$$;

alter table public.aspire_customers
  add column if not exists phone_normalized text,
  add column if not exists vehicles text[] not null default '{}';

update public.aspire_customers
set
  phone_normalized = public.aspire_normalize_phone(phone),
  vehicles = case
    when coalesce(array_length(vehicles, 1), 0) > 0 then vehicles
    when coalesce(trim(vehicle_details), '') = '' then '{}'::text[]
    else array[trim(vehicle_details)]
  end
where business_key = 'aspire-mobile-detailing'
  and (
    phone_normalized is distinct from public.aspire_normalize_phone(phone)
    or coalesce(array_length(vehicles, 1), 0) = 0
  );

create or replace function public.aspire_customers_normalize_phone()
returns trigger
language plpgsql
as $$
begin
  if new.business_key is distinct from 'aspire-mobile-detailing' then
    return new;
  end if;
  new.phone_normalized = public.aspire_normalize_phone(new.phone);
  if new.vehicles is null then
    new.vehicles = '{}';
  end if;
  if coalesce(new.vehicle_details, '') = '' and coalesce(array_length(new.vehicles, 1), 0) > 0 then
    new.vehicle_details = array_to_string(new.vehicles, ', ');
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'aspire_customers_normalize_phone'
      and tgrelid = 'public.aspire_customers'::regclass
  ) then
    create trigger aspire_customers_normalize_phone
    before insert or update on public.aspire_customers
    for each row execute function public.aspire_customers_normalize_phone();
  end if;
end;
$$;

create index if not exists aspire_customers_phone_normalized_idx
  on public.aspire_customers (business_key, phone_normalized)
  where phone_normalized is not null
    and business_key = 'aspire-mobile-detailing';

alter table public.aspire_catalog_items
  add column if not exists duration_minutes integer not null default 60;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'aspire_catalog_items_duration_check'
      and conrelid = 'public.aspire_catalog_items'::regclass
  ) then
    alter table public.aspire_catalog_items
      add constraint aspire_catalog_items_duration_check
      check (duration_minutes > 0 and duration_minutes <= 24 * 60);
  end if;
end;
$$;

update public.aspire_catalog_items
set duration_minutes = case slug
  when 'exterior-wash' then 45
  when 'exterior-detail' then 90
  when 'interior-clean' then 90
  when 'standard-detail' then 120
  when 'interior-detail' then 150
  when 'full-detail' then 210
  when 'headlight-renewal' then 30
  when 'steam-cleaning' then 45
  when 'engine-bay' then 45
  when 'deep-shampoo' then 60
  when 'ceramic-graphene-coating' then 240
  when 'exterior-reconditioning' then 180
  when 'specialty-vehicles' then 180
  when 'level-1-basic-core' then 480
  when 'level-2-intermediate' then 480
  when 'level-3-advanced' then 480
  when 'master-all-levels' then 1440
  else duration_minutes
end
where business_key = 'aspire-mobile-detailing'
  and slug in (
    'exterior-wash',
    'exterior-detail',
    'interior-clean',
    'standard-detail',
    'interior-detail',
    'full-detail',
    'headlight-renewal',
    'steam-cleaning',
    'engine-bay',
    'deep-shampoo',
    'ceramic-graphene-coating',
    'exterior-reconditioning',
    'specialty-vehicles',
    'level-1-basic-core',
    'level-2-intermediate',
    'level-3-advanced',
    'master-all-levels'
  );

create table if not exists public.aspire_appointment_services (
  appointment_id uuid not null references public.aspire_appointments(id) on delete cascade,
  catalog_item_id uuid not null references public.aspire_catalog_items(id) on delete restrict,
  sort_order integer not null default 0,
  primary key (appointment_id, catalog_item_id)
);

create index if not exists aspire_appointment_services_item_idx
  on public.aspire_appointment_services (catalog_item_id);

alter table public.aspire_appointment_services enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'aspire_appointment_services'
      and policyname = 'aspire_appointment_services_select'
  ) then
    create policy aspire_appointment_services_select
    on public.aspire_appointment_services for select to authenticated
    using (
      exists (
        select 1
        from public.aspire_appointments appointment
        where appointment.id = appointment_id
          and appointment.business_key = 'aspire-mobile-detailing'
          and (select aspire_private.has_business_access(appointment.business_key))
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'aspire_appointment_services'
      and policyname = 'aspire_appointment_services_write'
  ) then
    create policy aspire_appointment_services_write
    on public.aspire_appointment_services for all to authenticated
    using (
      exists (
        select 1
        from public.aspire_appointments appointment
        where appointment.id = appointment_id
          and appointment.business_key = 'aspire-mobile-detailing'
          and (select aspire_private.has_business_role(appointment.business_key, array['owner', 'admin', 'support']))
      )
    )
    with check (
      exists (
        select 1
        from public.aspire_appointments appointment
        where appointment.id = appointment_id
          and appointment.business_key = 'aspire-mobile-detailing'
          and (select aspire_private.has_business_role(appointment.business_key, array['owner', 'admin', 'support']))
      )
    );
  end if;
end;
$$;

grant select, insert, update, delete on public.aspire_appointment_services to authenticated;

insert into public.aspire_appointment_services (appointment_id, catalog_item_id, sort_order)
select appointment.id, appointment.catalog_item_id, 0
from public.aspire_appointments appointment
where appointment.business_key = 'aspire-mobile-detailing'
  and appointment.catalog_item_id is not null
on conflict do nothing;

commit;
