begin;

insert into public.batch_coaches (batch_id, coach_id, is_primary)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', false)
on conflict (batch_id, coach_id) do update set is_primary = excluded.is_primary;

do $$
begin
  if not exists (
    select 1 from public.batch_coaches
    where batch_id = '30000000-0000-4000-8000-000000000001'
      and coach_id = '20000000-0000-4000-8000-000000000005'
  ) then
    raise exception 'Coach batch assignment verification failed';
  end if;
end $$;

commit;
