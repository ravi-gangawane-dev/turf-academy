import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.115.0';
import { availableChannels, deliver, deliveryStatus, DeliveryError, type ProviderConfig, type NotificationMessage } from './providers.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const config=():ProviderConfig=>({resendKey:Deno.env.get('RESEND_API_KEY'),emailFrom:Deno.env.get('NOTIFICATION_EMAIL_FROM'),twilioSid:Deno.env.get('TWILIO_ACCOUNT_SID'),twilioToken:Deno.env.get('TWILIO_AUTH_TOKEN'),smsFrom:Deno.env.get('TWILIO_SMS_FROM'),whatsappFrom:Deno.env.get('TWILIO_WHATSAPP_FROM'),whatsappContentSid:Deno.env.get('TWILIO_WHATSAPP_CONTENT_SID'),whatsappMediaContentSid:Deno.env.get('TWILIO_WHATSAPP_MEDIA_CONTENT_SID'),defaultCountryCode:Deno.env.get('NOTIFICATION_COUNTRY_CODE')||'91'});
async function profileImageUrl(admin:ReturnType<typeof createClient>,notification:Record<string,unknown>):Promise<string|undefined>{
 const profile=notification['student_id']?{table:'students',id:notification['student_id'],bucket:'student-photos'}
  :notification['coach_id']?{table:'coaches',id:notification['coach_id'],bucket:'coach-photos'}
  :notification['parent_id']?{table:'parents',id:notification['parent_id'],bucket:'parent-photos'}:null;
 if(!profile)return;
 const {data,error}=await admin.from(profile.table).select('photo_path,photo_url').eq('id',profile.id).maybeSingle();
 if(error)throw error;
 if(typeof data?.['photo_path']==='string'&&data['photo_path']){
  const signed=await admin.storage.from(profile.bucket).createSignedUrl(data['photo_path'],3600);
  if(signed.error)throw signed.error;
  return signed.data.signedUrl;
 }
 const photoUrl=data?.['photo_url'];
 if(typeof photoUrl==='string'&&photoUrl){
  const parsedUrl=new URL(photoUrl);
  if(parsedUrl.protocol!=='https:')throw new Error('Stored profile image URL must use HTTPS.');
  return photoUrl;
 }
}
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 const authorization=request.headers.get('Authorization');if(!authorization)return json({error:'Sign in required.'},401);
 const url=Deno.env.get('SUPABASE_URL')!;
 const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}}});
 const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await caller.auth.getUser();if(error||!user)return json({error:'Invalid session.'},401);
 const {data:profile}=await admin.from('profiles').select('role,is_active,status').eq('id',user.id).single();
 if(!profile||!profile.is_active||profile.status!=='active'||!['admin','receptionist'].includes(profile.role))return json({error:'Staff access required.'},403);
 try{
  const body=await request.json();const settings=config();
  if(body.action==='configuration')return json({channels:availableChannels(settings)});
  if(!['send','status'].includes(body.action)||typeof body.id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.id))return json({error:'Valid action and notification ID required.'},400);
  const {data:notification,error:loadError}=await admin.from('notifications').select('*').eq('id',body.id).single();
  if(loadError||!notification)return json({error:'Notification not found.'},404);
  if(notification.channel==='in_app')return json({error:'In-app notifications are already available to the parent.'},400);
  if(!availableChannels(settings).includes(notification.channel))return json({error:'Configure the provider secrets before sending this channel.'},409);
  if(body.action==='status'){
   const status=await deliveryStatus(notification as NotificationMessage,settings);
   const r=await admin.from('notifications').update({status,failure_reason:status==='failed'?'Provider reports delivery failure.':null,updated_at:new Date().toISOString()}).eq('id',body.id);
   if(r.error)throw r.error;return json({status});
  }
  if(notification.provider_message_id)return json({error:'This message was already submitted. Refresh its delivery status.'},409);
  const claim=await admin.rpc('claim_notification',{p_id:body.id});if(claim.error)throw claim.error;
  const row=claim.data?.[0];if(!row)return json({error:'Message is being processed, its outcome needs reconciliation, or the channel is disabled.'},409);
  try{
   const includeProfileImage=row.channel==='email'||(row.channel==='whatsapp'&&!!settings.whatsappMediaContentSid);
   const imageUrl=includeProfileImage?await profileImageUrl(admin,row):undefined;
   const message:NotificationMessage={...row,...(imageUrl?{profile_image_url:imageUrl}:{})};
   const providerId=await deliver(message,settings);
   const r=await admin.from('notifications').update({provider_message_id:providerId,status:'sent',sent_at:new Date().toISOString(),delivery_claimed_at:null,delivery_uncertain:false,updated_at:new Date().toISOString()}).eq('id',body.id);
   if(r.error)throw new DeliveryError('Provider accepted this message but saving its ID failed. Reconcile in the provider dashboard.',true);
   return json({status:'sent'});
  }catch(e){
   const uncertain=!(e instanceof DeliveryError)||e.uncertain;
   const message=e instanceof Error?e.message:'Delivery failed.';
   await admin.from('notifications').update({status:'failed',failure_reason:message,delivery_uncertain:uncertain,delivery_claimed_at:uncertain?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',body.id);
   return json({error:message,uncertain},uncertain?409:400);
  }
 }catch(e){return json({error:e instanceof Error?e.message:'Notification operation failed.'},400);}
});
