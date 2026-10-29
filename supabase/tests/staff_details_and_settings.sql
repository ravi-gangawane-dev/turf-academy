begin;
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='admin' and is_active limit 1),true);
do $$
declare parent_id uuid; coach_id uuid; result jsonb; message_id uuid; count_before bigint;
begin
 select id into strict parent_id from public.parents where status='active' limit 1;
 select id into strict coach_id from public.coaches where status='active' limit 1;
 perform public.get_parent_activity(parent_id,0,20);
 perform public.get_coach_attendance_summary(coach_id,current_date-30,current_date);
 perform public.search_academy('academy');
 result:=public.get_dashboard_analytics();
 if jsonb_array_length(result->'attendance')<>7 or jsonb_array_length(result->'collections')<>6 then raise exception 'analytics missing periods'; end if;
 begin update public.academy_settings set timezone='Not/AZone';raise exception 'invalid timezone accepted';exception when others then if sqlerrm<>'invalid_timezone' then raise;end if;end;
 update public.academy_settings set notification_channels=array['in_app'],fee_due_day=17;
 message_id:=public.queue_parent_message(parent_id,'in_app','Test message','Persistent message body','settings-message-test');
 if public.queue_parent_message(parent_id,'in_app','Test message','Persistent message body','settings-message-test')<>message_id then raise exception 'message retry duplicated';end if;
 if (select body from public.notifications where id=message_id)<>'Persistent message body' then raise exception 'message not persisted';end if;
 begin perform public.queue_parent_message(parent_id,'email','Email test','Disabled channel','settings-disabled-test');raise exception 'disabled channel accepted';exception when others then if sqlerrm<>'notification_channel_disabled' then raise;end if;end;
 if has_function_privilege('authenticated','public.claim_notification(uuid)','execute') then raise exception 'authenticated can claim notifications';end if;
 perform set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='parent' and is_active limit 1),true);
 begin perform public.search_academy('academy');raise exception 'parent can search staff data';exception when insufficient_privilege then null;end;
 begin perform public.queue_parent_message(parent_id,'in_app','Denied test','Denied body','settings-denied');raise exception 'parent can queue staff message';exception when insufficient_privilege then null;end;
end $$;
rollback;
