-- These workflows lock batches to enforce capacity. SELECT FOR UPDATE also
-- applies the batch UPDATE policy, which intentionally allows only admins.
-- Execute the existing guarded workflows as their owner without expanding
-- direct table permissions. Both functions explicitly require an active
-- admin/receptionist before reading or changing any records.
alter function public.create_enrollment(uuid, uuid, uuid, date, date, text) security definer;
alter function public.create_enrollment(uuid, uuid, uuid, date, date, text) set search_path = '';
alter function public.transfer_enrollment(uuid, uuid, date, text) security definer;
alter function public.transfer_enrollment(uuid, uuid, date, text) set search_path = '';

revoke all on function public.create_enrollment(uuid, uuid, uuid, date, date, text) from public, anon;
revoke all on function public.transfer_enrollment(uuid, uuid, date, text) from public, anon;
grant execute on function public.create_enrollment(uuid, uuid, uuid, date, date, text) to authenticated;
grant execute on function public.transfer_enrollment(uuid, uuid, date, text) to authenticated;
