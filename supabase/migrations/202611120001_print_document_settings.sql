begin;

-- Optional letterhead and footer text for printed/PDF documents.
-- Nullable so existing academies keep the current template defaults.
alter table public.academy_settings
  add column if not exists print_registration_number text,
  add column if not exists print_terms text,
  add column if not exists print_footer_note text;

alter table public.academy_settings
  drop constraint if exists academy_settings_print_registration_number_length,
  drop constraint if exists academy_settings_print_terms_length,
  drop constraint if exists academy_settings_print_footer_note_length;

alter table public.academy_settings
  add constraint academy_settings_print_registration_number_length
    check (print_registration_number is null or char_length(print_registration_number) <= 60),
  add constraint academy_settings_print_terms_length
    check (print_terms is null or char_length(print_terms) <= 1200),
  add constraint academy_settings_print_footer_note_length
    check (print_footer_note is null or char_length(print_footer_note) <= 200);

commit;
