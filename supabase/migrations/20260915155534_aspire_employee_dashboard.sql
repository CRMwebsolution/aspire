begin;

create schema if not exists aspire_private;
comment on schema aspire_private is 'Aspire Mobil Detailing private authorization helpers';
revoke all on schema aspire_private from public, anon;
grant usage on schema aspire_private to authenticated;

create or replace function aspire_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function aspire_private.touch_updated_at() from public, anon, authenticated;

create table public.aspire_businesses (
  business_key text primary key,
  display_name text not null,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aspire_businesses_key_check check (business_key = lower(business_key) and char_length(business_key) between 3 and 80)
);

insert into public.aspire_businesses (business_key, display_name, timezone)
values ('aspire-mobile-detailing', 'Aspire Mobil Detailing', 'America/New_York');

create table public.aspire_employee_access (
  business_key text not null references public.aspire_businesses(business_key) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'employee',
  is_active boolean not null default true,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_key, user_id),
  constraint aspire_employee_access_business_check check (business_key = 'aspire-mobile-detailing'),
  constraint aspire_employee_access_role_check check (role in ('owner', 'employee', 'support')),
  constraint aspire_employee_access_display_name_check check (char_length(display_name) between 1 and 120)
);

create index aspire_employee_access_user_idx on public.aspire_employee_access(user_id, business_key) where is_active;

create or replace function aspire_private.has_business_access(requested_business_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.aspire_employee_access access
      where access.business_key = requested_business_key
        and access.user_id = (select auth.uid())
        and access.is_active
    );
$$;

create or replace function aspire_private.has_business_role(requested_business_key text, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.aspire_employee_access access
      where access.business_key = requested_business_key
        and access.user_id = (select auth.uid())
        and access.is_active
        and access.role = any(allowed_roles)
    );
$$;

revoke all on function aspire_private.has_business_access(text) from public, anon;
revoke all on function aspire_private.has_business_role(text, text[]) from public, anon;
grant execute on function aspire_private.has_business_access(text) to authenticated;
grant execute on function aspire_private.has_business_role(text, text[]) to authenticated;

create table public.aspire_customers (
  id uuid primary key default gen_random_uuid(),
  business_key text not null default 'aspire-mobile-detailing' references public.aspire_businesses(business_key),
  full_name text not null,
  phone text,
  email text,
  vehicle_details text,
  notes text,
  starting_points integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aspire_customers_business_check check (business_key = 'aspire-mobile-detailing'),
  constraint aspire_customers_name_check check (char_length(full_name) between 1 and 120),
  constraint aspire_customers_phone_check check (phone is null or char_length(phone) <= 30),
  constraint aspire_customers_email_check check (email is null or char_length(email) <= 254),
  constraint aspire_customers_starting_points_check check (starting_points >= 0)
);

create index aspire_customers_business_name_idx on public.aspire_customers(business_key, lower(full_name));
create index aspire_customers_business_phone_idx on public.aspire_customers(business_key, phone) where phone is not null;

create table public.aspire_catalog_items (
  id uuid primary key default gen_random_uuid(),
  business_key text not null default 'aspire-mobile-detailing' references public.aspire_businesses(business_key),
  section text not null,
  slug text not null,
  level_label text,
  name text not null,
  summary text not null default '',
  primary_price numeric(10,2),
  primary_price_label text,
  secondary_price numeric(10,2),
  secondary_price_label text,
  is_starting_at boolean not null default false,
  is_quote_only boolean not null default false,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  features text[] not null default '{}',
  draft_content jsonb,
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_key, slug),
  constraint aspire_catalog_items_business_check check (business_key = 'aspire-mobile-detailing'),
  constraint aspire_catalog_items_section_check check (section in ('package', 'addon', 'specialty', 'course')),
  constraint aspire_catalog_items_slug_check check (slug = lower(slug) and char_length(slug) between 1 and 100),
  constraint aspire_catalog_items_name_check check (char_length(name) between 1 and 120),
  constraint aspire_catalog_items_prices_check check (
    (primary_price is null or primary_price >= 0)
    and (secondary_price is null or secondary_price >= 0)
  ),
  constraint aspire_catalog_items_draft_check check (draft_content is null or jsonb_typeof(draft_content) = 'object')
);

create index aspire_catalog_items_public_idx on public.aspire_catalog_items(business_key, section, sort_order) where is_active;

