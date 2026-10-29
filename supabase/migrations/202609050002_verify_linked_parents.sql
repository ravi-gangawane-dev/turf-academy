do $$
declare
  parent_count integer;
  linked_count integer;
begin
  select count(*) into parent_count
  from public.parents
  where id in (
    '50000000-0000-4000-8000-000000000008', '50000000-0000-4000-8000-000000000009',
    '50000000-0000-4000-8000-000000000010', '50000000-0000-4000-8000-000000000011',
    '50000000-0000-4000-8000-000000000012'
  );
  select count(*) into linked_count
  from public.student_parents sp
  join public.students s on s.id=sp.student_id
  where sp.parent_id in (
    '50000000-0000-4000-8000-000000000008', '50000000-0000-4000-8000-000000000009',
    '50000000-0000-4000-8000-000000000010', '50000000-0000-4000-8000-000000000011',
    '50000000-0000-4000-8000-000000000012'
  );
  if parent_count <> 5 or linked_count <> 5 then
    raise exception 'Expected 5 parents and 5 valid student links, found % and %', parent_count, linked_count;
  end if;
end $$;
