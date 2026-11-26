create table public.academy_admins(user_id uuid primary key references auth.users(id), created_at timestamptz not null default now());
create table public.academy_admin_audit(id uuid primary key default gen_random_uuid(), actor uuid not null references auth.users(id), action text not null, target text not null, created_at timestamptz not null default now());
alter table public.academy_admins enable row level security;
alter table public.academy_admin_audit enable row level security;
revoke all on public.academy_admins,public.academy_admin_audit from public,anon,authenticated;
grant select on public.academy_admins to service_role;
grant select,insert on public.academy_admin_audit to service_role;