create table public.aspire_rewards (
  id uuid primary key default gen_random_uuid(),
  business_key text not null default 'aspire-mobile-detailing' references public.aspire_businesses(business_key),
  name text not null,
  description text not null default '',
  points_cost integer not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aspire_rewards_business_check check (business_key = 'aspire-mobile-detailing'),
  constraint aspire_rewards_name_check check (char_length(name) between 1 and 160),
  constraint aspire_rewards_points_check check (points_cost > 0)
);

create index aspire_rewards_public_idx on public.aspire_rewards(business_key, sort_order) where is_active;

create table public.aspire_loyalty_settings (
  business_key text primary key default 'aspire-mobile-detailing' references public.aspire_businesses(business_key),
  earning_mode text not null default 'manual',
  points_per_dollar numeric(10,4) not null default 1,
  points_per_job integer not null default 1,
  enrollment_points integer not null default 50,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aspire_loyalty_settings_business_check check (business_key = 'aspire-mobile-detailing'),
  constraint aspire_loyalty_settings_mode_check check (earning_mode in ('dollar', 'job', 'manual')),
  constraint aspire_loyalty_settings_rates_check check (points_per_dollar > 0 and points_per_job > 0 and enrollment_points >= 0)
);

create table public.aspire_appointments (
  id uuid primary key default gen_random_uuid(),
  business_key text not null default 'aspire-mobile-detailing' references public.aspire_businesses(business_key),
  customer_id uuid references public.aspire_customers(id) on delete set null,
  inquiry_id uuid references public.aspire_assessment_requests(id) on delete set null,
  catalog_item_id uuid references public.aspire_catalog_items(id) on delete set null,
  assigned_user_id uuid references auth.users(id) on delete set null,
  kind text not null default 'detailing',
  status text not null default 'tentative',
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  location text,
  vehicle_details text,
  final_amount numeric(10,2),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aspire_appointments_business_check check (business_key = 'aspire-mobile-detailing'),
  constraint aspire_appointments_kind_check check (kind in ('detailing', 'class', 'blocked')),
  constraint aspire_appointments_status_check check (status in ('tentative', 'confirmed', 'completed', 'cancelled', 'no_show')),
  constraint aspire_appointments_title_check check (char_length(title) between 1 and 160),
  constraint aspire_appointments_time_check check (ends_at > starts_at),
  constraint aspire_appointments_amount_check check (final_amount is null or final_amount >= 0)
);

create index aspire_appointments_calendar_idx on public.aspire_appointments(business_key, starts_at, ends_at);
create index aspire_appointments_customer_idx on public.aspire_appointments(customer_id, starts_at desc) where customer_id is not null;

create table public.aspire_points_transactions (
  id uuid primary key default gen_random_uuid(),
  business_key text not null default 'aspire-mobile-detailing' references public.aspire_businesses(business_key),
  customer_id uuid not null references public.aspire_customers(id) on delete cascade,
  appointment_id uuid references public.aspire_appointments(id) on delete set null,
  method text not null,
  points_delta integer not null,
  dollar_amount numeric(10,2),
  description text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint aspire_points_transactions_business_check check (business_key = 'aspire-mobile-detailing'),
  constraint aspire_points_transactions_method_check check (method in ('dollar', 'job', 'manual', 'redemption', 'adjustment')),
  constraint aspire_points_transactions_delta_check check (points_delta <> 0),
  constraint aspire_points_transactions_amount_check check (dollar_amount is null or dollar_amount >= 0)
);

create index aspire_points_transactions_customer_idx on public.aspire_points_transactions(business_key, customer_id, created_at desc);

create table public.aspire_activity_log (
  id uuid primary key default gen_random_uuid(),
  business_key text not null default 'aspire-mobile-detailing' references public.aspire_businesses(business_key),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint aspire_activity_log_business_check check (business_key = 'aspire-mobile-detailing'),
  constraint aspire_activity_log_action_check check (char_length(action) between 1 and 80),
  constraint aspire_activity_log_entity_check check (char_length(entity_type) between 1 and 80),
  constraint aspire_activity_log_details_check check (jsonb_typeof(details) = 'object')
);

create index aspire_activity_log_business_idx on public.aspire_activity_log(business_key, created_at desc);

alter table public.aspire_assessment_requests
  add column business_key text not null default 'aspire-mobile-detailing' references public.aspire_businesses(business_key),
  add column updated_at timestamptz not null default now(),
  add column customer_id uuid references public.aspire_customers(id) on delete set null,
  add column appointment_id uuid references public.aspire_appointments(id) on delete set null,
  add column handled_by uuid references auth.users(id) on delete set null;

