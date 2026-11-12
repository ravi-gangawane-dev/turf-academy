begin;

-- Keep the deployed academy_settings table aligned with the settings API contract.
-- Older environments may have been created before the enhanced settings migration.
alter table public.academy_settings
  add column if not exists academy_code text not null default 'TCM'
  check (academy_code ~ '^[A-Z]{2,10}$');

alter table public.academy_settings
  add column if not exists academy_logo_url text;

update public.academy_settings
set academy_code = 'TCM'
where academy_code is null or academy_code = '';

commit;
