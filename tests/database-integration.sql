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

-- Additional isolated fixtures and assertions.
insert into public.lessons(id,title,category,status) values
('44444444-4444-4444-8444-444444444444','CI published','Level 1','published'),
('55555555-5555-4555-8555-555555555555','CI draft','Level 1','draft'),
('66666666-6666-4666-8666-666666666666','CI unlisted','Level 1','published');
insert into public.academy_catalogue values ('44444444-4444-4444-8444-444444444444'),('55555555-5555-4555-8555-555555555555');
insert into public.academy_certificates(user_id,level,recipient_name) values ('11111111-1111-4111-8111-111111111111',1,'CI Student');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $ci$ begin
if not public.has_paid_access(auth.uid()) then raise exception 'paid entitlement missing'; end if;
if (select count(*) from public.lessons where title like 'CI %')<>1 then raise exception 'draft or unlisted lesson exposure'; end if;
perform public.academy_complete('44444444-4444-4444-8444-444444444444');
if not exists(select 1 from public.academy_progress where lesson_id='44444444-4444-4444-8444-444444444444') then raise exception 'progress not stored'; end if;
if (select count(*) from public.academy_certificates)<>1 then raise exception 'own certificate missing'; end if;
end $ci$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $ci$ begin
if public.has_paid_access(auth.uid()) or exists(select 1 from public.lessons) or exists(select 1 from public.academy_progress) or exists(select 1 from public.academy_certificates) then raise exception 'unpaid or cross-account data exposure'; end if;
end $ci$;
reset role;
update public.subscriptions set current_period_end=now()-interval '1 second' where stripe_subscription_id='ci-sub';
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $ci$ begin
if public.has_paid_access(auth.uid()) or exists(select 1 from public.lessons) then raise exception 'expired membership retains lesson access'; end if;
if (select count(*) from public.academy_certificates)<>1 then raise exception 'expired member lost existing certificate'; end if;
end $ci$;
reset role;
do $ci$ begin
if has_table_privilege('authenticated','public.academy_admins','insert') or has_table_privilege('authenticated','public.academy_questions','select') or has_table_privilege('authenticated','public.academy_attempts','insert') or has_table_privilege('authenticated','public.academy_privacy_requests','select') then raise exception 'privileged table grant exposed'; end if;
if not exists(select 1 from storage.buckets where id='academy-videos' and not public) then raise exception 'video bucket not private'; end if;
end $ci$;

insert into public.academy_admins(user_id) values ('11111111-1111-4111-8111-111111111111');
insert into public.academy_assessment_runs(user_id,level,snapshot) values ('11111111-1111-4111-8111-111111111111',1,'[]');
do $rotation$
declare bank jsonb; original jsonb; attempts_before bigint; certs_before bigint; unused_before bigint; n integer;
begin
select jsonb_agg(to_jsonb(q) order by id) into original from public.academy_questions q;
select count(*) into attempts_before from public.academy_attempts;
select count(*) into certs_before from public.academy_certificates;
select count(*) into unused_before from public.academy_assessment_runs where used_at is null;
select jsonb_agg(jsonb_build_object('level',l,'prompt','Synthetic fixture '||l||'-'||i,'options',jsonb_build_array('A','B','C'),'correct_index',0)) into bank from generate_series(1,3) l cross join generate_series(1,5) i;
begin
perform public.academy_rotate_questions('11111111-1111-4111-8111-111111111111',jsonb_set(bank,'{0,correct_index}','9'));
raise exception 'invalid rotation accepted';
exception when check_violation then null;
end;
if original is distinct from (select jsonb_agg(to_jsonb(q) order by id) from public.academy_questions q) or unused_before<>(select count(*) from public.academy_assessment_runs where used_at is null) then raise exception 'failed rotation altered data'; end if;
n:=public.academy_rotate_questions('11111111-1111-4111-8111-111111111111',bank);
if n<>15 or (select count(*) from public.academy_questions)<>15 or exists(select 1 from public.academy_questions where prompt not like 'Synthetic fixture %') then raise exception 'replacement incomplete'; end if;
if exists(select 1 from public.academy_assessment_runs where used_at is null) or attempts_before<>(select count(*) from public.academy_attempts) or certs_before<>(select count(*) from public.academy_certificates) then raise exception 'history preservation failed'; end if;
if not exists(select 1 from public.academy_admin_audit a join public.academy_admin_audit b using(request_id) where a.action='rotateQuestions' and a.outcome='attempted' and b.outcome='succeeded') then raise exception 'rotation audit missing'; end if;
if has_function_privilege('authenticated','public.academy_rotate_questions(uuid,jsonb)','execute') or has_function_privilege('anon','public.academy_acquire_lease(text,uuid)','execute') then raise exception 'privileged RPC exposed'; end if;
end $rotation$;

rollback;