alter table public.aspire_assessment_requests
  add constraint aspire_assessment_requests_business_check check (business_key = 'aspire-mobile-detailing');

alter table public.aspire_assessment_requests
  drop constraint if exists aspire_assessment_requests_service_interest_check,
  drop constraint if exists aspire_assessment_requests_class_interest_check;

alter table public.aspire_assessment_requests
  add constraint aspire_assessment_requests_service_interest_length_check check (service_interest is null or char_length(service_interest) <= 120),
  add constraint aspire_assessment_requests_class_interest_length_check check (class_interest is null or char_length(class_interest) <= 120);

create index aspire_assessment_requests_status_idx on public.aspire_assessment_requests(business_key, status, created_at desc);

create trigger aspire_businesses_touch_updated_at
before update on public.aspire_businesses
for each row execute function aspire_private.touch_updated_at();

create trigger aspire_employee_access_touch_updated_at
before update on public.aspire_employee_access
for each row execute function aspire_private.touch_updated_at();

create trigger aspire_customers_touch_updated_at
before update on public.aspire_customers
for each row execute function aspire_private.touch_updated_at();

create trigger aspire_catalog_items_touch_updated_at
before update on public.aspire_catalog_items
for each row execute function aspire_private.touch_updated_at();

create trigger aspire_rewards_touch_updated_at
before update on public.aspire_rewards
for each row execute function aspire_private.touch_updated_at();

create trigger aspire_loyalty_settings_touch_updated_at
before update on public.aspire_loyalty_settings
for each row execute function aspire_private.touch_updated_at();

create trigger aspire_appointments_touch_updated_at
before update on public.aspire_appointments
for each row execute function aspire_private.touch_updated_at();

create trigger aspire_assessment_requests_touch_updated_at
before update on public.aspire_assessment_requests
for each row execute function aspire_private.touch_updated_at();

alter table public.aspire_businesses enable row level security;
alter table public.aspire_employee_access enable row level security;
alter table public.aspire_customers enable row level security;
alter table public.aspire_catalog_items enable row level security;
alter table public.aspire_rewards enable row level security;
alter table public.aspire_loyalty_settings enable row level security;
alter table public.aspire_appointments enable row level security;
alter table public.aspire_points_transactions enable row level security;
alter table public.aspire_activity_log enable row level security;
alter table public.aspire_assessment_requests enable row level security;

create policy aspire_businesses_employee_select
on public.aspire_businesses for select to authenticated
using ((select aspire_private.has_business_access(business_key)));

create policy aspire_employee_access_select
on public.aspire_employee_access for select to authenticated
using (
  user_id = (select auth.uid())
  or ((select aspire_private.has_business_access(business_key)) and not is_hidden)
);

create policy aspire_customers_employee_select
on public.aspire_customers for select to authenticated
using ((select aspire_private.has_business_access(business_key)));
create policy aspire_customers_employee_insert
on public.aspire_customers for insert to authenticated
with check ((select aspire_private.has_business_access(business_key)));
create policy aspire_customers_employee_update
on public.aspire_customers for update to authenticated
using ((select aspire_private.has_business_access(business_key)))
with check ((select aspire_private.has_business_access(business_key)));
create policy aspire_customers_employee_delete
on public.aspire_customers for delete to authenticated
using ((select aspire_private.has_business_access(business_key)));

create policy aspire_catalog_public_select
on public.aspire_catalog_items for select to anon
using (business_key = 'aspire-mobile-detailing' and is_active);
create policy aspire_catalog_employee_select
on public.aspire_catalog_items for select to authenticated
using ((select aspire_private.has_business_access(business_key)));
create policy aspire_catalog_employee_insert
on public.aspire_catalog_items for insert to authenticated
with check ((select aspire_private.has_business_access(business_key)));
create policy aspire_catalog_employee_update
on public.aspire_catalog_items for update to authenticated
using ((select aspire_private.has_business_access(business_key)))
with check ((select aspire_private.has_business_access(business_key)));
create policy aspire_catalog_employee_delete
on public.aspire_catalog_items for delete to authenticated
using ((select aspire_private.has_business_access(business_key)));

