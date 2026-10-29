begin;
create or replace view public.enrollment_history_columns with (security_invoker=true) as
select h.*, jsonb_build_object('student_id',e.student_id,'student',jsonb_build_object('full_name',s.full_name,'student_code',s.student_code)) enrollment,
jsonb_build_object('name',fb.name) from_batch,jsonb_build_object('name',tb.name) to_batch,jsonb_build_object('full_name',pr.full_name) actor,
s.full_name||' '||s.student_code student_text,
concat_ws(' ',h.event_type,h.previous_status,h.new_status) action_text,
concat_ws(' ',fb.name,tb.name) batch_text,coalesce(pr.full_name,h.changed_by::text,'System') actor_text,
(h.created_at at time zone coalesce((select timezone from public.academy_settings where id=true),'Asia/Kolkata'))::date recorded_date
from public.enrollment_history h join public.enrollments e on e.id=h.enrollment_id join public.students s on s.id=e.student_id
left join public.batches fb on fb.id=h.from_batch_id left join public.batches tb on tb.id=h.to_batch_id left join public.profiles pr on pr.id=h.changed_by;
grant select on public.enrollment_history_columns to authenticated;
commit;
