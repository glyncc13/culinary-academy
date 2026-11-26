create table public.academy_curriculum_drafts (
 lesson_id uuid primary key references public.lessons(id), content jsonb not null, imported_at timestamptz not null default now()
);
create table public.academy_practical_submissions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), lesson_id uuid not null references public.lessons(id),
 evidence text not null check(char_length(evidence) between 20 and 4000), status text not null default 'pending' check(status in ('pending','competent','revise')),
 created_at timestamptz not null default now(), reviewer uuid references auth.users(id), feedback text, reviewed_at timestamptz
);
create unique index academy_practical_pending on public.academy_practical_submissions(user_id,lesson_id) where status='pending';
alter table public.academy_curriculum_drafts enable row level security;
alter table public.academy_practical_submissions enable row level security;
revoke all on public.academy_curriculum_drafts,public.academy_practical_submissions from public,anon,authenticated;
grant select,insert,update on public.academy_curriculum_drafts,public.academy_practical_submissions to service_role;
create function public.academy_import_curriculum(p_actor uuid,p_rows jsonb,p_preview boolean) returns jsonb language plpgsql security invoker set search_path='' as $import$
declare r jsonb; lid uuid; n integer; result jsonb:='[]'; rid uuid:=gen_random_uuid();
begin
if not exists(select 1 from public.academy_admins where user_id=p_actor) then raise exception 'admin required'; end if;
if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)<>50 then raise exception 'invalid curriculum'; end if;
lock table public.lessons,public.academy_module_lessons in share row exclusive mode;
for r in select value from jsonb_array_elements(p_rows) loop
 if not exists(select 1 from public.academy_modules where slug=r->>'module' and level=(r->>'level')::integer) then raise exception 'invalid module'; end if;
 select count(*) into n from public.lessons where title=r->>'title';
 if n>1 then raise exception 'ambiguous title'; end if;
 select id into lid from public.lessons where title=r->>'title';
 if lid is not null and exists(select 1 from public.academy_module_lessons where lesson_id=lid and module_slug<>r->>'module') then raise exception 'module conflict'; end if;
 result:=result||jsonb_build_array(jsonb_build_object('title',r->>'title','lesson_id',lid,'action',case when lid is null then 'create draft' else 'preserve existing ID' end));
 if not p_preview then
 if lid is null then
 insert into public.lessons(title,category,description,steps,status) values(r->>'title','Level '||(r->>'level'),r->'objectives'->>0,'[]','draft') returning id into lid;
 end if;
 insert into public.academy_catalogue(lesson_id) values(lid) on conflict do nothing;
 if not exists(select 1 from public.academy_module_lessons where lesson_id=lid and module_slug=r->>'module') then
 insert into public.academy_module_lessons(module_slug,lesson_id,position) values(r->>'module',lid,coalesce((select max(position) from public.academy_module_lessons where module_slug=r->>'module'),0)+1);
 end if;
 insert into public.academy_curriculum_drafts(lesson_id,content) values(lid,r) on conflict(lesson_id) do update set content=excluded.content,imported_at=now();
 end if;
end loop;
if not p_preview then insert into public.academy_admin_audit(actor,action,target,request_id,outcome) values(p_actor,'importCurriculum','50 drafts',rid,'succeeded'); end if;
return result;
end $import$;
create function public.academy_submit_practical(p_user uuid,p_lesson uuid,p_evidence text) returns uuid language plpgsql security invoker set search_path='' as $submit$
declare rid uuid;
begin
if not exists(select 1 from public.subscriptions where user_id=p_user and status in ('active','trialing') and current_period_end>now()) or not exists(select 1 from public.lessons l join public.academy_catalogue c on c.lesson_id=l.id where l.id=p_lesson and l.status='published') then raise exception 'access denied'; end if;
insert into public.academy_practical_submissions(user_id,lesson_id,evidence) values(p_user,p_lesson,p_evidence) returning id into rid;
return rid;
end $submit$;
create function public.academy_review_practical(p_actor uuid,p_id uuid,p_status text,p_feedback text) returns boolean language plpgsql security invoker set search_path='' as $review$
begin
if not exists(select 1 from public.academy_admins where user_id=p_actor) or p_status not in ('competent','revise') or char_length(p_feedback) not between 1 and 4000 then raise exception 'invalid review'; end if;
update public.academy_practical_submissions set status=p_status,feedback=p_feedback,reviewer=p_actor,reviewed_at=now() where id=p_id and status='pending' and user_id<>p_actor;
if not found then raise exception 'review unavailable'; end if;
insert into public.academy_admin_audit(actor,action,target,request_id,outcome) values(p_actor,'reviewPractical',p_id::text,gen_random_uuid(),'succeeded');
return true;
end $review$;
revoke all on function public.academy_import_curriculum(uuid,jsonb,boolean),public.academy_submit_practical(uuid,uuid,text),public.academy_review_practical(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.academy_import_curriculum(uuid,jsonb,boolean),public.academy_submit_practical(uuid,uuid,text),public.academy_review_practical(uuid,uuid,text,text) to service_role;
