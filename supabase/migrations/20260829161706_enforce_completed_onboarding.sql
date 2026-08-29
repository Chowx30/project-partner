create function public.has_completed_onboarding()
returns pg_catalog.bool
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = (select auth.uid())
    )
    and exists (
      select 1
      from public.student_verifications as verification
      where verification.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.user_courses as user_course
      where user_course.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.user_skills as user_skill
      where user_skill.user_id = (select auth.uid())
    );
$$;

comment on function public.has_completed_onboarding() is
  'Returns whether the authenticated user has completed all onboarding components.';

revoke execute on function public.has_completed_onboarding() from public;
revoke execute on function public.has_completed_onboarding() from anon;
grant execute on function public.has_completed_onboarding() to authenticated;

alter policy "Eligible NSU students can create projects"
on public.projects
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
  and (select public.has_completed_onboarding())
);

alter policy "Eligible NSU students can update their projects"
on public.projects
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
  and (select public.has_completed_onboarding())
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
  and (select public.has_completed_onboarding())
);

alter policy "Eligible NSU students can update their comments"
on public.comments
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
  and (select public.has_completed_onboarding())
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
  and (select public.has_completed_onboarding())
);

alter policy "Eligible NSU students can create reports"
on public.reports
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
  and (select public.has_completed_onboarding())
);

