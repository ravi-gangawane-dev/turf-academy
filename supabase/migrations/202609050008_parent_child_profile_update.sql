begin;

-- Parents may maintain personal details for children linked to their own account.
-- Enrollment, status, student code, guardian links and audit ownership remain staff-only.
create or replace function public.parent_update_linked_student(
  p_student_id uuid,
  p_payload jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.parent_owns_student(p_student_id) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_payload->>'full_name', ''))) < 2
     or nullif(p_payload->>'date_of_birth', '') is null
     or length(trim(coalesce(p_payload->>'phone', ''))) <> 10
     or length(trim(coalesce(p_payload->>'address', ''))) < 2
     or length(trim(coalesce(p_payload->>'city', ''))) < 2
     or length(trim(coalesce(p_payload->>'state', ''))) < 2
     or length(trim(coalesce(p_payload->>'pin_code', ''))) <> 6 then
    raise exception 'required_student_fields_missing' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.students
    where id <> p_student_id and phone = nullif(p_payload->>'phone', '')
  ) or exists (
    select 1 from public.students
    where id <> p_student_id
      and lower(email) = lower(nullif(p_payload->>'email', ''))
  ) then
    raise exception 'student_already_exists' using errcode = '23505';
  end if;

  update public.students set
    full_name = trim(p_payload->>'full_name'),
    date_of_birth = (p_payload->>'date_of_birth')::date,
    gender = nullif(p_payload->>'gender', ''),
    phone = nullif(p_payload->>'phone', ''),
    email = nullif(p_payload->>'email', ''),
    address = jsonb_strip_nulls(jsonb_build_object(
      'formatted', nullif(p_payload->>'address', ''),
      'city', nullif(p_payload->>'city', ''),
      'state', nullif(p_payload->>'state', ''),
      'pinCode', nullif(p_payload->>'pin_code', ''),
      'nationality', nullif(p_payload->>'nationality', ''),
      'aadhaar', nullif(p_payload->>'aadhaar', '')
    )),
    photo_path = case
      when p_payload ? 'photo_path' then nullif(p_payload->>'photo_path', '')
      else photo_path
    end,
    version = version + 1
  where id = p_student_id;

  insert into public.student_medical_records(student_id, blood_group, updated_by)
  values (p_student_id, nullif(p_payload->>'blood_group', ''), auth.uid())
  on conflict(student_id) do update
    set blood_group = excluded.blood_group, updated_by = excluded.updated_by;

  return p_student_id;
end;
$$;

revoke all on function public.parent_update_linked_student(uuid, jsonb) from public;
grant execute on function public.parent_update_linked_student(uuid, jsonb) to authenticated;

create policy parent_linked_student_update on public.students for update
using (public.parent_owns_student(id))
with check (public.parent_owns_student(id));

create policy parent_linked_medical_insert on public.student_medical_records for insert
with check (public.parent_owns_student(student_id));

create policy parent_linked_medical_update on public.student_medical_records for update
using (public.parent_owns_student(student_id))
with check (public.parent_owns_student(student_id));

create policy parent_linked_student_photo_insert on storage.objects for insert
with check (
  bucket_id = 'student-photos'
  and public.parent_owns_student((storage.foldername(name))[1]::uuid)
);

create policy parent_linked_student_photo_update on storage.objects for update
using (
  bucket_id = 'student-photos'
  and public.parent_owns_student((storage.foldername(name))[1]::uuid)
) with check (
  bucket_id = 'student-photos'
  and public.parent_owns_student((storage.foldername(name))[1]::uuid)
);

create policy parent_linked_student_photo_delete on storage.objects for delete
using (
  bucket_id = 'student-photos'
  and public.parent_owns_student((storage.foldername(name))[1]::uuid)
);

commit;
