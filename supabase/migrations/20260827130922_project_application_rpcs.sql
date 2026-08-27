-- Application creation must go through the trusted transactional RPC below.
-- Revoke both table-level and the exact deployed column-level INSERT grants.
revoke insert on table public.applications from authenticated;
revoke insert (project_id, applicant_id, message)
  on table public.applications from authenticated;

drop policy "Eligible NSU students can apply to open projects"
  on public.applications;

create function public.submit_project_application(
  p_project_id pg_catalog.uuid,
  p_message pg_catalog.text default null
)
returns pg_catalog.jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id pg_catalog.uuid;
  v_email pg_catalog.text;
  v_message pg_catalog.text;
  v_project_owner_id pg_catalog.uuid;
  v_project_status pg_catalog.text;
  v_members_needed pg_catalog.int2;
  v_member_count pg_catalog.int8;
  v_application_id pg_catalog.uuid;
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

  if not exists (
    select 1
    from public.profiles as profile
    where profile.id = v_user_id
  )
  or not exists (
    select 1
    from public.student_verifications as verification
    where verification.user_id = v_user_id
  )
  or not exists (
    select 1
    from public.user_courses as user_course
    where user_course.user_id = v_user_id
  )
  or not exists (
    select 1
    from public.user_skills as user_skill
    where user_skill.user_id = v_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'onboarding_required';
  end if;

  if p_message is null then
    v_message := null;
  else
    v_message := nullif(
      pg_catalog.regexp_replace(
        p_message,
        '^[[:space:]]+|[[:space:]]+$',
        '',
        'g'
      ),
      ''
    );
  end if;

  if v_message is not null
  and pg_catalog.char_length(v_message) > 2000 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_application_message';
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
  where project.id = p_project_id
  for update of project;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'project_not_found';
  end if;

  if v_project_status <> 'open' then
    raise exception using
      errcode = 'P0001',
      message = 'project_not_open';
  end if;

  if v_project_owner_id = v_user_id then
    raise exception using
      errcode = 'P0001',
      message = 'cannot_apply_to_own_project';
  end if;

  if exists (
    select 1
    from public.project_members as member
    where member.project_id = p_project_id
      and member.user_id = v_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'already_project_member';
  end if;

  if exists (
    select 1
    from public.applications as existing_application
    where existing_application.project_id = p_project_id
      and existing_application.applicant_id = v_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'application_already_exists';
  end if;

  select pg_catalog.count(*)
  into v_member_count
  from public.project_members as member
  where member.project_id = p_project_id
    and member.user_id <> v_project_owner_id;

  if v_member_count >= v_members_needed then
    raise exception using
      errcode = 'P0001',
      message = 'project_full';
  end if;

  begin
    insert into public.applications (
      project_id,
      applicant_id,
      message
    )
    values (
      p_project_id,
      v_user_id,
      v_message
    )
    returning id into v_application_id;
  exception
    when unique_violation then
      raise exception using
        errcode = 'P0001',
        message = 'application_already_exists';
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
    v_project_owner_id,
    v_user_id,
    p_project_id,
    v_application_id,
    'application_received',
    'New application',
    'A student applied to your partner request.'
  );

  return pg_catalog.jsonb_build_object(
    'success', true,
    'application_id', v_application_id,
    'status', 'pending'
  );
exception
  when others then
    if sqlstate = 'P0001'
    and sqlerrm in (
      'authentication_required',
      'ineligible_account',
      'onboarding_required',
      'invalid_application_message',
      'project_not_found',
      'project_not_open',
      'cannot_apply_to_own_project',
      'already_project_member',
      'application_already_exists',
      'project_full'
    ) then
      raise;
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'application_submission_failed';
end;
$$;

create function public.accept_project_application(
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

create function public.reject_project_application(
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

comment on function public.submit_project_application(
  pg_catalog.uuid,
  pg_catalog.text
) is
  'Atomically submits an application and notifies the project owner.';

comment on function public.accept_project_application(
  pg_catalog.uuid
) is
  'Atomically accepts an application, adds the member, and notifies the applicant.';

comment on function public.reject_project_application(
  pg_catalog.uuid
) is
  'Atomically rejects an application and notifies the applicant.';

revoke execute on function public.submit_project_application(
  pg_catalog.uuid,
  pg_catalog.text
) from public;

revoke execute on function public.submit_project_application(
  pg_catalog.uuid,
  pg_catalog.text
) from anon;

grant execute on function public.submit_project_application(
  pg_catalog.uuid,
  pg_catalog.text
) to authenticated;

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
