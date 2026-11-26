\set ON_ERROR_STOP on
begin;
insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into public.subscriptions(stripe_subscription_id,user_id,stripe_customer_id,status,current_period_end) values ('ci-sub','11111111-1111-4111-8111-111111111111','ci-customer','active',now()+interval '1 day');
do $$ begin
if has_table_privilege('authenticated','public.academy_assessment_runs','select') or has_table_privilege('anon','public.academy_privacy_requests','select') or has_function_privilege('authenticated','public.academy_grade_run(uuid,uuid,jsonb)','execute') then raise exception 'privilege leak'; end if;
end $$;
set local role service_role;
insert into public.academy_assessment_runs(id,user_id,level,snapshot) values ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',1,'[{"id":"q1","correct_index":1},{"id":"q2","correct_index":0},{"id":"q3","correct_index":2},{"id":"q4","correct_index":1},{"id":"q5","correct_index":0}]');
do $$ declare s integer; begin
begin perform public.academy_grade_run('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','{}'); raise exception 'cross-user grading succeeded'; exception when no_data_found then null; end;
s:=public.academy_grade_run('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','{"q1":1,"q2":0,"q3":2,"q4":1,"q5":1}');
if s<>80 then raise exception 'expected 80, got %',s; end if;
if not exists(select 1 from public.academy_attempts where run_id='33333333-3333-4333-8333-333333333333' and passed) then raise exception 'missing passed attempt'; end if;
begin perform public.academy_grade_run('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','{}'); raise exception 'replay succeeded'; exception when no_data_found then null; end;
end $$;
insert into public.academy_privacy_requests(user_id,kind) values ('11111111-1111-4111-8111-111111111111','access');
reset role;
rollback;
