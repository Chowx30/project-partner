create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Sets updated_at to the current timestamp before a row is updated.';

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  department text not null,
  bio text,
  avatar_path text,
  graduation_year integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_valid check (
    full_name = btrim(full_name)
    and char_length(full_name) between 1 and 120
  ),
  constraint profiles_department_valid check (
    department = btrim(department)
    and char_length(department) between 1 and 120
  ),
  constraint profiles_bio_length check (
    bio is null or char_length(bio) <= 1000
  ),
  constraint profiles_graduation_year_range check (
    graduation_year is null or graduation_year between 2000 and 2100
  )
);

create table public.student_verifications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  student_id text not null unique,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint student_verifications_student_id_valid check (
    student_id = btrim(student_id)
    and char_length(student_id) between 1 and 50
  )
);

comment on column public.student_verifications.verified_at is
  'Reserved for trusted server or administrator verification logic.';

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  course_code text not null unique,
  course_name text not null,
  constraint courses_course_code_valid check (
    course_code = upper(btrim(course_code))
    and char_length(course_code) between 1 and 32
  ),
  constraint courses_course_name_valid check (
    course_name = btrim(course_name)
    and char_length(course_name) between 1 and 200
  )
);

create table public.user_courses (
  user_id uuid references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  primary key (user_id, course_id)
);

comment on table public.user_courses is
  'Current course selections only; this table does not retain term history.';

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  constraint skills_name_valid check (
    name = btrim(name)
    and char_length(name) between 1 and 100
  )
);

create unique index skills_name_lower_key
  on public.skills (lower(name));

create table public.user_skills (
  user_id uuid references public.profiles (id) on delete cascade,
  skill_id uuid references public.skills (id) on delete cascade,
  primary key (user_id, skill_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete restrict,
  title text not null,
  short_description text not null,
  members_needed smallint not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_title_valid check (
    title = btrim(title)
    and char_length(title) between 1 and 120
  ),
  constraint projects_short_description_valid check (
    short_description = btrim(short_description)
    and char_length(short_description) between 1 and 1000
  ),
  constraint projects_members_needed_range check (
    members_needed between 1 and 20
  ),
  constraint projects_status_valid check (
    status in ('open', 'closed', 'completed', 'cancelled')
  )
);

comment on column public.projects.members_needed is
  'Number of additional members needed, excluding the project owner.';

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_message_length check (
    message is null or char_length(message) <= 2000
  ),
  constraint applications_status_valid check (
    status in ('pending', 'accepted', 'rejected', 'withdrawn')
  ),
  constraint applications_project_applicant_key unique (project_id, applicant_id)
);

create table public.project_members (
  project_id uuid references public.projects (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

comment on table public.project_members is
  'Accepted non-owner members; the project owner is stored in projects.owner_id.';

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_content_valid check (
    content = btrim(content)
    and char_length(content) between 1 and 2000
  )
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_valid check (
    type in (
      'application_received',
      'application_accepted',
      'application_rejected',
      'new_comment'
    )
  ),
  constraint notifications_title_valid check (
    title = btrim(title)
    and char_length(title) between 1 and 160
  ),
  constraint notifications_message_valid check (
    message = btrim(message)
    and char_length(message) between 1 and 1000
  )
);

comment on table public.notifications is
  'Notification rows are intended to be created by trusted database or server logic.';

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_user_id uuid references public.profiles (id) on delete cascade,
  target_project_id uuid references public.projects (id) on delete cascade,
  target_comment_id uuid references public.comments (id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_exactly_one_target check (
    num_nonnulls(target_user_id, target_project_id, target_comment_id) = 1
  ),
  constraint reports_reason_valid check (
    reason in (
      'spam',
      'harassment',
      'inappropriate_content',
      'misrepresentation',
      'other'
    )
  ),
  constraint reports_details_length check (
    details is null or char_length(details) <= 2000
  ),
  constraint reports_status_valid check (
    status in ('pending', 'resolved', 'dismissed')
  )
);

comment on constraint reports_exactly_one_target on public.reports is
  'Each report must reference exactly one user, project, or comment.';

create unique index reports_reporter_target_user_key
  on public.reports (reporter_id, target_user_id)
  where target_user_id is not null;

create unique index reports_reporter_target_project_key
  on public.reports (reporter_id, target_project_id)
  where target_project_id is not null;

create unique index reports_reporter_target_comment_key
  on public.reports (reporter_id, target_comment_id)
  where target_comment_id is not null;

create index user_courses_course_user_idx
  on public.user_courses (course_id, user_id);

create index user_skills_skill_user_idx
  on public.user_skills (skill_id, user_id);

create index projects_owner_idx
  on public.projects (owner_id);

create index projects_status_created_at_idx
  on public.projects (status, created_at);

create index projects_course_status_created_at_idx
  on public.projects (course_id, status, created_at);

create index applications_project_status_created_at_idx
  on public.applications (project_id, status, created_at);

create index applications_applicant_created_at_idx
  on public.applications (applicant_id, created_at);

create index project_members_user_project_idx
  on public.project_members (user_id, project_id);

create index comments_project_created_at_idx
  on public.comments (project_id, created_at);

create index notifications_user_read_created_at_idx
  on public.notifications (user_id, read_at, created_at);

create index reports_status_created_at_idx
  on public.reports (status, created_at);

create index reports_reporter_idx
  on public.reports (reporter_id);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger set_applications_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create trigger set_comments_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create trigger set_reports_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.student_verifications enable row level security;
alter table public.courses enable row level security;
alter table public.user_courses enable row level security;
alter table public.skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.projects enable row level security;
alter table public.applications enable row level security;
alter table public.project_members enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
