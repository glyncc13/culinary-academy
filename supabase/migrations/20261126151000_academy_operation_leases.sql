create table public.academy_operation_leases(scope text primary key, token uuid not null, expires_at timestamptz not null);
alter table public.academy_operation_leases enable row level security;
revoke all on public.academy_operation_leases from public,anon,authenticated;
grant select,insert,update,delete on public.academy_operation_leases to service_role;
create function public.academy_acquire_lease(p_scope text,p_token uuid) returns boolean language plpgsql security invoker set search_path='' as $lease$
begin
insert into public.academy_operation_leases(scope,token,expires_at) values(p_scope,p_token,clock_timestamp()+interval '5 minutes')
on conflict(scope) do update set token=excluded.token,expires_at=excluded.expires_at where academy_operation_leases.expires_at<clock_timestamp();
return found;
end $lease$;
create function public.academy_release_lease(p_scope text,p_token uuid) returns void language sql security invoker set search_path='' as $lease$
delete from public.academy_operation_leases where scope=p_scope and token=p_token;
$lease$;
revoke all on function public.academy_acquire_lease(text,uuid),public.academy_release_lease(text,uuid) from public,anon,authenticated;
grant execute on function public.academy_acquire_lease(text,uuid),public.academy_release_lease(text,uuid) to service_role;
alter table public.academy_admin_audit add column request_id uuid, add column outcome text not null default 'attempted' check(outcome in ('attempted','succeeded','failed'));
revoke update,delete on public.academy_admin_audit from service_role;
