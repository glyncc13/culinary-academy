-- Culinary Academy billing migration. Run ONCE after reviewing in Supabase SQL Editor.
-- Does not change existing organisations, memberships or learning records.
create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);
create table if not exists public.subscription_plans (
  code text primary key,
  title text not null,
  stripe_price_id text unique,
  currency text not null default 'gbp',
  amount_minor integer not null check (amount_minor >= 0),
  interval_unit text not null check (interval_unit in ('month','year')),
  enabled boolean not null default false
);
insert into public.subscription_plans(code,title,currency,amount_minor,interval_unit,enabled)
values ('monthly','Culinary Academy Monthly','gbp',1499,'month',false)
on conflict (code) do nothing;
create table if not exists public.subscriptions (
  stripe_subscription_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_price_id text,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
alter table public.billing_customers enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_webhook_events enable row level security;
-- Only user-owned billing rows can be read. Writes happen via server service role.
drop policy if exists "Customers read own billing customer" on public.billing_customers;
create policy "Customers read own billing customer" on public.billing_customers
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Customers read own subscriptions" on public.subscriptions;
create policy "Customers read own subscriptions" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Anyone reads enabled plans" on public.subscription_plans;
create policy "Anyone reads enabled plans" on public.subscription_plans
  for select to anon,authenticated using (enabled = true);
revoke all on public.billing_customers, public.subscriptions, public.subscription_plans, public.stripe_webhook_events from anon, authenticated;
grant select on public.billing_customers, public.subscriptions to authenticated;
grant select on public.subscription_plans to anon, authenticated;
-- No client access to webhook events.
-- Subscription entitlements: server-side RLS policy for future paid content tables.
create or replace function public.has_paid_access(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user = (select auth.uid()) and exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user and
      (s.status = 'active' or s.status = 'trialing') and
      (s.current_period_end is null or s.current_period_end > now())
  );
$$;
revoke all on function public.has_paid_access(uuid) from public, anon;
grant execute on function public.has_paid_access(uuid) to authenticated;
-- Example future lesson policy: USING (is_free = true OR public.has_paid_access(auth.uid()))
-- DO NOT claim existing lessons are paywalled: legacy lessons RLS must be migrated separately.

grant usage on schema public to service_role,authenticated,anon; grant select,insert on public.billing_customers to service_role; grant select,insert,update on public.subscriptions to service_role; grant select,insert on public.stripe_webhook_events to service_role; create or replace function public.has_paid_access(p_user uuid) returns boolean language sql stable security invoker set search_path='' as $$ select coalesce(p_user=auth.uid() and exists(select 1 from public.subscriptions s where s.user_id=p_user and s.status in ('active','trialing') and s.current_period_end>now()),false); $$;;
