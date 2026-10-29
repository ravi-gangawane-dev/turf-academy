begin;

update public.notification_templates
set
  subject = '🎉 Happy Birthday, {student_name}! 🎂',
  body = E'Wishing you a fantastic birthday!\nMay your day be filled with fun, joy and cricket! 🏏\nFrom Turf Cricket Academy'
where template_key = 'student_birthday'
  and channel = 'in_app';

commit;
