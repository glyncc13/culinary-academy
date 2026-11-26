grant select on public.lessons,public.academy_catalogue,public.academy_progress to authenticated;
grant insert on public.academy_progress to authenticated;
create policy catalogue_paid on public.academy_catalogue for select to authenticated using (public.has_paid_access((select auth.uid())));
create policy lessons_paid on public.lessons for select to authenticated using (status='published' and public.has_paid_access((select auth.uid())) and exists(select 1 from public.academy_catalogue c where c.lesson_id=lessons.id));
create policy progress_own on public.academy_progress for select to authenticated using (user_id=(select auth.uid()) and public.has_paid_access((select auth.uid())));
create policy progress_insert on public.academy_progress for insert to authenticated with check (user_id=(select auth.uid()) and public.has_paid_access((select auth.uid())) and exists(select 1 from public.lessons l where l.id=lesson_id));
alter function public.academy_library() security invoker;
alter function public.academy_complete(uuid) security invoker;;
