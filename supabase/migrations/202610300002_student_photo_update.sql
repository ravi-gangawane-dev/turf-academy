begin;

-- Save a photo independently of incomplete personal details, without granting
-- parents broad UPDATE access to students.
create or replace function public.update_student_photo(p_student_id uuid, p_photo_path text)
returns uuid language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.is_admin_or_receptionist() or public.parent_owns_student(p_student_id)) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if p_photo_path is null or split_part(p_photo_path, '/', 1) <> p_student_id::text
     or not exists (select 1 from storage.objects where bucket_id = 'student-photos' and name = p_photo_path) then
    raise exception 'Invalid student photo path' using errcode = '22023';
  end if;
  update public.students set photo_path = p_photo_path, version = version + 1
  where id = p_student_id;
  if not found then
    raise exception 'Student not found' using errcode = 'P0002';
  end if;
  return p_student_id;
end;
$$;
revoke all on function public.update_student_photo(uuid, text) from public;
grant execute on function public.update_student_photo(uuid, text) to authenticated;
commit;
