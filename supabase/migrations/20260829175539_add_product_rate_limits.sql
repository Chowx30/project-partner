create table public.rate_limit_buckets (
  user_id pg_catalog.uuid not null
    references public.profiles (id) on delete cascade,
  action pg_catalog.text not null,
  window_start pg_catalog.timestamptz not null,
  request_count pg_catalog.int4 not null,
  primary key (user_id, action, window_start),
  constraint rate_limit_buckets_action_valid check (
    action in (
      'create_project',
      'submit_application',
      'create_comment',
      'submit_report'
    )
  ),
  constraint rate_limit_buckets_request_count_valid check (
    request_count >= 1
  )
);

create index rate_limit_buckets_window_start_idx
  on public.rate_limit_buckets (window_start);

alter table public.rate_limit_buckets enable row level security;

revoke all privileges on table public.rate_limit_buckets
  from public, anon, authenticated;

comment on table public.rate_limit_buckets is
  'Internal fixed-window counters for trusted product RPC rate limits.';

create function public.consume_rate_limit(
  p_action pg_catalog.text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id pg_catalog.uuid;
  v_limit pg_catalog.int4;
  v_window_start pg_catalog.timestamptz;
  v_request_count pg_catalog.int4;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'authentication_required';
  end if;

  case p_action
    when 'create_project' then
      v_limit := 5;
      v_window_start := pg_catalog.date_trunc(
        'day',
        pg_catalog.now(),
        'UTC'
      );
    when 'submit_application' then
      v_limit := 10;
      v_window_start := pg_catalog.date_trunc(
        'hour',
        pg_catalog.now(),
        'UTC'
      );
    when 'create_comment' then
      v_limit := 20;
      v_window_start := pg_catalog.date_trunc(
        'hour',
        pg_catalog.now(),
        'UTC'
      );
    when 'submit_report' then
      v_limit := 5;
      v_window_start := pg_catalog.date_trunc(
        'hour',
        pg_catalog.now(),
        'UTC'
      );
    else
      raise exception using
        errcode = 'P0001',
        message = 'invalid_rate_limit_action';
  end case;

  insert into public.rate_limit_buckets as bucket (
    user_id,
    action,
    window_start,
    request_count
  )
  values (
    v_user_id,
    p_action,
    v_window_start,
    1
  )
  on conflict (user_id, action, window_start) do update
  set request_count = bucket.request_count + 1
  where bucket.request_count < v_limit
  returning bucket.request_count into v_request_count;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'rate_limit_exceeded';
  end if;
end;
$$;

comment on function public.consume_rate_limit(pg_catalog.text) is
  'Atomically consumes an internal fixed-window quota for auth.uid().';

revoke execute on function public.consume_rate_limit(pg_catalog.text)
  from public;
revoke execute on function public.consume_rate_limit(pg_catalog.text)
  from anon;
revoke execute on function public.consume_rate_limit(pg_catalog.text)
  from authenticated;

create function public.create_project(
  p_course_id pg_catalog.uuid,
  p_title pg_catalog.text,
  p_short_description pg_catalog.text,
  p_members_needed pg_catalog.int4,
  p_post_type pg_catalog.text
)
returns pg_catalog.jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id pg_catalog.uuid;
  v_email pg_catalog.text;
  v_title pg_catalog.text;
  v_short_description pg_catalog.text;
  v_post_type pg_catalog.text;
  v_project_id pg_catalog.uuid;
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
      message = 'account_not_eligible';
  end if;

  if not public.has_completed_onboarding() then
    raise exception using
      errcode = 'P0001',
      message = 'onboarding_required';
  end if;

  v_title := pg_catalog.regexp_replace(
    p_title,
    '^[[:space:]]+|[[:space:]]+$',
    '',
    'g'
  );
  v_short_description := pg_catalog.regexp_replace(
    p_short_description,
    '^[[:space:]]+|[[:space:]]+$',
    '',
    'g'
  );
  v_post_type := pg_catalog.btrim(p_post_type);

  if v_title is null
  or pg_catalog.char_length(v_title) not between 1 and 120 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_project_title';
  end if;

  if v_short_description is null
  or pg_catalog.char_length(v_short_description) not between 1 and 1000 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_project_description';
  end if;

  if p_members_needed is null
  or p_members_needed not between 1 and 20 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_members_needed';
  end if;

  if v_post_type is null
  or v_post_type not in ('project', 'lab') then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_post_type';
  end if;

  if p_course_id is null
  or not exists (
    select 1
    from public.courses as course
    where course.id = p_course_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_course_selection';
  end if;

  perform public.consume_rate_limit('create_project');

  insert into public.projects (
    owner_id,
    course_id,
    title,
    short_description,
    members_needed,
    post_type
  )
  values (
    v_user_id,
    p_course_id,
    v_title,
    v_short_description,
    p_members_needed,
    v_post_type
  )
  returning id into v_project_id;

  return pg_catalog.jsonb_build_object(
    'success', true,
    'project_id', v_project_id,
    'status', 'open'
  );
exception
  when others then
    if sqlstate = 'P0001'
    and sqlerrm in (
      'authentication_required',
      'account_not_eligible',
      'onboarding_required',
      'invalid_project_title',
      'invalid_project_description',
      'invalid_members_needed',
      'invalid_post_type',
      'invalid_course_selection',
      'rate_limit_exceeded'
    ) then
      raise;
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'project_creation_failed';
end;
$$;

comment on function public.create_project(
  pg_catalog.uuid,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.int4,
  pg_catalog.text
) is
  'Validates and atomically creates a rate-limited project for auth.uid().';

revoke execute on function public.create_project(
  pg_catalog.uuid,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.int4,
  pg_catalog.text
) from public;
revoke execute on function public.create_project(
  pg_catalog.uuid,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.int4,
  pg_catalog.text
) from anon;
grant execute on function public.create_project(
  pg_catalog.uuid,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.int4,
  pg_catalog.text
) to authenticated;

create function public.submit_report(
  p_target_type pg_catalog.text,
  p_target_id pg_catalog.uuid,
  p_reason pg_catalog.text,
  p_details pg_catalog.text default null
)
returns pg_catalog.jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id pg_catalog.uuid;
  v_email pg_catalog.text;
  v_target_type pg_catalog.text;
  v_reason pg_catalog.text;
  v_details pg_catalog.text;
  v_target_user_id pg_catalog.uuid;
  v_target_project_id pg_catalog.uuid;
  v_target_comment_id pg_catalog.uuid;
  v_target_owner_id pg_catalog.uuid;
  v_report_id pg_catalog.uuid;
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
      message = 'account_not_eligible';
  end if;

  if not public.has_completed_onboarding() then
    raise exception using
      errcode = 'P0001',
      message = 'onboarding_required';
  end if;

  v_target_type := pg_catalog.lower(pg_catalog.btrim(p_target_type));
  v_reason := pg_catalog.btrim(p_reason);

  if p_details is null then
    v_details := null;
  else
    v_details := nullif(
      pg_catalog.regexp_replace(
        p_details,
        '^[[:space:]]+|[[:space:]]+$',
        '',
        'g'
      ),
      ''
    );
  end if;

  if v_target_type is null
  or v_target_type not in ('project', 'comment', 'user')
  or p_target_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_report_target';
  end if;

  if v_reason is null
  or v_reason not in (
    'spam',
    'harassment',
    'inappropriate_content',
    'misrepresentation',
    'other'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_report_reason';
  end if;

  if v_details is not null
  and pg_catalog.char_length(v_details) > 2000 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_report_details';
  end if;

  case v_target_type
    when 'user' then
      select profile.id
      into v_target_user_id
      from public.profiles as profile
      where profile.id = p_target_id;

      if not found then
        raise exception using
          errcode = 'P0001',
          message = 'invalid_report_target';
      end if;

      if v_target_user_id = v_user_id then
        raise exception using
          errcode = 'P0001',
          message = 'cannot_report_own_target';
      end if;
    when 'project' then
      select
        project.id,
        project.owner_id
      into
        v_target_project_id,
        v_target_owner_id
      from public.projects as project
      where project.id = p_target_id;

      if not found then
        raise exception using
          errcode = 'P0001',
          message = 'invalid_report_target';
      end if;

      if v_target_owner_id = v_user_id then
        raise exception using
          errcode = 'P0001',
          message = 'cannot_report_own_target';
      end if;
    when 'comment' then
      select
        comment.id,
        comment.user_id
      into
        v_target_comment_id,
        v_target_owner_id
      from public.comments as comment
      where comment.id = p_target_id;

      if not found then
        raise exception using
          errcode = 'P0001',
          message = 'invalid_report_target';
      end if;

      if v_target_owner_id = v_user_id then
        raise exception using
          errcode = 'P0001',
          message = 'cannot_report_own_target';
      end if;
  end case;

  if exists (
    select 1
    from public.reports as report
    where report.reporter_id = v_user_id
      and (
        (v_target_user_id is not null
          and report.target_user_id = v_target_user_id)
        or (v_target_project_id is not null
          and report.target_project_id = v_target_project_id)
        or (v_target_comment_id is not null
          and report.target_comment_id = v_target_comment_id)
      )
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'report_already_exists';
  end if;

  perform public.consume_rate_limit('submit_report');

  begin
    insert into public.reports (
      reporter_id,
      target_user_id,
      target_project_id,
      target_comment_id,
      reason,
      details
    )
    values (
      v_user_id,
      v_target_user_id,
      v_target_project_id,
      v_target_comment_id,
      v_reason,
      v_details
    )
    returning id into v_report_id;
  exception
    when unique_violation then
      raise exception using
        errcode = 'P0001',
        message = 'report_already_exists';
  end;

  return pg_catalog.jsonb_build_object(
    'success', true,
    'report_id', v_report_id
  );
exception
  when others then
    if sqlstate = 'P0001'
    and sqlerrm in (
      'authentication_required',
      'account_not_eligible',
      'onboarding_required',
      'invalid_report_target',
      'cannot_report_own_target',
      'invalid_report_reason',
      'invalid_report_details',
      'report_already_exists',
      'rate_limit_exceeded'
    ) then
      raise;
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'report_submission_failed';
end;
$$;

comment on function public.submit_report(
  pg_catalog.text,
  pg_catalog.uuid,
  pg_catalog.text,
  pg_catalog.text
) is
  'Validates and atomically submits a rate-limited report for auth.uid().';

revoke execute on function public.submit_report(
  pg_catalog.text,
  pg_catalog.uuid,
  pg_catalog.text,
  pg_catalog.text
) from public;
revoke execute on function public.submit_report(
  pg_catalog.text,
  pg_catalog.uuid,
  pg_catalog.text,
  pg_catalog.text
) from anon;
grant execute on function public.submit_report(
  pg_catalog.text,
  pg_catalog.uuid,
  pg_catalog.text,
  pg_catalog.text
) to authenticated;

create or replace function public.submit_project_application(
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

  perform public.consume_rate_limit('submit_application');

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
      'project_full',
      'rate_limit_exceeded'
    ) then
      raise;
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'application_submission_failed';
end;
$$;

comment on function public.submit_project_application(
  pg_catalog.uuid,
  pg_catalog.text
) is
  'Atomically submits a rate-limited application and notifies the project owner.';

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

create or replace function public.create_project_comment(
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

  perform public.consume_rate_limit('create_comment');

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
      'project_comments_closed',
      'rate_limit_exceeded'
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
  'Atomically creates a rate-limited project comment and notifies the project owner when appropriate.';

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
