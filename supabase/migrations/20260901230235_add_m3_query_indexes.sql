create index notifications_user_created_at_id_idx
  on public.notifications (user_id, created_at desc, id desc);

create index projects_owner_created_at_id_idx
  on public.projects (owner_id, created_at desc, id desc);

create index project_members_user_joined_at_project_id_idx
  on public.project_members (user_id, joined_at desc, project_id desc);
