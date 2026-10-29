begin;

-- Remove only the records created by the original repository seed. User-created
-- records are intentionally untouched.
delete from public.batches where code in ('U10-BASIC', 'U14-AM', 'U18-ELITE');
delete from public.fee_plans where name in ('Junior Development', 'Youth Program', 'Advanced Program', 'Elite Program');
delete from public.discounts where name in ('Sibling Discount', 'Scholarship');
delete from public.late_fee_rules where name = 'Standard Late Fee';

commit;
