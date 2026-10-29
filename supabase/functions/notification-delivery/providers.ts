export interface NotificationMessage { id: string; channel: string; recipient: string; subject: string | null; body: string; profile_image_url?: string | null; provider_message_id?: string | null; }
export interface ProviderConfig { resendKey?: string; emailFrom?: string; twilioSid?: string; twilioToken?: string; smsFrom?: string; whatsappFrom?: string; whatsappContentSid?: string; whatsappMediaContentSid?: string; defaultCountryCode?: string; }
export class DeliveryError extends Error { constructor(message: string, readonly uncertain = false) { super(message); } }
export function availableChannels(c: ProviderConfig): string[] { return ['in_app', ...(c.resendKey && c.emailFrom ? ['email'] : []), ...(c.twilioSid && c.twilioToken && c.smsFrom ? ['sms'] : []), ...(c.twilioSid && c.twilioToken && c.whatsappFrom ? ['whatsapp'] : [])]; }
export function phoneNumber(input: string, countryCode = '91'): string {
    const value = input.replace(/[\s()-]/g, '');
    if (/^\+[1-9]\d{7,14}$/.test(value)) return value;
    if (/^\d{10}$/.test(value) && /^\d{1,3}$/.test(countryCode)) return '+' + countryCode + value;
    throw new DeliveryError('Recipient phone must use E.164 format.');
}
async function read(response: Response): Promise<Record<string, unknown>> { try { return await response.json(); } catch { throw new DeliveryError('Provider response could not be read; check provider records before retrying.', true); } }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!)); }
export async function deliver(message: NotificationMessage, config: ProviderConfig, request: typeof fetch = fetch): Promise<string> {
    if (!['email', 'sms', 'whatsapp'].includes(message.channel)) throw new DeliveryError('This channel does not support external delivery.');
    if (!availableChannels(config).includes(message.channel)) throw new DeliveryError('Provider is not configured for ' + message.channel + '.');
    let response: Response;
    try {
        if (message.channel === 'email') {
            const heading = escapeHtml(message.subject || 'Academy notification');
            const body = escapeHtml(message.body).replace(/\r?\n/g, '<br>');
            const profileImage = message.profile_image_url ? '<img src="' + escapeHtml(message.profile_image_url) + '" alt="" width="96" height="96" style="display:block;width:96px;height:96px;border-radius:50%;object-fit:cover;margin:0 auto 20px;">' : '';
            const html = '<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Arial,sans-serif;color:#24332b;text-align:center;">' + profileImage + '<p style="margin:0 0 12px;color:#287a48;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">From Turf Academy</p><h1 style="margin:0 0 16px;font-size:24px;">' + heading + '</h1><p style="margin:0;color:#53645b;font-size:16px;line-height:1.6;">' + body + '</p></div>';
            response = await request('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + config.resendKey, 'Content-Type': 'application/json', 'Idempotency-Key': 'notification/' + message.id }, body: JSON.stringify({ from: config.emailFrom, to: [message.recipient], subject: message.subject || 'Academy notification', text: message.body, html }), signal: AbortSignal.timeout(20000) });
        } else {
            const whatsapp = message.channel === 'whatsapp';
            const body = new URLSearchParams({ To: (whatsapp ? 'whatsapp:' : '') + phoneNumber(message.recipient, config.defaultCountryCode), From: whatsapp ? config.whatsappFrom! : config.smsFrom! });
            if (whatsapp && (config.whatsappContentSid || config.whatsappMediaContentSid)) {
                const includeProfileImage = !!message.profile_image_url && !!config.whatsappMediaContentSid;
                const contentSid = includeProfileImage ? config.whatsappMediaContentSid : config.whatsappContentSid;
                if (!contentSid?.trim()) throw new DeliveryError('A text WhatsApp template is required when no profile photo is available.');
                body.set('ContentSid', contentSid);
                body.set('ContentVariables', JSON.stringify({ '1': message.subject || 'Academy notification', '2': message.body, ...(includeProfileImage ? { '3': message.profile_image_url } : {}) }));
            }
            else body.set('Body', (message.subject ? message.subject + '\n' : '') + message.body);
            response = await request('https://api.twilio.com/2010-04-01/Accounts/' + config.twilioSid + '/Messages.json', { method: 'POST', headers: { Authorization: 'Basic ' + btoa(config.twilioSid + ':' + config.twilioToken), 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(20000) });
        }
    } catch (e) { if (e instanceof DeliveryError) throw e; throw new DeliveryError('Delivery response was lost. Check provider records before retrying.', true); }
    const payload = await read(response);
    if (!response.ok) throw new DeliveryError('Provider rejected the message (' + response.status + '): ' + String(payload['message'] ?? payload['error'] ?? 'Unknown error'), response.status >= 500 || response.status === 408);
    const id = payload[message.channel === 'email' ? 'id' : 'sid']; if (typeof id !== 'string' || !id.trim()) throw new DeliveryError('Provider accepted the request without a message ID. Reconcile before retrying.', true);
    return id;
}
export async function deliveryStatus(message: NotificationMessage, config: ProviderConfig, request: typeof fetch = fetch): Promise<'sent' | 'delivered' | 'failed'> {
    if (!message.provider_message_id?.trim()) throw new DeliveryError('No provider message ID is recorded.');
    const id = encodeURIComponent(message.provider_message_id);
    const response = await request(message.channel === 'email' ? 'https://api.resend.com/emails/' + id : 'https://api.twilio.com/2010-04-01/Accounts/' + config.twilioSid + '/Messages/' + id + '.json', { headers: { Authorization: message.channel === 'email' ? 'Bearer ' + config.resendKey : 'Basic ' + btoa(config.twilioSid + ':' + config.twilioToken) }, signal: AbortSignal.timeout(20000) });
    const data = await read(response); if (!response.ok) throw new DeliveryError('Delivery status could not be retrieved (' + response.status + ').');
    const status = String(data[message.channel === 'email' ? 'last_event' : 'status']);
    if (['delivered', 'read', 'opened', 'clicked'].includes(status)) return 'delivered';
    if (['failed', 'undelivered', 'bounced', 'complained', 'canceled'].includes(status)) return 'failed';
    if (['accepted', 'queued', 'sending', 'sent'].includes(status)) return 'sent';
    // Keep the last stored evidence when a provider introduces an unsupported state.
    // The status endpoint must not turn an unknown response into a successful send.
    throw new DeliveryError('Provider returned an unrecognized delivery status. Existing delivery evidence was preserved.');
}
