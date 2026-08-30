-- Project and report creation must go through the trusted rate-limited RPCs.
-- Revoke both table-level and the exact deployed column-level INSERT grants.
revoke insert on table public.projects from authenticated;
revoke insert (
  owner_id,
  course_id,
  title,
  short_description,
  members_needed,
  post_type
) on table public.projects from authenticated;

drop policy if exists "Eligible NSU students can create projects"
  on public.projects;

revoke insert on table public.reports from authenticated;
revoke insert (
  reporter_id,
  target_user_id,
  target_project_id,
  target_comment_id,
  reason,
  details
) on table public.reports from authenticated;

drop policy if exists "Eligible NSU students can create reports"
  on public.reports;
