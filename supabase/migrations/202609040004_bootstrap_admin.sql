do $$
declare
  affected integer;
begin
  update public.profiles
  set full_name = 'Ravi Gangawane',
      role = 'admin',
      status = 'active',
      is_active = true,
      updated_at = now()
  where lower(email) = lower('ravi.gangawane.dev@gmail.com');

  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception 'Expected one auth profile for ravi.gangawane.dev@gmail.com, found %', affected;
  end if;
end
$$;
