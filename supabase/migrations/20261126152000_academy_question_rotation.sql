grant delete on public.academy_questions to service_role;
create function public.academy_rotate_questions(p_actor uuid,p_questions jsonb) returns integer language plpgsql security invoker set search_path='' as $rotate$
declare n integer; rid uuid:=gen_random_uuid();
begin
if not exists(select 1 from public.academy_admins where user_id=p_actor) then raise exception 'admin required'; end if;
if jsonb_typeof(p_questions) is distinct from 'array' then raise exception 'invalid bank'; end if;
n:=jsonb_array_length(p_questions);
if n<15 or n>300 then raise exception 'invalid bank size'; end if;
if exists(select 1 from generate_series(1,3) l where (select count(*) from jsonb_array_elements(p_questions) q where (q->>'level')::integer=l)<5) then raise exception 'insufficient level coverage'; end if;
lock table public.academy_questions in share row exclusive mode;
lock table public.academy_assessment_runs in share row exclusive mode;
insert into public.academy_admin_audit(actor,action,target,request_id,outcome) values(p_actor,'rotateQuestions','all levels',rid,'attempted');
update public.academy_assessment_runs set used_at=now() where used_at is null;
delete from public.academy_questions;
insert into public.academy_questions(level,prompt,options,correct_index,position)
select (q->>'level')::smallint,q->>'prompt',q->'options',(q->>'correct_index')::smallint,row_number() over(partition by q->>'level' order by ord)::integer from jsonb_array_elements(p_questions) with ordinality as t(q,ord);
insert into public.academy_admin_audit(actor,action,target,request_id,outcome) values(p_actor,'rotateQuestions','all levels',rid,'succeeded');
return n;
end $rotate$;
revoke all on function public.academy_rotate_questions(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.academy_rotate_questions(uuid,jsonb) to service_role;
