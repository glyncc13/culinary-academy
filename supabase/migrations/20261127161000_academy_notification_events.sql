-- Future changes only: no backfill, no sender.
create function public.academy_queue_review_notice() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if old.status='pending' and new.status in ('competent','revise') and new.reviewed_at is not null then
 insert into public.academy_notification_outbox(user_id,kind,event_key)
 values(new.user_id,'practical_reviewed',new.id::text) on conflict do nothing;
 end if;
 return new;
end;
$$;
create trigger academy_queue_review_notice after update of status on public.academy_practical_submissions for each row execute function public.academy_queue_review_notice();
create function public.academy_queue_certificate_notice() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.academy_notification_outbox(user_id,kind,event_key)
 values(new.user_id,'certificate_issued',new.id::text) on conflict do nothing;
 return new;
end;
$$;
create trigger academy_queue_certificate_notice after insert on public.academy_certificates for each row execute function public.academy_queue_certificate_notice();
revoke execute on function public.academy_queue_review_notice(),public.academy_queue_certificate_notice() from public,anon,authenticated;
grant execute on function public.academy_queue_review_notice(),public.academy_queue_certificate_notice() to service_role;
