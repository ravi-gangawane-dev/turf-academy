begin;

alter table public.profiles
  add column if not exists avatar_path text;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_photo_owner_read on storage.objects;
create policy profile_photo_owner_read on storage.objects for select to authenticated
using (
  bucket_id = 'profile-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists profile_photo_owner_insert on storage.objects;
create policy profile_photo_owner_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists profile_photo_owner_update on storage.objects;
create policy profile_photo_owner_update on storage.objects for update to authenticated
using (
  bucket_id = 'profile-photos'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'profile-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists profile_photo_owner_delete on storage.objects;
create policy profile_photo_owner_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and split_part(name, '/', 1) = auth.uid()::text
);

create or replace function public.profile_update_own_avatar(p_avatar_path text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.profiles;
begin
  if public.current_user_role() not in ('admin', 'receptionist') then
    raise exception 'staff_profile_access_required' using errcode = '42501';
  end if;
  if p_avatar_path is null
     or p_avatar_path !~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-profile-photo\.jpg$') then
    raise exception 'Profile photo path is invalid.' using errcode = '22023';
  end if;

  update public.profiles
  set avatar_path = p_avatar_path,
      updated_at = now()
  where id = auth.uid()
    and role in ('admin', 'receptionist')
    and status = 'active'
    and is_active
  returning * into result;
  if result.id is null then
    raise exception 'Active staff profile not found.' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

revoke all on function public.profile_update_own_avatar(text) from public;
grant execute on function public.profile_update_own_avatar(text) to authenticated;

commit;