create policy aspire_rewards_public_select
on public.aspire_rewards for select to anon
using (business_key = 'aspire-mobile-detailing' and is_active);
create policy aspire_rewards_employee_select
on public.aspire_rewards for select to authenticated
using ((select aspire_private.has_business_access(business_key)));
create policy aspire_rewards_employee_insert
on public.aspire_rewards for insert to authenticated
with check ((select aspire_private.has_business_access(business_key)));
create policy aspire_rewards_employee_update
on public.aspire_rewards for update to authenticated
using ((select aspire_private.has_business_access(business_key)))
with check ((select aspire_private.has_business_access(business_key)));
create policy aspire_rewards_employee_delete
on public.aspire_rewards for delete to authenticated
using ((select aspire_private.has_business_access(business_key)));

create policy aspire_loyalty_public_select
on public.aspire_loyalty_settings for select to anon
using (business_key = 'aspire-mobile-detailing');
create policy aspire_loyalty_employee_select
on public.aspire_loyalty_settings for select to authenticated
using ((select aspire_private.has_business_access(business_key)));
create policy aspire_loyalty_employee_update
on public.aspire_loyalty_settings for update to authenticated
using ((select aspire_private.has_business_access(business_key)))
with check ((select aspire_private.has_business_access(business_key)));

create policy aspire_appointments_employee_select
on public.aspire_appointments for select to authenticated
using ((select aspire_private.has_business_access(business_key)));
create policy aspire_appointments_employee_insert
on public.aspire_appointments for insert to authenticated
with check ((select aspire_private.has_business_access(business_key)));
create policy aspire_appointments_employee_update
on public.aspire_appointments for update to authenticated
using ((select aspire_private.has_business_access(business_key)))
with check ((select aspire_private.has_business_access(business_key)));
create policy aspire_appointments_employee_delete
on public.aspire_appointments for delete to authenticated
using ((select aspire_private.has_business_access(business_key)));

create policy aspire_points_employee_select
on public.aspire_points_transactions for select to authenticated
using ((select aspire_private.has_business_access(business_key)));
create policy aspire_points_employee_insert
on public.aspire_points_transactions for insert to authenticated
with check ((select aspire_private.has_business_access(business_key)));
drop policy if exists public_can_submit_aspire_assessments on public.aspire_assessment_requests;
create policy aspire_assessments_public_insert
on public.aspire_assessment_requests for insert to anon
with check (
  business_key = 'aspire-mobile-detailing'
  and source = 'aspire_website'
  and status = 'new'
  and consent_to_contact
  and county in ('Carteret', 'Onslow', 'Craven', 'Other')
);
create policy aspire_assessments_employee_select
on public.aspire_assessment_requests for select to authenticated
using ((select aspire_private.has_business_access(business_key)));
create policy aspire_assessments_employee_update
on public.aspire_assessment_requests for update to authenticated
using ((select aspire_private.has_business_access(business_key)))
with check ((select aspire_private.has_business_access(business_key)));
create policy aspire_assessments_employee_delete
on public.aspire_assessment_requests for delete to authenticated
using ((select aspire_private.has_business_access(business_key)));

create policy aspire_activity_employee_insert
on public.aspire_activity_log for insert to authenticated
with check (
  actor_user_id = (select auth.uid())
  and (select aspire_private.has_business_access(business_key))
);
create policy aspire_activity_support_select
on public.aspire_activity_log for select to authenticated
using ((select aspire_private.has_business_role(business_key, array['support'])));

revoke all on table public.aspire_businesses from anon, authenticated;
revoke all on table public.aspire_employee_access from anon, authenticated;
revoke all on table public.aspire_customers from anon, authenticated;
revoke all on table public.aspire_catalog_items from anon, authenticated;
revoke all on table public.aspire_rewards from anon, authenticated;
revoke all on table public.aspire_loyalty_settings from anon, authenticated;
revoke all on table public.aspire_appointments from anon, authenticated;
revoke all on table public.aspire_points_transactions from anon, authenticated;
revoke all on table public.aspire_activity_log from anon, authenticated;
revoke all on table public.aspire_assessment_requests from anon, authenticated;

grant select on table public.aspire_businesses to authenticated;
grant select on table public.aspire_employee_access to authenticated;
grant select, insert, update, delete on table public.aspire_customers to authenticated;
grant select, insert, update, delete on table public.aspire_catalog_items to authenticated;
grant select, insert, update, delete on table public.aspire_rewards to authenticated;
grant select, update on table public.aspire_loyalty_settings to authenticated;
grant select, insert, update, delete on table public.aspire_appointments to authenticated;
grant select, insert on table public.aspire_points_transactions to authenticated;
grant select, insert on table public.aspire_activity_log to authenticated;
grant select, update, delete on table public.aspire_assessment_requests to authenticated;
grant insert on table public.aspire_assessment_requests to anon;

