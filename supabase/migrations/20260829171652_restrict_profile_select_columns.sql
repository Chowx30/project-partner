revoke select on table public.profiles from authenticated;

grant select (
  id,
  full_name,
  department,
  bio,
  graduation_year
) on table public.profiles to authenticated;
