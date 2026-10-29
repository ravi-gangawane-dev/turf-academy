create or replace function public.parent_owns_student(target_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_user_role() = 'parent', false) and exists (
    select 1 from public.student_parents sp
    join public.parents p on p.id = sp.parent_id
    where sp.student_id = target_student
      and p.profile_id = auth.uid()
      and p.status = 'active'
  )
$$;

drop policy if exists parents_read on public.parents;
create policy parents_read on public.parents for select using (
  public.is_admin_or_receptionist()
  or (
    profile_id = auth.uid()
    and status = 'active'
    and public.current_user_role() = 'parent'
  )
);

create or replace function public.parent_update_own_profile(p_payload jsonb)
returns public.parents language plpgsql security definer set search_path = public, pg_temp as $$
declare
  current_parent public.parents;
  updated_parent public.parents;
  next_name text := nullif(btrim(p_payload->>'full_name'), '');
  next_relation text := nullif(btrim(p_payload->>'relation'), '');
  next_phone text := nullif(btrim(p_payload->>'phone'), '');
  next_whatsapp text := nullif(btrim(p_payload->>'whatsapp'), '');
  next_email text := nullif(btrim(p_payload->>'email'), '');
  next_occupation text := nullif(btrim(p_payload->>'occupation'), '');
  next_address jsonb := coalesce(p_payload->'address', '{}'::jsonb);
  next_photo_path text := nullif(btrim(p_payload->>'photo_path'), '');
begin
  if public.current_user_role() is distinct from 'parent' then
    raise exception 'Parent account is inactive or unauthorized.' using errcode = '42501';
  end if;
  select p.* into current_parent from public.parents p
  where p.profile_id = auth.uid() and p.status = 'active' for update;
  if not found then raise exception 'No active parent record is linked to this account.' using errcode = 'P0002'; end if;
  if next_name is null or char_length(next_name) < 2 then raise exception 'A valid full name is required.' using errcode = '22023'; end if;
  if next_relation is null then raise exception 'Relationship is required.' using errcode = '22023'; end if;
  if next_phone is null or next_phone !~ '^[0-9]{10}$' then raise exception 'Phone number must contain 10 digits.' using errcode = '22023'; end if;
  if next_whatsapp is not null and next_whatsapp !~ '^[0-9]{10}$' then raise exception 'WhatsApp number must contain 10 digits.' using errcode = '22023'; end if;
  if next_email is not null and next_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Email address is invalid.' using errcode = '22023'; end if;
  if jsonb_typeof(next_address) <> 'object' then raise exception 'Address must be an object.' using errcode = '22023'; end if;
  if next_photo_path is not null and next_photo_path !~ ('^' || current_parent.id::text || '/') then raise exception 'Profile photo path is invalid.' using errcode = '22023'; end if;

  update public.parents p set
    full_name=next_name, relation=next_relation, phone=next_phone,
    whatsapp=next_whatsapp, email=next_email, occupation=next_occupation,
    address=next_address, photo_path=coalesce(next_photo_path,current_parent.photo_path)
  where p.id=current_parent.id returning p.* into updated_parent;
  return updated_parent;
end;
$$;

create or replace function public.parent_mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.notifications n set read_at=coalesce(n.read_at,now())
  where n.id=p_notification_id and public.current_user_role()='parent' and exists (
    select 1 from public.parents p where p.id=n.parent_id and p.profile_id=auth.uid() and p.status='active'
  );
  if not found then raise exception 'Notification not found.' using errcode='P0002'; end if;
end;
$$;

create or replace function public.parent_mark_all_notifications_read()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare updated_count integer;
begin
  if public.current_user_role() is distinct from 'parent' then raise exception 'Parent account is inactive or unauthorized.' using errcode='42501'; end if;
  update public.notifications n set read_at=now() where n.read_at is null and exists (
    select 1 from public.parents p where p.id=n.parent_id and p.profile_id=auth.uid() and p.status='active'
  );
  get diagnostics updated_count=row_count; return updated_count;
end;
$$;

revoke all on function public.parent_owns_student(uuid) from public;
revoke all on function public.parent_update_own_profile(jsonb) from public;
revoke all on function public.parent_mark_notification_read(uuid) from public;
revoke all on function public.parent_mark_all_notifications_read() from public;
grant execute on function public.parent_owns_student(uuid) to authenticated;
grant execute on function public.parent_update_own_profile(jsonb) to authenticated;
grant execute on function public.parent_mark_notification_read(uuid) to authenticated;
grant execute on function public.parent_mark_all_notifications_read() to authenticated;
