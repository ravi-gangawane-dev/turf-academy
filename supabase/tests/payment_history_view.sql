-- Payment History regression: the 'history' view must load for admins and
-- receptionists, honour paging, search, status and column filters, keep the
-- same counts as the 'list' view and still reject unknown views.
begin;
select set_config('request.jwt.claim.sub', (select id::text from public.profiles where role='admin' and is_active and status='active' limit 1), true);
set local role authenticated;
do $$
declare
  a jsonb; b jsonb; rows jsonb; role_name text;
begin
  foreach role_name in array array['admin','receptionist'] loop
    perform set_config('request.jwt.claim.sub', (select id::text from public.profiles where role::text=role_name and is_active and status='active' limit 1), true);

    a:=public.get_payment_list_page('history',0,5,null,'','all','date','desc','{}');
    if a is null or jsonb_typeof(a->'rows')<>'array' then raise exception 'History view returned no rows for %',role_name; end if;
    if (a->>'total') is null then raise exception 'History view returned no total for %',role_name; end if;
    if jsonb_array_length(a->'rows')>5 then raise exception 'History view ignored the page limit for %',role_name; end if;
    if (a->'metrics'->>'transactions') is null then raise exception 'History view returned no metrics for %',role_name; end if;

    b:=public.get_payment_list_page('list',0,5,null,'','all','date','desc','{}');
    if a->>'total'<>b->>'total' then raise exception 'History view total differs from list view for %',role_name; end if;
    if (a->'metrics'->>'total')<>(b->'metrics'->>'total') then raise exception 'History view metrics differ from list view for %',role_name; end if;

    -- Paging past the end returns no rows but keeps the full total.
    b:=public.get_payment_list_page('history',1000000,5,null,'','all','date','desc','{}');
    if jsonb_array_length(b->'rows')<>0 then raise exception 'History view paging past the end returned rows for %',role_name; end if;
    if b->>'total'<>(a->>'total') then raise exception 'History view total changed with paging for %',role_name; end if;

    -- Search filter is applied.
    b:=public.get_payment_list_page('history',0,5,null,'__no_match__','all','date','desc','{}');
    if (b->>'total')<>'0' then raise exception 'History view ignored the search filter for %',role_name; end if;

    -- Column filter is applied.
    b:=public.get_payment_list_page('history',0,5,null,'','all','date','desc',jsonb_build_object('cf_receipt','__no_match__'));
    if (b->>'total')<>'0' then raise exception 'History view ignored the column filter for %',role_name; end if;

    -- Status filter only returns the requested status.
    b:=public.get_payment_list_page('history',0,50,null,'','pending','date','desc','{}');
    rows:=b->'rows';
    if jsonb_array_length(rows)>0 then
      if exists (select 1 from jsonb_array_elements(rows) row where row->>'status'<>'pending') then
        raise exception 'History view ignored the status filter for %',role_name;
      end if;
    end if;

    -- The eight-argument overload accepts the same view.
    a:=public.get_payment_list_page('history',0,5,null,'','all','date','desc');
    if a is null or jsonb_typeof(a->'rows')<>'array' then raise exception 'Eight-argument history view failed for %',role_name; end if;
  end loop;

  -- Unknown views are still rejected.
  begin
    perform public.get_payment_list_page('__no_match__',0,5,null,'','all','date','desc','{}');
    raise exception 'Invalid payment view was not rejected';
  exception when others then
    if sqlerrm not like '%Invalid payment view%' then raise; end if;
  end;
end $$;
reset role;
rollback;
