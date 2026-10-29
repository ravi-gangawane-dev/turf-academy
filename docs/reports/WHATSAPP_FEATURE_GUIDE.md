# Attendance WhatsApp Click-to-Chat

The staff attendance workspace uses Click-to-Chat for parent attendance messages. This flow does not require a Twilio template or an API delivery request.

## Staff workflow

1. Open Attendance > Check In / Check Out.
2. Select students, or identify a student by QR code, and confirm attendance.
3. Review each saved student's notification card, including the linked parent, number, and complete message with the saved attendance time.
4. Choose Open WhatsApp for parent.
5. Review the message in WhatsApp and press Send there.

The app then shows: WhatsApp opening requested. Press Send in WhatsApp. Delivery unconfirmed. It never marks a Click-to-Chat notification as sent or delivered. If a browser blocks the new window, allow WhatsApp to open and click again.

For attendance already saved today, use Prepare WhatsApp in Recent Attendance Activity. This reads the saved event without recording attendance again. The table shows the five most recent events in the loaded roster.

Bulk attendance creates one card per successfully saved student. If a later attendance save fails, earlier successful cards remain available. Open and send each message individually.

## Validation and errors

- Recipients are read through student_parents, prioritizing the active primary parent. Students need no separate number.
- An explicit parent WhatsApp opt-out prevents preparation.
- Invalid phone numbers or timestamps disable the button and display an error.
- Parent lookup failures display a notification error without undoing attendance. Review the linked parent or prepare the saved event again.
- Offline attendance prepares no premature message. After synchronization, use Prepare WhatsApp on the saved event.
- Opening errors are displayed and logged. Click-to-Chat provides no delivery receipt to the application.

Rahul's +919130451715 normalizes to the URL recipient 919130451715. The service builds https://wa.me/919130451715?text=... with URL-encoded message text. Application recipient lookup is dynamic.

## Implementation and verification

WhatsappAction provides the preview and opening action. The attendance repository reads saved timestamps and the linked parent. QR/bulk attendance and the manual attendance component share this UI.

Previous API notification failures remain in the log. Click-to-Chat does not alter or retry them.

Verified on 21 October 2026:

- 18 targeted tests passed: bulk/partial saves, missing parents, offline queueing, invalid numbers, saved-event preparation, and opening status.
- The Angular live build compiled successfully.
- Both Sunil messages were prepared through visible buttons using Rahul's number and saved event times.
- Desktop/mobile card checks passed, with no page-level horizontal overflow at 390px.

Run scripts/verify-patil-whatsapp-ui.mjs against the local live server on port 4202 to repeat saved-event checks. It opens WhatsApp links but does not press Send or submit API messages.

Changes are in local source; hosted deployment is separate.
