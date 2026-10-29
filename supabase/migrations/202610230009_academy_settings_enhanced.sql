begin;

-- Add enhanced fields to academy_settings table
alter table public.academy_settings add column if not exists academy_code text not null default 'TCM'::text check (academy_code ~ '^[A-Z]{2,10}$');
alter table public.academy_settings add column if not exists academy_logo_url text;
alter table public.academy_settings add column if not exists academy_description text;
alter table public.academy_settings add column if not exists theme_preference text not null default 'forest' check (theme_preference in ('forest','blue','contrast'));
alter table public.academy_settings add column if not exists updated_by uuid references public.profiles(id);

-- Update the existing RLS trigger to include new columns
create or replace function public.validate_academy_settings() returns trigger language plpgsql set search_path='' as begin
 if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'invalid_timezone'; end if;
 if not new.notification_channels <@ array['in_app','email','sms','whatsapp']::text[] then raise exception 'invalid_notification_channel'; end if;
 if new.theme_preference is not null and not new.theme_preference = any(array['forest','blue','contrast']) then raise exception 'invalid_theme'; end if;
 new.updated_by:=auth.uid();new.updated_at:=now();return new;end;

-- Drop old trigger and recreate with enhanced validation
drop trigger if exists validate_academy_settings on public.academy_settings;
create trigger validate_academy_settings before update on public.academy_settings for each row execute function public.validate_academy_settings();

-- Ensure the row exists with new defaults
insert into public.academy_settings(id, academy_name, contact_email, contact_phone, address, timezone, currency_code, attendance_grace_minutes, fee_due_day, notification_channels, academy_code, theme_preference) values (true, 'Turf Cricket Academy', null, null, null, 'Asia/Kolkata', 'INR', 10, 10, array['in_app']::text[], 'TCM', 'forest') on conflict(id) do nothing;

grant select on public.academy_settings to authenticated;
grant all on public.academy_settings to authenticated using (public.is_admin());

commit;
