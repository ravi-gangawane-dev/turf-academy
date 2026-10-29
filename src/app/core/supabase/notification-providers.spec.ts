import { availableChannels, deliver, DeliveryError, deliveryStatus, phoneNumber, ProviderConfig } from '../../../../supabase/functions/notification-delivery/providers';
const config:ProviderConfig={resendKey:'test-key',emailFrom:'Academy <academy@example.test>',twilioSid:'ACtest',twilioToken:'test-token',smsFrom:'+15550000001',whatsappFrom:'whatsapp:+15550000002',whatsappContentSid:'HXapproved'};
const message={id:'test-notification',channel:'email',recipient:'parent@example.test',subject:'Training update',body:'Training starts at 6.'};
describe('Notification providers',()=>{
 it.each(['', '   '])('treats a blank accepted message ID as uncertain: %j', async id => {
   const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id })));
   await expect(deliver(message, config, request)).rejects.toMatchObject({ uncertain: true });
   expect(request).toHaveBeenCalledTimes(1);
 });
 it('blocks media-only WhatsApp configuration without a photo before contacting the provider', async () => {
   const request = vi.fn();
   await expect(deliver({ ...message, channel: 'whatsapp', recipient: '9876543210' },
     { ...config, whatsappContentSid: undefined, whatsappMediaContentSid: 'HXmedia' }, request))
     .rejects.toMatchObject({ uncertain: false });
   expect(request).not.toHaveBeenCalled();
 });
 it('never routes in-app messages to an external provider', async () => {
   const request = vi.fn();
   await expect(deliver({ ...message, channel: 'in_app', recipient: '9876543210' }, config, request))
     .rejects.toMatchObject({ uncertain: false });
   expect(request).not.toHaveBeenCalled();
 });
 it('rejects whitespace-only IDs before looking up provider status', async () => {
   const request = vi.fn();
   await expect(deliveryStatus({ ...message, provider_message_id: '   ' }, config, request)).rejects.toThrow('No provider message ID');
   expect(request).not.toHaveBeenCalled();
 });
 it.each([{}, { last_event: 'future-provider-state' }])('rejects unsupported provider evidence instead of claiming sent: %j', async payload => {
   const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload)));
   await expect(deliveryStatus({ ...message, provider_message_id: 'email-1' }, config, request))
     .rejects.toThrow('Existing delivery evidence was preserved');
 });
 it('sends plain text email with a stable idempotency key',async()=>{const request=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'email-1'}),{status:200}));expect(await deliver(message,config,request)).toBe('email-1');const options=request.mock.calls[0][1] as RequestInit;expect(options.headers).toMatchObject({'Idempotency-Key':'notification/test-notification'});expect(JSON.parse(String(options.body))).toMatchObject({to:['parent@example.test'],text:message.body,from:config.emailFrom});});
 it('includes the profile photo and academy sender in birthday email HTML',async()=>{const request=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'email-photo-1'}),{status:200}));await deliver({...message,subject:'Happy birthday, Aarav!',body:'Turf Academy wishes Aarav a very happy birthday!',profile_image_url:'https://storage.example.test/photo?x=1&y=2'},config,request);const payload=JSON.parse(String(request.mock.calls[0][1].body));expect(payload.html).toContain('From Turf Academy');expect(payload.html).toContain('Turf Academy wishes Aarav');expect(payload.html).toContain('https://storage.example.test/photo?x=1&amp;y=2');});
 it('uses an approved WhatsApp template and normalized recipient',async()=>{const request=vi.fn().mockResolvedValue(new Response(JSON.stringify({sid:'SMsent'}),{status:201}));await deliver({...message,channel:'whatsapp',recipient:'9876543210'},config,request);const body=request.mock.calls[0][1].body as URLSearchParams;expect(body.get('To')).toBe('whatsapp:+919876543210');expect(body.get('ContentSid')).toBe('HXapproved');expect(JSON.parse(body.get('ContentVariables')!)).toEqual({'1':message.subject,'2':message.body});expect(body.has('Body')).toBe(false);});
 it('sends WhatsApp birthday text when a media template is not configured',async()=>{const request=vi.fn().mockResolvedValue(new Response(JSON.stringify({sid:'SMtext'}),{status:201}));const photoMessage={...message,channel:'whatsapp',recipient:'+919876543210',profile_image_url:'https://storage.example.test/signed/photo'};await deliver(photoMessage,config,request);const body=request.mock.calls[0][1].body as URLSearchParams;expect(body.get('ContentSid')).toBe(config.whatsappContentSid);expect(JSON.parse(body.get('ContentVariables')!)).toEqual({'1':message.subject,'2':message.body});});
 it('uses the approved WhatsApp media template for profile photos when configured',async()=>{const request=vi.fn().mockResolvedValue(new Response(JSON.stringify({sid:'SMmedia'}),{status:201}));const photoMessage={...message,channel:'whatsapp',recipient:'+919876543210',profile_image_url:'https://storage.example.test/signed/photo'};const mediaConfig={...config,whatsappMediaContentSid:'HXmedia'};await deliver(photoMessage,mediaConfig,request);const body=request.mock.calls[0][1].body as URLSearchParams;expect(body.get('ContentSid')).toBe('HXmedia');expect(JSON.parse(body.get('ContentVariables')!)).toEqual({'1':message.subject,'2':message.body,'3':photoMessage.profile_image_url});});
 it('sends free-form WhatsApp text when no template is configured',async()=>{const request=vi.fn().mockResolvedValue(new Response(JSON.stringify({sid:'SMfree'}),{status:201}));const freeConfig={...config,whatsappContentSid:undefined,whatsappMediaContentSid:undefined};expect(availableChannels(freeConfig)).toContain('whatsapp');await deliver({...message,channel:'whatsapp',recipient:'9876543210'},freeConfig,request);const body=request.mock.calls[0][1].body as URLSearchParams;expect(body.get('To')).toBe('whatsapp:+919876543210');expect(body.has('ContentSid')).toBe(false);expect(body.get('Body')).toBe(message.subject+'\n'+message.body);});
 it('blocks unconfigured channels before any provider request',async()=>{const request=vi.fn();await expect(deliver(message,{},request)).rejects.toThrow('not configured');expect(request).not.toHaveBeenCalled();expect(availableChannels({})).toEqual(['in_app']);});
 it('marks lost responses uncertain and never silently resends',async()=>{const request=vi.fn().mockRejectedValue(new TypeError('connection lost'));try{await deliver({...message,channel:'sms',recipient:'+919876543210'},config,request);expect.fail('Expected failure');}catch(e){expect(e).toBeInstanceOf(DeliveryError);expect((e as DeliveryError).uncertain).toBe(true);}expect(request).toHaveBeenCalledTimes(1);});
 it('keeps accepted messages sent until delivery is confirmed',async()=>{const sent=vi.fn().mockResolvedValue(new Response(JSON.stringify({last_event:'sent'})));const delivered=vi.fn().mockResolvedValue(new Response(JSON.stringify({last_event:'delivered'})));expect(await deliveryStatus({...message,provider_message_id:'email-1'},config,sent)).toBe('sent');expect(await deliveryStatus({...message,provider_message_id:'email-1'},config,delivered)).toBe('delivered');});
 it('rejects ambiguous phone numbers',()=>{expect(()=>phoneNumber('123')).toThrow('E.164');expect(phoneNumber('+44 7700 900123')).toBe('+447700900123');});
});