grant select (
  id, business_key, section, slug, level_label, name, summary,
  primary_price, primary_price_label, secondary_price, secondary_price_label,
  is_starting_at, is_quote_only, is_featured, is_active, sort_order,
  features, published_at, created_at, updated_at
) on table public.aspire_catalog_items to anon;
grant select (id, business_key, name, description, points_cost, is_active, sort_order)
on table public.aspire_rewards to anon;
grant select (business_key, enrollment_points)
on table public.aspire_loyalty_settings to anon;

insert into public.aspire_employee_access (
  business_key, user_id, display_name, role, is_active, is_hidden
)
select
  'aspire-mobile-detailing', id, 'CRM Web Solution Support', 'support', true, true
from auth.users
where lower(email) = 'cody@southernautomate.com'
on conflict (business_key, user_id) do update
set role = excluded.role,
    is_active = true,
    is_hidden = true,
    display_name = excluded.display_name;

insert into public.aspire_loyalty_settings (
  business_key, earning_mode, points_per_dollar, points_per_job, enrollment_points
)
values ('aspire-mobile-detailing', 'manual', 1, 1, 50);

insert into public.aspire_rewards (business_key, name, description, points_cost, sort_order)
values
  ('aspire-mobile-detailing', 'Cleaning, trim or merchandise reward', 'Cleaning, trim or select merchandise rewards.', 25, 10),
  ('aspire-mobile-detailing', 'Leather, engine bay or apparel reward', 'Leather care, engine bay service or select apparel.', 50, 20),
  ('aspire-mobile-detailing', 'Free Standard Cleaning', 'Redeem for one Standard Cleaning.', 100, 30),
  ('aspire-mobile-detailing', 'Free Deep Shampoo', 'Redeem for one Deep Shampoo service.', 200, 40);

insert into public.aspire_catalog_items (
  business_key, section, slug, level_label, name, summary,
  primary_price, primary_price_label, secondary_price, secondary_price_label,
  is_starting_at, is_quote_only, is_featured, is_active, sort_order, features
)
values
  ('aspire-mobile-detailing', 'package', 'exterior-wash', null, 'Exterior Wash', 'A crisp maintenance wash with polish and protection.', 34.95, 'Cars / mid-size', 39.95, 'Large SUV / truck / van', true, false, false, true, 10, array['Wash & dry', 'Quick polish / sealer', 'Windows & door jambs', 'Wheels & tire dressing']),
  ('aspire-mobile-detailing', 'package', 'exterior-detail', null, 'Exterior Detail', 'Decontamination and shine for tired exterior surfaces.', 74.95, 'Cars / mid-size', 79.95, 'Large SUV / truck / van', true, false, false, true, 20, array['Foam bath', 'Clay bar', 'Bug & tar removal', 'Quick polish / sealer']),
  ('aspire-mobile-detailing', 'package', 'interior-clean', null, 'Interior Clean', 'A practical interior reset for your daily driver.', 99.95, 'Cars / mid-size', 109.95, 'Large SUV / truck / van', true, false, false, true, 30, array['Full vacuum', 'Hard-surface wipe-down', 'Leather, plastic & trim', 'Windows & door jambs']),
  ('aspire-mobile-detailing', 'package', 'standard-detail', null, 'Standard Detail', 'Our streamlined inside-and-out maintenance package.', 119.95, 'Cars / mid-size', 129.95, 'Large SUV / truck / van', true, false, false, true, 40, array['Interior cleaning', 'Exterior cleaning', 'Windows inside & out', 'Wheels & tires']),
  ('aspire-mobile-detailing', 'package', 'interior-detail', null, 'Interior Detail', 'A deeper clean focused on stains, surfaces and comfort.', 149.95, 'Cars / mid-size', 159.95, 'Large SUV / truck / van', true, false, false, true, 50, array['Full vacuum', 'Surface stain removal', 'Scrub & clean all trim', 'Leather & surface conditioning']),
  ('aspire-mobile-detailing', 'package', 'full-detail', null, 'Full Detail', 'The complete interior and exterior transformation.', 269.95, 'Cars / mid-size', 289.95, 'Large SUV / truck / van', true, false, true, true, 60, array['Interior Detail package', 'Exterior Detail package', 'Clay-bar decontamination', 'Conditioning & protection']),
  ('aspire-mobile-detailing', 'addon', 'headlight-renewal', null, 'Headlight renewal', '', 49.95, null, null, null, false, false, false, true, 10, '{}'),
  ('aspire-mobile-detailing', 'addon', 'steam-cleaning', null, 'Steam cleaning', '', 59.95, null, null, null, true, false, false, true, 20, '{}'),
  ('aspire-mobile-detailing', 'addon', 'engine-bay', null, 'Engine bay', '', 64.95, null, null, null, false, false, false, true, 30, '{}'),
  ('aspire-mobile-detailing', 'addon', 'deep-shampoo', null, 'Deep shampoo', '', 89.95, null, null, null, true, false, false, true, 40, '{}'),
  ('aspire-mobile-detailing', 'specialty', 'ceramic-graphene-coating', '01', 'Ceramic & graphene coating', 'Professional preparation and application with an in-person consultation.', 849.95, null, null, null, true, false, false, true, 10, '{}'),
  ('aspire-mobile-detailing', 'specialty', 'exterior-reconditioning', '02', 'Exterior re-conditioning', 'Buff and polish to improve gloss and address visible paint defects. Test spots recommended.', 299.95, null, null, null, true, false, false, true, 20, '{}'),
  ('aspire-mobile-detailing', 'specialty', 'specialty-vehicles', '03', 'Boats, RVs & specialty vehicles', 'Mobile detailing for boats, side-by-sides, motor homes, campers and RVs.', null, null, null, null, false, true, false, true, 30, '{}'),
  ('aspire-mobile-detailing', 'course', 'level-1-basic-core', 'LEVEL 1', 'Basic Core Auto Detailing', 'Interior, exterior, reconditioning, stains, odors and extraction.', 500, null, null, null, false, false, false, true, 10, '{}'),
  ('aspire-mobile-detailing', 'course', 'level-2-intermediate', 'LEVEL 2', 'Intermediate', 'Paint correction, sanding, leveling and scratch-removal technique.', 600, null, null, null, false, false, false, true, 20, '{}'),
  ('aspire-mobile-detailing', 'course', 'level-3-advanced', 'LEVEL 3', 'Advanced', 'Ceramic and graphene coatings, SOPs and business essentials.', 700, null, null, null, false, false, false, true, 30, '{}'),
  ('aspire-mobile-detailing', 'course', 'master-all-levels', 'MASTER', 'All three levels', 'A complete progression from fundamentals through advanced coatings.', 1500, null, null, null, false, false, false, true, 40, '{}');

