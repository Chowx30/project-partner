-- Start from no client table privileges, then grant only the operations and
-- columns required by the V1 application.
revoke all privileges on table public.profiles from anon, authenticated;
revoke all privileges on table public.student_verifications from anon, authenticated;
revoke all privileges on table public.courses from anon, authenticated;
revoke all privileges on table public.user_courses from anon, authenticated;
revoke all privileges on table public.skills from anon, authenticated;
revoke all privileges on table public.user_skills from anon, authenticated;
revoke all privileges on table public.projects from anon, authenticated;
revoke all privileges on table public.applications from anon, authenticated;
revoke all privileges on table public.project_members from anon, authenticated;
revoke all privileges on table public.comments from anon, authenticated;
revoke all privileges on table public.notifications from anon, authenticated;
revoke all privileges on table public.reports from anon, authenticated;

grant select on table public.profiles to authenticated;
grant insert (id, full_name, department, bio, avatar_path, graduation_year)
  on table public.profiles to authenticated;
grant update (full_name, department, bio, avatar_path, graduation_year)
  on table public.profiles to authenticated;

grant select on table public.student_verifications to authenticated;
grant insert (user_id, student_id)
  on table public.student_verifications to authenticated;
grant update (student_id)
  on table public.student_verifications to authenticated;

grant select on table public.courses to authenticated;

grant select on table public.user_courses to authenticated;
grant insert on table public.user_courses to authenticated;
grant delete on table public.user_courses to authenticated;

grant select on table public.skills to authenticated;

grant select on table public.user_skills to authenticated;
grant insert on table public.user_skills to authenticated;
grant delete on table public.user_skills to authenticated;

grant select on table public.projects to authenticated;
grant insert (owner_id, course_id, title, short_description, members_needed)
  on table public.projects to authenticated;
grant update (course_id, title, short_description, members_needed, status)
  on table public.projects to authenticated;
grant delete on table public.projects to authenticated;

grant select on table public.applications to authenticated;
grant insert (project_id, applicant_id, message)
  on table public.applications to authenticated;
grant update (status)
  on table public.applications to authenticated;

grant select on table public.project_members to authenticated;

grant select on table public.comments to authenticated;
grant insert (project_id, user_id, content)
  on table public.comments to authenticated;
grant update (content)
  on table public.comments to authenticated;
grant delete on table public.comments to authenticated;

grant select on table public.notifications to authenticated;
grant update (read_at)
  on table public.notifications to authenticated;

grant select on table public.reports to authenticated;
grant insert (
  reporter_id,
  target_user_id,
  target_project_id,
  target_comment_id,
  reason,
  details
) on table public.reports to authenticated;

-- Every policy below fails closed unless the request has a user ID, a
-- northsouth.edu email claim, and an explicit non-anonymous JWT claim.

create policy "Eligible NSU students can view profiles"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
);

create policy "Eligible NSU students can create their profile"
on public.profiles
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and id = (select auth.uid())
);

create policy "Eligible NSU students can update their profile"
on public.profiles
for update
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and id = (select auth.uid())
)
with check (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and id = (select auth.uid())
);

create policy "Eligible NSU students can view their verification"
on public.student_verifications
for select
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
);

create policy "Eligible NSU students can create their verification"
on public.student_verifications
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
  and verified_at is null
);

create policy "Eligible NSU students can update unverified student IDs"
on public.student_verifications
for update
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
  and verified_at is null
)
with check (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
  and verified_at is null
);

create policy "Eligible NSU students can view courses"
on public.courses
for select
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
);

create policy "Eligible NSU students can view user courses"
on public.user_courses
for select
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
);

create policy "Eligible NSU students can add their courses"
on public.user_courses
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
);

create policy "Eligible NSU students can remove their courses"
on public.user_courses
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
);

create policy "Eligible NSU students can view skills"
on public.skills
for select
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
);

create policy "Eligible NSU students can view user skills"
on public.user_skills
for select
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
);

create policy "Eligible NSU students can add their skills"
on public.user_skills
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
);

create policy "Eligible NSU students can remove their skills"
on public.user_skills
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
);

create policy "Eligible NSU students can view projects"
on public.projects
for select
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
);

create policy "Eligible NSU students can create projects"
on public.projects
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and owner_id = (select auth.uid())
  and status = 'open'
);

create policy "Eligible NSU students can update their projects"
on public.projects
for update
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and owner_id = (select auth.uid())
)
with check (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and owner_id = (select auth.uid())
);

create policy "Eligible NSU students can delete their projects"
on public.projects
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and owner_id = (select auth.uid())
);

create policy "Eligible NSU students can view related applications"
on public.applications
for select
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and (
    applicant_id = (select auth.uid())
    or exists (
      select 1
      from public.projects
      where projects.id = applications.project_id
        and projects.owner_id = (select auth.uid())
    )
  )
);

create policy "Eligible NSU students can apply to open projects"
on public.applications
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and applicant_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1
    from public.projects
    where projects.id = applications.project_id
      and projects.status = 'open'
      and projects.owner_id <> (select auth.uid())
  )
  and not exists (
    select 1
    from public.project_members
    where project_members.project_id = applications.project_id
      and project_members.user_id = (select auth.uid())
  )
);

create policy "Eligible NSU students can withdraw pending applications"
on public.applications
for update
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and applicant_id = (select auth.uid())
  and status = 'pending'
)
with check (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and applicant_id = (select auth.uid())
  and status = 'withdrawn'
);

create policy "Eligible NSU students can view project members"
on public.project_members
for select
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
);

create policy "Eligible NSU students can view comments"
on public.comments
for select
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
);

create policy "Eligible NSU students can create comments"
on public.comments
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
);

create policy "Eligible NSU students can update their comments"
on public.comments
for update
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
)
with check (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
);

create policy "Eligible NSU students can delete their comments"
on public.comments
for delete
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
);

create policy "Eligible NSU students can view their notifications"
on public.notifications
for select
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
);

create policy "Eligible NSU students can update notification read state"
on public.notifications
for update
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
)
with check (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and user_id = (select auth.uid())
);

create policy "Eligible NSU students can view their reports"
on public.reports
for select
to authenticated
using (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and reporter_id = (select auth.uid())
);

create policy "Eligible NSU students can create reports"
on public.reports
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and right(
    lower(coalesce((select auth.jwt()) ->> 'email', '')),
    char_length('@northsouth.edu')
  ) = '@northsouth.edu'
  and coalesce(
    ((select auth.jwt()) ->> 'is_anonymous')::boolean,
    true
  ) is false
  and reporter_id = (select auth.uid())
  and status = 'pending'
);
