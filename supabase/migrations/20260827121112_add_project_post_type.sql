alter table public.projects
  add column post_type text not null default 'project',
  add constraint projects_post_type_valid check (
    post_type in ('project', 'lab')
  );

create index projects_status_post_type_created_at_idx
  on public.projects (status, post_type, created_at desc);

grant update (post_type)
  on table public.projects to authenticated;
