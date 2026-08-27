-- Comment creation must go through the trusted transactional RPC below.
-- Revoke both table-level and the exact deployed column-level INSERT grants.
revoke insert on table public.comments from authenticated;
revoke insert (project_id, user_id, content)
  on table public.comments from authenticated;

drop policy "Eligible NSU students can create comments"
  on public.comments;

create function public.create_project_comment(
  p_project_id pg_catalog.uuid,
  p_content pg_catalog.text
)
returns pg_catalog.jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id pg_catalog.uuid;
  v_email pg_catalog.text;
  v_content pg_catalog.text;
  v_project_owner_id pg_catalog.uuid;
  v_project_status pg_catalog.text;
  v_comment_id pg_catalog.uuid;
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

  v_content := pg_catalog.regexp_replace(
    p_content,
    '^[[:space:]]+|[[:space:]]+$',
    '',
    'g'
  );

  if v_content is null
  or pg_catalog.char_length(v_content) not between 1 and 2000 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_comment_content';
  end if;

  select
    project.owner_id,
    project.status
  into
    v_project_owner_id,
    v_project_status
  from public.projects as project
  where project.id = p_project_id
  for update of project;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'project_not_found';
  end if;

  if v_project_status not in ('open', 'closed') then
    raise exception using
      errcode = 'P0001',
      message = 'project_comments_closed';
  end if;

  insert into public.comments (
    project_id,
    user_id,
    content
  )
  values (
    p_project_id,
    v_user_id,
    v_content
  )
  returning id into v_comment_id;

  if v_project_owner_id <> v_user_id then
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
      null,
      'new_comment',
      'New comment',
      'Someone commented on your project.'
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'success', true,
    'comment_id', v_comment_id
  );
exception
  when others then
    if sqlstate = 'P0001'
    and sqlerrm in (
      'authentication_required',
      'ineligible_account',
      'onboarding_required',
      'invalid_comment_content',
      'project_not_found',
      'project_comments_closed'
    ) then
      raise;
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'comment_creation_failed';
end;
$$;

comment on function public.create_project_comment(
  pg_catalog.uuid,
  pg_catalog.text
) is
  'Atomically creates a project comment and notifies the project owner when appropriate.';

revoke execute on function public.create_project_comment(
  pg_catalog.uuid,
  pg_catalog.text
) from public;

revoke execute on function public.create_project_comment(
  pg_catalog.uuid,
  pg_catalog.text
) from anon;

grant execute on function public.create_project_comment(
  pg_catalog.uuid,
  pg_catalog.text
) to authenticated;
