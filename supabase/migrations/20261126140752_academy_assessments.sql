create table public.academy_questions (id uuid primary key default gen_random_uuid(), level smallint not null references public.academy_pathways(level), prompt text not null, options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options)=3), correct_index smallint not null check(correct_index between 0 and 2), position int not null, unique(level,position));
create table public.academy_attempts (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), level smallint not null references public.academy_pathways(level), score integer not null check(score between 0 and 100), passed boolean generated always as (score>=80) stored, submitted_at timestamptz not null default now());
alter table public.academy_questions enable row level security;
alter table public.academy_attempts enable row level security;
revoke all on public.academy_questions,public.academy_attempts from public,anon,authenticated;
grant select on public.academy_attempts to authenticated;
grant select on public.academy_questions to service_role;
grant select,insert on public.academy_attempts to service_role;
create policy own_attempts on public.academy_attempts for select to authenticated using ((select auth.uid())=user_id);
create index academy_attempts_user_level on public.academy_attempts(user_id,level);
insert into public.academy_questions(level,prompt,options,correct_index,position) values (1,'How should raw and ready-to-eat food be prepared?','["With separate clean equipment","On the same unwashed board","Without handwashing"]'::jsonb,0,1),
(1,'What does mise en place involve?','["Closing the kitchen","Preparing before service","Setting prices"]'::jsonb,1,2),
(1,'Why cut vegetables evenly?','["To increase waste","To avoid washing","To promote even cooking"]'::jsonb,2,3),
(1,'How should a cooking temperature be checked?','["With a clean calibrated probe","By colour alone","By guesswork"]'::jsonb,0,4),
(1,'What helps prevent knife injuries?','["A moving board","A stable board and claw grip","Holding food loosely"]'::jsonb,1,5),
(2,'How should a stock normally be cooked?','["At a violent boil throughout","With no liquid","At a gentle simmer"]'::jsonb,2,1),
(2,'What is essential when preparing raw protein?','["Separate clean equipment","Sharing unwashed utensils","Leaving it at room temperature"]'::jsonb,0,2),
(2,'Why rest shortcrust pastry?','["To increase gluten by kneading","To relax dough and control handling","To remove allergens"]'::jsonb,1,3),
(2,'What if allergen safety cannot be assured?','["Guess","Remove visible ingredients","Communicate the uncertainty and do not promise safety"]'::jsonb,2,4),
(2,'Which methods can be compared for vegetable texture?','["Steaming and roasting","Freezing only","No cooking methods"]'::jsonb,0,5),
(3,'What should a controlled cooking trial document?','["Only plate colour","Texture, timing and consistency","Only the chef name"]'::jsonb,1,1),
(3,'What must menu development consider?','["Only decoration","Only ingredient price","Customer needs and kitchen capacity"]'::jsonb,2,2),
(3,'How is ingredient cost per portion calculated?','["Total recipe cost divided by saleable portions","Total cost multiplied by portions","Ignoring trim losses"]'::jsonb,0,3),
(3,'What belongs in a pre-service briefing?','["Only music choices","Bookings, allergens and responsibilities","Nothing until service"]'::jsonb,1,4),
(3,'What should follow a service debrief?','["No records","Blame without evidence","Agreed measurable improvements"]'::jsonb,2,5);
