begin;

update public.notification_templates
set body = 'Turf Academy wishes {student_name} a very happy birthday! We hope your day is full of fun and cricket.'
where template_key = 'student_birthday'
  and channel = 'in_app';

update public.notification_templates
set body = 'Hi {parent_name}, Turf Academy wishes {student_name} a very happy birthday! We hope the day is full of fun and cricket.'
where template_key in ('student_birthday_email', 'student_birthday_whatsapp')
  and channel in ('email', 'whatsapp');

update public.notification_templates
set body = 'Turf Academy wishes you a wonderful birthday, {coach_name}! Thank you for inspiring our players.'
where template_key = 'coach_birthday'
  and channel = 'in_app';

update public.notification_templates
set body = 'Hello {coach_name}, Turf Academy wishes you a wonderful birthday! Thank you for inspiring our players.'
where template_key = 'coach_birthday_email'
  and channel = 'email';

update public.notification_templates
set body = 'Happy birthday, {coach_name}! Turf Academy wishes you a wonderful day.'
where template_key = 'coach_birthday_whatsapp'
  and channel = 'whatsapp';

commit;
