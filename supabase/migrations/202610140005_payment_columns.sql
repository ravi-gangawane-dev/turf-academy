begin;

create or replace function public.get_payment_list_page(
  p_view text,
  p_offset integer,
  p_limit integer,
  p_student_ids uuid[],
  p_search text,
  p_status text,
  p_sort_by text,
  p_sort_direction text, p_columns jsonb
) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare
  result jsonb;
begin
  if not public.is_admin_or_receptionist() then
    raise exception 'insufficient_privilege' using errcode='42501';
  end if;
  if p_view not in ('list','new','partial','full','refunds','receipts') then
    raise exception 'Invalid payment view';
  end if;
  if p_sort_by not in ('date','student','amount','status','mode','receipt') then
    raise exception 'Invalid payment sort field';
  end if;
  if p_sort_direction not in ('asc','desc') then
    raise exception 'Invalid payment sort direction';
  end if;
  if p_status not in ('all','pending','successful','failed','refunded','partially_refunded') then
    raise exception 'Invalid payment status';
  end if;

  with filtered as (
    select
      p.*,
      to_jsonb(s) as student,
      to_jsonb(r) as receipt,
      coalesce((select sum(f.amount) from public.payment_refunds f where f.payment_id=p.id),0) as refunded_amount,
      s.full_name as sort_student,
      r.receipt_number as sort_receipt
    from public.payments p
    join public.students s on s.id=p.student_id
    left join public.receipts r on r.payment_id=p.id
    left join public.monthly_charge_balances c on c.id=p.monthly_charge_id
    where public.list_columns_match(to_jsonb(p)||jsonb_build_object('student',to_jsonb(s),'receipt',to_jsonb(r),'paid_day',(p.paid_at at time zone coalesce((select timezone from public.academy_settings where id=true),'Asia/Kolkata'))::date),p_columns)
      and (p_student_ids is null or p.student_id=any(p_student_ids))
      and (p_status='all' or p.status::text=p_status)
      and case p_view
        when 'partial' then c.paid_amount>0 and c.balance_amount>0 and p.status in ('successful','partially_refunded')
        when 'full' then c.balance_amount=0 and p.status in ('successful','partially_refunded')
        when 'refunds' then p.status in ('successful','partially_refunded','refunded')
        when 'receipts' then r.id is not null
        else true
      end
      and (
        coalesce(trim(p_search),'')=''
        or strpos(lower(concat_ws(' ',s.full_name,s.student_code,r.receipt_number,p.payment_mode,p.status)),
          lower(trim(p_search)))>0
      )
  ), page_rows as (
    select *
    from filtered
    order by
      case when p_sort_by='date' and p_sort_direction='desc' then paid_at end desc nulls last,
      case when p_sort_by='date' and p_sort_direction='asc' then paid_at end asc nulls last,
      case when p_sort_by='amount' and p_sort_direction='desc' then amount end desc nulls last,
      case when p_sort_by='amount' and p_sort_direction='asc' then amount end asc nulls last,
      case when p_sort_by='student' and p_sort_direction='desc' then sort_student end desc nulls last,
      case when p_sort_by='student' and p_sort_direction='asc' then sort_student end asc nulls last,
      case when p_sort_by='receipt' and p_sort_direction='desc' then sort_receipt end desc nulls last,
      case when p_sort_by='receipt' and p_sort_direction='asc' then sort_receipt end asc nulls last,
      case when p_sort_by='status' and p_sort_direction='desc' then status end desc nulls last,
      case when p_sort_by='status' and p_sort_direction='asc' then status end asc nulls last,
      case when p_sort_by='mode' and p_sort_direction='desc' then payment_mode end desc nulls last,
      case when p_sort_by='mode' and p_sort_direction='asc' then payment_mode end asc nulls last,
      id asc
    limit least(greatest(p_limit,1),500)
    offset greatest(p_offset,0)
  )
  select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(to_jsonb(page_rows)-'sort_student'-'sort_receipt' order by
      case when p_sort_by='date' and p_sort_direction='desc' then paid_at end desc nulls last,
      case when p_sort_by='date' and p_sort_direction='asc' then paid_at end asc nulls last,
      case when p_sort_by='amount' and p_sort_direction='desc' then amount end desc nulls last,
      case when p_sort_by='amount' and p_sort_direction='asc' then amount end asc nulls last,
      case when p_sort_by='student' and p_sort_direction='desc' then sort_student end desc nulls last,
      case when p_sort_by='student' and p_sort_direction='asc' then sort_student end asc nulls last,
      case when p_sort_by='receipt' and p_sort_direction='desc' then sort_receipt end desc nulls last,
      case when p_sort_by='receipt' and p_sort_direction='asc' then sort_receipt end asc nulls last,
      case when p_sort_by='status' and p_sort_direction='desc' then status end desc nulls last,
      case when p_sort_by='status' and p_sort_direction='asc' then status end asc nulls last,
      case when p_sort_by='mode' and p_sort_direction='desc' then payment_mode end desc nulls last,
      case when p_sort_by='mode' and p_sort_direction='asc' then payment_mode end asc nulls last,
      id asc) from page_rows),'[]'::jsonb),
    'total',(select count(*) from filtered),
    'metrics',jsonb_build_object(
      'total',(select coalesce(sum(amount-refunded_amount) filter(where status in ('successful','partially_refunded','refunded')),0) from filtered),
      'transactions',(select count(*) from filtered),
      'receipts',(select count(*) from filtered where receipt is not null),
      'refunded',(select coalesce(sum(refunded_amount),0) from filtered)
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.get_payment_list_page(text,integer,integer,uuid[],text,text,text,text,jsonb) from public,anon;
grant execute on function public.get_payment_list_page(text,integer,integer,uuid[],text,text,text,text,jsonb) to authenticated;
commit;
