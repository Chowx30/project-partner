create function public.complete_onboarding(
  p_full_name pg_catalog.text,
  p_department pg_catalog.text,
  p_student_id pg_catalog.text,
  p_graduation_year pg_catalog.int4,
  p_bio pg_catalog.text,
  p_course_ids pg_catalog.uuid[],
  p_skill_ids pg_catalog.uuid[]
)
returns pg_catalog.jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id pg_catalog.uuid;
  v_email pg_catalog.text;
  v_full_name pg_catalog.text;
  v_department pg_catalog.text;
  v_student_id pg_catalog.text;
  v_bio pg_catalog.text;
  v_existing_student_id pg_catalog.text;
  v_verified_at pg_catalog.timestamptz;
  v_has_verification pg_catalog.bool;
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

  -- Serialize attempts by the same authenticated user so concurrent calls
  -- cannot race the onboarding-complete check or reconciliation steps.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::pg_catalog.text, 0)
  );

  if exists (
    select 1
    from public.profiles as profile
    where profile.id = v_user_id
  )
  and exists (
    select 1
    from public.student_verifications as verification
    where verification.user_id = v_user_id
  )
  and exists (
    select 1
    from public.user_courses as user_course
    where user_course.user_id = v_user_id
  )
  and exists (
    select 1
    from public.user_skills as user_skill
    where user_skill.user_id = v_user_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'onboarding_already_complete';
  end if;

  v_full_name := pg_catalog.regexp_replace(
    p_full_name,
    '^[[:space:]]+|[[:space:]]+$',
    '',
    'g'
  );
  v_department := p_department;
  v_student_id := pg_catalog.regexp_replace(
    p_student_id,
    '^[[:space:]]+|[[:space:]]+$',
    '',
    'g'
  );

  if p_bio is null then
    v_bio := null;
  else
    v_bio := nullif(
      pg_catalog.regexp_replace(
        p_bio,
        '^[[:space:]]+|[[:space:]]+$',
        '',
        'g'
      ),
      ''
    );
  end if;

  if v_full_name is null
  or pg_catalog.char_length(v_full_name) not between 1 and 120 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_full_name';
  end if;

  if v_department is null
  or v_department not in ('CSE', 'EEE') then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_department';
  end if;

  if v_student_id is null
  or pg_catalog.char_length(v_student_id) not between 1 and 50 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_student_id';
  end if;

  if p_graduation_year is null
  or p_graduation_year not between 2000 and 2100 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_graduation_year';
  end if;

  if v_bio is not null
  and pg_catalog.char_length(v_bio) > 1000 then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_bio';
  end if;

  if p_course_ids is null
  or pg_catalog.cardinality(p_course_ids) = 0
  or exists (
    select 1
    from pg_catalog.unnest(p_course_ids) as selected_course(course_id)
    where selected_course.course_id is null
  )
  or pg_catalog.cardinality(p_course_ids) <> (
    select pg_catalog.count(distinct selected_course.course_id)
    from pg_catalog.unnest(p_course_ids) as selected_course(course_id)
  )
  or exists (
    select 1
    from pg_catalog.unnest(p_course_ids) as selected_course(course_id)
    left join public.courses as course
      on course.id = selected_course.course_id
    where course.id is null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_course_selection';
  end if;

  if p_skill_ids is null
  or pg_catalog.cardinality(p_skill_ids) = 0
  or exists (
    select 1
    from pg_catalog.unnest(p_skill_ids) as selected_skill(skill_id)
    where selected_skill.skill_id is null
  )
  or pg_catalog.cardinality(p_skill_ids) <> (
    select pg_catalog.count(distinct selected_skill.skill_id)
    from pg_catalog.unnest(p_skill_ids) as selected_skill(skill_id)
  )
  or exists (
    select 1
    from pg_catalog.unnest(p_skill_ids) as selected_skill(skill_id)
    left join public.skills as skill
      on skill.id = selected_skill.skill_id
    where skill.id is null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'invalid_skill_selection';
  end if;

  select
    verification.student_id,
    verification.verified_at
  into
    v_existing_student_id,
    v_verified_at
  from public.student_verifications as verification
  where verification.user_id = v_user_id
  for update of verification;

  v_has_verification := found;

  if v_has_verification
  and v_verified_at is not null
  and v_existing_student_id <> v_student_id then
    raise exception using
      errcode = 'P0001',
      message = 'verified_student_id_mismatch';
  end if;

  insert into public.profiles (
    id,
    full_name,
    department,
    bio,
    graduation_year
  )
  values (
    v_user_id,
    v_full_name,
    v_department,
    v_bio,
    p_graduation_year
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    department = excluded.department,
    bio = excluded.bio,
    graduation_year = excluded.graduation_year;

  begin
    if not v_has_verification then
      insert into public.student_verifications (
        user_id,
        student_id
      )
      values (
        v_user_id,
        v_student_id
      );
    elsif v_verified_at is null then
      update public.student_verifications as verification
      set student_id = v_student_id
      where verification.user_id = v_user_id;
    end if;
  exception
    when unique_violation then
      raise exception using
        errcode = 'P0001',
        message = 'student_id_already_used';
  end;

  delete from public.user_courses as user_course
  where user_course.user_id = v_user_id;

  insert into public.user_courses (
    user_id,
    course_id
  )
  select
    v_user_id,
    selected_course.course_id
  from pg_catalog.unnest(p_course_ids) as selected_course(course_id);

  delete from public.user_skills as user_skill
  where user_skill.user_id = v_user_id;

  insert into public.user_skills (
    user_id,
    skill_id
  )
  select
    v_user_id,
    selected_skill.skill_id
  from pg_catalog.unnest(p_skill_ids) as selected_skill(skill_id);

  return pg_catalog.jsonb_build_object('success', true);
exception
  when others then
    if sqlstate = 'P0001' then
      raise;
    end if;

    raise exception using
      errcode = 'P0001',
      message = 'onboarding_failed';
end;
$$;

comment on function public.complete_onboarding(
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.int4,
  pg_catalog.text,
  pg_catalog.uuid[],
  pg_catalog.uuid[]
) is
  'Atomically completes onboarding for the eligible authenticated user under RLS.';

revoke execute on function public.complete_onboarding(
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.int4,
  pg_catalog.text,
  pg_catalog.uuid[],
  pg_catalog.uuid[]
) from public;

revoke execute on function public.complete_onboarding(
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.int4,
  pg_catalog.text,
  pg_catalog.uuid[],
  pg_catalog.uuid[]
) from anon;

grant execute on function public.complete_onboarding(
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.text,
  pg_catalog.int4,
  pg_catalog.text,
  pg_catalog.uuid[],
  pg_catalog.uuid[]
) to authenticated;
