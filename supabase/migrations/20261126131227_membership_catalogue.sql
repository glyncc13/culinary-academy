
-- Explicit owner-curated catalogue; no automatic exposure of private organisation lessons.
create table if not exists public.academy_catalogue (
 lesson_id uuid primary key references public.lessons(id) on delete cascade
);
alter table public.academy_catalogue enable row level security;
revoke all on public.academy_catalogue from public, anon, authenticated;
create table if not exists public.academy_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id uuid not null references public.lessons(id) on delete cascade,
 completed_at timestamptz not null default now(),
 primary key(user_id,lesson_id)
);
alter table public.academy_progress enable row level security;
revoke all on public.academy_progress from public, anon, authenticated;
create or replace function public.academy_library()
returns jsonb language sql stable security definer set search_path='' as $$
 select case when auth.uid() is null or not coalesce(public.has_paid_access(auth.uid()),false)
 then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object(
 'id',l.id,'title',l.title,'category',l.category,'description',l.description,'steps',l.steps,
 'completed',exists(select 1 from public.academy_progress p where p.user_id=auth.uid() and p.lesson_id=l.id)) order by l.title)
 from public.lessons l join public.academy_catalogue c on c.lesson_id=l.id where l.status='published'),'[]'::jsonb) end;
$$;
create or replace function public.academy_complete(p_lesson uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not coalesce(public.has_paid_access(auth.uid()),false) then raise exception 'Active membership required'; end if;
 if not exists(select 1 from public.academy_catalogue c join public.lessons l on l.id=c.lesson_id where l.id=p_lesson and l.status='published') then raise exception 'Lesson unavailable'; end if;
 insert into public.academy_progress(user_id,lesson_id) values(auth.uid(),p_lesson) on conflict do nothing;
end;
$$;
revoke all on function public.academy_library(), public.academy_complete(uuid) from public,anon;
grant execute on function public.academy_library(), public.academy_complete(uuid) to authenticated;
;
