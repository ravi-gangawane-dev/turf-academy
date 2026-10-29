begin;
select plan(15);

-- Run with `supabase test db` against an isolated local test database. The
-- surrounding transaction guarantees that finance fixtures never persist.
select has_function('public','refund_payment',array['uuid','numeric','text','text'],'refund RPC exists');
select has_table('public','payment_refunds','refund audit table exists');
select col_is_pk('public','payment_refunds','id','refunds have a primary key');
select col_is_unique('public','payment_refunds','client_reference','refund idempotency key is unique');
select policies_are('public','payment_refunds',array['payment_refunds_admin_read','payment_refunds_scoped_read'],'refund table has explicit RLS policy');
select function_returns('public','refund_payment',array['uuid','numeric','text','text'],'payment_refunds','refund RPC returns the audit record');
select volatility_is('public','refund_payment',array['uuid','numeric','text','text'],'v','refund RPC is volatile');
select is_definer('public','refund_payment',array['uuid','numeric','text','text'],'refund authorization executes in its guarded function');

create temp table refund_test_context as
select
  extensions.gen_random_uuid() as payment_id,
  extensions.gen_random_uuid() as charge_id,
  enrollment.id as enrollment_id,
  enrollment.student_id,
  profile.id as admin_id
from public.enrollments enrollment
cross join lateral (
  select id from public.profiles where role = 'admin' and is_active limit 1
) profile
limit 1;

select set_config('request.jwt.claim.sub', admin_id::text, true)
from refund_test_context;

insert into public.monthly_charges(
  id,enrollment_id,student_id,charge_month,due_date,base_amount,status
)
select charge_id,enrollment_id,student_id,date '1900-01-01',date '1900-01-10',100,'paid'
from refund_test_context;

insert into public.payments(
  id,student_id,monthly_charge_id,amount,payment_mode,client_reference,status,recorded_by
)
select payment_id,student_id,charge_id,100,'cash','pgtap-refund-payment','successful',admin_id
from refund_test_context;

select lives_ok(
  format(
    'select public.refund_payment(%L::uuid,40,''Partial test'',''pgtap-refund-partial'')',
    payment_id
  ),
  'partial refund succeeds'
) from refund_test_context;

select is(
  (select status::text from public.payments where id = payment_id),
  'partially_refunded',
  'partial refund updates payment status'
) from refund_test_context;

select is(
  (select status::text from public.monthly_charges where id = charge_id),
  'partial',
  'partial refund recalculates the charge balance'
) from refund_test_context;

select lives_ok(
  format(
    'select public.refund_payment(%L::uuid,40,''Partial test'',''pgtap-refund-partial'')',
    payment_id
  ),
  'duplicate refund request is idempotent'
) from refund_test_context;

select is(
  (select count(*) from public.payment_refunds where client_reference = 'pgtap-refund-partial'),
  1::bigint,
  'duplicate refund creates one audit record'
);

select lives_ok(
  format(
    'select public.refund_payment(%L::uuid,60,''Complete test'',''pgtap-refund-complete'')',
    payment_id
  ),
  'complete refund succeeds'
) from refund_test_context;

select results_eq(
  $$select p.status::text,c.status::text from public.payments p join public.monthly_charges c on c.id=p.monthly_charge_id where p.client_reference='pgtap-refund-payment'$$,
  $$values ('refunded'::text,'pending'::text)$$,
  'complete refund updates payment and charge balances'
);

select * from finish();
rollback;