create or replace function public.accept_project_application(
  p_application_id pg_catalog.uuid
)
returns pg_catalog.jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id pg_catalog.uuid;
  v_email pg_catalog.text;
  v_project_id pg_catalog.uuid;
  v_project_owner_id pg_catalog.uuid;
  v_project_status pg_catalog.text;
  v_members_needed pg_catalog.int2;
  v_applicant_id pg_catalog.uuid;
  v_application_status pg_catalog.text;
  v_member_count pg_catalog.int8;
  v_new_member_count pg_catalog.int8;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  v_email := pg_catalog.lower(
    coalesce(auth.jwt() ->> 'email', '')
  );

  if pg_catalog.right(
    v_email,
    pg_catalog.char_length('@northsouth.edu')
  ) <> '@northsouth.edu'
  or coalesce(
    (auth.jwt() ->> 'is_anonymous') <> 'false',
    true
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'ineligible_account';
  end if;

  if not public.has_completed_onboarding() then
    raise exception using
      errcode = 'P0001',
      message = 'onboarding_required';
  end if;

  select application.project_id
  into v_project_id
  from public.applications as application
  where application.id = p_application_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'application_not_found';
  end if;

  select
    project.owner_id,
    project.status,
    project.members_needed
  into
    v_project_owner_id,
    v_project_status,
    v_members_needed
  from public.projects as project
  where project.id = v_project_id
    and project.owner_id = v_user_id
  for update of project;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'application_not_found';
  end if;

  select
    application.applicant_id,
    application.status
  into
    v_applicant_id,
    v_application_status
  from public.applications as application
  where application.id = p_application_id
    and application.project_id = v_project_id
  for update of application;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'application_not_found';
  end if;

  if v_application_status <> 'pending' then
    raise exception using
      errcode = 'P0001',
      message = 'application_not_pending';
  end if;

  if v_project_status <> 'open' then
    raise exception using
      errcode = 'P0001',
      message = 'project_not_open';
  end if;

  if v_applicant_id = v_project_owner_id then
    raise exception using
      errcode = 'P0001',
      message = 'application_not_found';
  end if;

  if exists (
    select 1
    from public.project_members as member
    where member.project_id = v_project_id
      and member.user_id = v_applicant_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'already_project_member';
  end if;

  select pg_catalog.count(*)
  into v_member_count
  from public.project_members as member
  where member.project_id = v_project_id
    and member.user_id <> v_project_owner_id;

  if v_member_count >= v_members_needed then
    raise exception using
      errcode = 'P0001',
      message = 'project_full';
  end if;

  update public.applications as application
  set status = 'accepted'
  where application.id = p_application_id
    and application.status = 'pending';

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'application_not_pending';
  end if;

  begin
    insert into public.project_members (
      project_id,
      user_id
    )
    values (
      v_project_id,
      v_applicant_id
    );
  exception
    when unique_violation then
      raise exception using
        errcode = 'P0001',
        message = 'already_project_member';
  end;

  insert into public.notifications (
    user_id,
    actor_id,
    project_id,
    application_id,
    type,
    title,
    message
  )
  values (
    v_applicant_id,
    v_user_id,
    v_project_id,
    p_application_id,
    'application_accepted',
    'Application accepted',
    'Your application was accepted.'
  );

  select pg_catalog.count(*)
  into v_new_member_count
  from public.project_members as member
  where member.project_id = v_project_id
    and member.user_id <> v_project_owner_id;

  if v_new_member_count >= v_members_needed then
    update public.projects as project
    set status = 'closed'
    where project.id = v_project_id
      and project.status = 'open';
  end if;

  return pg_catalog.jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'status', 'accepted'
  );
exception
  when others then
    if sqlstate = 'P0001'
    and sqlerrm in (
      'authentication_required',
      'ineligible_account',
      'onboarding_required',
      'application_not_found',
      'application_not_pending',
      'project_not_open',
      'already_project_member',
      'project_full'
    ) then
      raise;
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'application_acceptance_failed';
end;
$$;

create or replace function public.reject_project_application(
  p_application_id pg_catalog.uuid
)
returns pg_catalog.jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id pg_catalog.uuid;
  v_email pg_catalog.text;
  v_project_id pg_catalog.uuid;
  v_project_owner_id pg_catalog.uuid;
  v_applicant_id pg_catalog.uuid;
  v_application_status pg_catalog.text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  v_email := pg_catalog.lower(
    coalesce(auth.jwt() ->> 'email', '')
  );

  if pg_catalog.right(
    v_email,
    pg_catalog.char_length('@northsouth.edu')
  ) <> '@northsouth.edu'
  or coalesce(
    (auth.jwt() ->> 'is_anonymous') <> 'false',
    true
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'ineligible_account';
  end if;

  if not public.has_completed_onboarding() then
    raise exception using
      errcode = 'P0001',
      message = 'onboarding_required';
  end if;

  select application.project_id
  into v_project_id
  from public.applications as application
  where application.id = p_application_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'application_not_found';
  end if;

  select project.owner_id
  into v_project_owner_id
  from public.projects as project
  where project.id = v_project_id
    and project.owner_id = v_user_id
  for update of project;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'application_not_found';
  end if;

  select
    application.applicant_id,
    application.status
  into
    v_applicant_id,
    v_application_status
  from public.applications as application
  where application.id = p_application_id
    and application.project_id = v_project_id
  for update of application;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'application_not_found';
  end if;

  if v_application_status <> 'pending' then
    raise exception using
      errcode = 'P0001',
      message = 'application_not_pending';
  end if;

  update public.applications as application
  set status = 'rejected'
  where application.id = p_application_id
    and application.status = 'pending';

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'application_not_pending';
  end if;

  insert into public.notifications (
    user_id,
    actor_id,
    project_id,
    application_id,
    type,
    title,
    message
  )
  values (
    v_applicant_id,
    v_user_id,
    v_project_id,
    p_application_id,
    'application_rejected',
    'Application rejected',
    'Your application was not accepted.'
  );

  return pg_catalog.jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'status', 'rejected'
  );
exception
  when others then
    if sqlstate = 'P0001'
    and sqlerrm in (
      'authentication_required',
      'ineligible_account',
      'onboarding_required',
      'application_not_found',
      'application_not_pending'
    ) then
      raise;
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'application_rejection_failed';
end;
$$;

comment on function public.accept_project_application(
  pg_catalog.uuid
) is
  'Atomically accepts an application, adds the member, and notifies the applicant.';

comment on function public.reject_project_application(
  pg_catalog.uuid
) is
  'Atomically rejects an application and notifies the applicant.';

revoke execute on function public.accept_project_application(
  pg_catalog.uuid
) from public;

revoke execute on function public.accept_project_application(
  pg_catalog.uuid
) from anon;

grant execute on function public.accept_project_application(
  pg_catalog.uuid
) to authenticated;

revoke execute on function public.reject_project_application(
  pg_catalog.uuid
) from public;

revoke execute on function public.reject_project_application(
  pg_catalog.uuid
) from anon;

grant execute on function public.reject_project_application(
  pg_catalog.uuid
) to authenticated;
