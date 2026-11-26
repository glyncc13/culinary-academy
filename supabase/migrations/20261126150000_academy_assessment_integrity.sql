create function public.academy_start_run(p_user uuid,p_level smallint) returns jsonb language plpgsql security invoker set search_path='' as $ci$
declare snapshot jsonb; rid uuid;
begin
perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
if not exists(select 1 from public.subscriptions where user_id=p_user and status in ('active','trialing') and current_period_end>now()) then return null; end if;
if (select count(*) from public.academy_assessment_runs where user_id=p_user and created_at>now()-interval '1 hour')>=30 then return null; end if;
select jsonb_agg(jsonb_build_object('id',id,'prompt',prompt,'options',options,'correct_index',correct_index) order by random()) into snapshot from public.academy_questions where level=p_level;
if snapshot is null then return null; end if;
insert into public.academy_assessment_runs(user_id,level,snapshot) values(p_user,p_level,snapshot) returning id into rid;
return jsonb_build_object('id',rid,'questions',snapshot);
end $ci$;
revoke all on function public.academy_start_run(uuid,smallint) from public,anon,authenticated;
grant execute on function public.academy_start_run(uuid,smallint) to service_role;
create index academy_runs_user_created_idx on public.academy_assessment_runs(user_id,created_at);