create index aspire_activity_log_actor_idx on public.aspire_activity_log(actor_user_id) where actor_user_id is not null;
create index aspire_appointments_assigned_user_idx on public.aspire_appointments(assigned_user_id) where assigned_user_id is not null;
create index aspire_appointments_catalog_item_idx on public.aspire_appointments(catalog_item_id) where catalog_item_id is not null;
create index aspire_appointments_created_by_idx on public.aspire_appointments(created_by) where created_by is not null;
create index aspire_appointments_inquiry_idx on public.aspire_appointments(inquiry_id) where inquiry_id is not null;
create index aspire_appointments_updated_by_idx on public.aspire_appointments(updated_by) where updated_by is not null;
create index aspire_assessments_appointment_idx on public.aspire_assessment_requests(appointment_id) where appointment_id is not null;
create index aspire_assessments_customer_idx on public.aspire_assessment_requests(customer_id) where customer_id is not null;
create index aspire_assessments_handled_by_idx on public.aspire_assessment_requests(handled_by) where handled_by is not null;
create index aspire_catalog_created_by_idx on public.aspire_catalog_items(created_by) where created_by is not null;
create index aspire_catalog_updated_by_idx on public.aspire_catalog_items(updated_by) where updated_by is not null;
create index aspire_customers_created_by_idx on public.aspire_customers(created_by) where created_by is not null;
create index aspire_customers_updated_by_idx on public.aspire_customers(updated_by) where updated_by is not null;
create index aspire_loyalty_updated_by_idx on public.aspire_loyalty_settings(updated_by) where updated_by is not null;
create index aspire_points_appointment_idx on public.aspire_points_transactions(appointment_id) where appointment_id is not null;
create index aspire_points_created_by_idx on public.aspire_points_transactions(created_by) where created_by is not null;
create index aspire_points_customer_fk_idx on public.aspire_points_transactions(customer_id);
create index aspire_rewards_created_by_idx on public.aspire_rewards(created_by) where created_by is not null;
create index aspire_rewards_updated_by_idx on public.aspire_rewards(updated_by) where updated_by is not null;

commit;
