begin;

create or replace function public.get_fee_charge_summary()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'students', count(distinct student_id),
    'total', coalesce(sum(final_amount), 0),
    'pending', coalesce(sum(balance_amount) filter (where status <> 'overdue'), 0),
    'overdue', coalesce(sum(balance_amount) filter (where status = 'overdue'), 0)
  )
  from public.monthly_charge_balances
$$;

grant execute on function public.get_fee_charge_summary() to authenticated;

commit;
