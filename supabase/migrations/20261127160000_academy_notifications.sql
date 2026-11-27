-- Additive, staged only. No historical backfill or delivery.
create table public.academy_notification_outbox (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('membership_active','membership_cancelled','payment_failed','practical_reviewed','certificate_issued')),
 event_key text not null check(char_length(event_key) between 1 and 200),
 created_at timestamptz not null default now(),
 available_at timestamptz not null default now(),
 attempts integer not null default 0 check(attempts between 0 and 5),
 lease_token uuid,
 lease_until timestamptz,
 state text not null default 'pending' check(state in ('pending','sent','failed','suppressed')),
 unique(user_id,kind,event_key),
 check((lease_token is null)=(lease_until is null))
);
alter table public.academy_notification_outbox enable row level security;
revoke all on public.academy_notification_outbox from public,anon,authenticated;
grant select,insert,update on public.academy_notification_outbox to service_role;
create index academy_notification_ready on public.academy_notification_outbox(available_at) where state='pending';
create function public.academy_claim_notifications(p_token uuid,p_limit integer)
returns setof public.academy_notification_outbox language plpgsql security invoker set search_path='' as $$
begin
 if p_token is null or p_limit is null or p_limit not between 1 and 20 then raise exception 'invalid claim'; end if;
 update public.academy_notification_outbox set state='failed',lease_token=null,lease_until=null
 where state='pending' and attempts>=5 and lease_until<=now();
 return query with picked as (
 select id from public.academy_notification_outbox where state='pending' and attempts<5 and available_at<=now()
 and (lease_until is null or lease_until<=now()) order by available_at,id limit p_limit for update skip locked
 ) update public.academy_notification_outbox o set lease_token=p_token,lease_until=now()+interval '5 minutes',attempts=o.attempts+1
 from picked where o.id=picked.id returning o.*;
end;
$$;
create function public.academy_finish_notification(p_id uuid,p_token uuid,p_outcome text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_outcome is null or p_outcome not in ('sent','retry','suppressed') then raise exception 'invalid outcome'; end if;
 update public.academy_notification_outbox set
 state=case when p_outcome='retry' then case when attempts>=5 then 'failed' else 'pending' end else p_outcome end,
 available_at=now()+interval '5 minutes'*attempts,lease_token=null,lease_until=null
 where id=p_id and state='pending' and lease_token=p_token and lease_until>now();
 return found;
end;
$$;
revoke execute on function public.academy_claim_notifications(uuid,integer),public.academy_finish_notification(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.academy_claim_notifications(uuid,integer),public.academy_finish_notification(uuid,uuid,text) to service_role;
