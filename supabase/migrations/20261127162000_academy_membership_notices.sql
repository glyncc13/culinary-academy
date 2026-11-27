-- Staged only: future subscription changes; no sender or backfill.
create function public.academy_queue_membership_notice() returns trigger
language plpgsql security invoker set search_path='' as $$
declare was_active boolean:=false; was_cancelled boolean:=false;
begin
 if tg_op='UPDATE' then
  was_active:=coalesce(old.status in ('active','trialing') and old.current_period_end>now(),false);
  was_cancelled:=old.cancel_at_period_end or old.status='canceled';
 end if;
 if not was_active and new.status in ('active','trialing') and new.current_period_end>now() then
  insert into public.academy_notification_outbox(user_id,kind,event_key)
  values(new.user_id,'membership_active',new.stripe_subscription_id) on conflict do nothing;
 end if;
 if not was_cancelled and (new.cancel_at_period_end or new.status='canceled')
 and (was_active or (new.status in ('active','trialing') and new.current_period_end>now())) then
  insert into public.academy_notification_outbox(user_id,kind,event_key)
  values(new.user_id,'membership_cancelled',new.stripe_subscription_id) on conflict do nothing;
 end if;
 return new;
end;
$$;
create trigger academy_queue_membership_notice after insert or update on public.subscriptions
for each row execute function public.academy_queue_membership_notice();
revoke execute on function public.academy_queue_membership_notice() from public,anon,authenticated;
grant execute on function public.academy_queue_membership_notice() to service_role;
