begin;

do $$ begin
 perform set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='admin' and is_active limit 1),true);
end $$;
set local role authenticated;
do $$
declare resource text; first_page jsonb; next_page jsonb; empty_page jsonb;
begin
 foreach resource in array array['plans','discounts','late-fees','summary','pending','coaches','enrollments','batches','allocations'] loop
  first_page:=public.get_staff_list_page(resource,1,5,'{}');
  next_page:=public.get_staff_list_page(resource,2,5,'{}');
  if jsonb_array_length(first_page->'rows')>5 then raise exception 'Page limit failed for %',resource; end if;
  if first_page->'total' is distinct from next_page->'total' or first_page->'metrics' is distinct from next_page->'metrics' or first_page->'totals' is distinct from next_page->'totals' then raise exception 'Totals changed between pages for %',resource; end if;
  if (next_page->>'page')::integer=2 and exists(select 1 from jsonb_array_elements(first_page->'rows') a join jsonb_array_elements(next_page->'rows') b on a->>'id'=b->>'id') then raise exception 'Pages overlap for %',resource; end if;
  empty_page:=public.get_staff_list_page(resource,999,5,'{"search":"__pagination_no_match_802fa1__"}');
  if (empty_page->>'total')::integer<>0 or jsonb_array_length(empty_page->'rows')<>0 or (empty_page->>'page')::integer<>1 then raise exception 'Empty result incorrect for %',resource; end if;
 end loop;
 first_page:=public.get_staff_list_page('summary',1,5,'{}');
 if (first_page->'totals'->>'balance')::numeric is distinct from (select coalesce(round(sum(balance_amount)*100),0) from public.monthly_charge_balances) then raise exception 'Fee totals do not match database'; end if;
 first_page:=public.get_staff_list_page('pending',1,100,'{}');
 if exists(select 1 from jsonb_array_elements(first_page->'rows') r where (r->>'balance_amount')::numeric<=0 or r->>'status'='waived') then raise exception 'Invalid pending balance'; end if;
end $$;
reset role;

rollback;
