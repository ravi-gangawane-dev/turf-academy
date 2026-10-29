## Reference-match revision

The latest user requested the supplied screenshot composition exactly. On desktop, the approved Dashboard-2 artwork is rendered unchanged and clipped to the non-interactive left branding panel, including its horizontal logo, text, feature cards, player and stadium. Accessible equivalent content remains in HTML. The actual form is live HTML on the right, with matching title, card placement, field sizing and green-to-navy button. A static English label indicates the current language; it does not pretend to open an unavailable translation selector. Google remains omitted because no configured handler exists. These are intentional functional differences from the screenshot.

At the reference size (1672x941), see `docs/screenshots/login/login-reference-1672.png`. At taller aspect ratios, artwork preserves its proportions with navy continuation beneath rather than cropping the face. Mobile/tablet retain the responsive live hero and original stadium asset. Latest checks: all eight responsive widths pass, 15 login tests pass, production build passes. Authentication logic remains unchanged.

The original design-stage notes below describe the earlier version; the reference-match revision above supersedes its desktop layout/title description.

# Login redesign - 28 October 2026

## Delivered

Redesigned the existing standalone login page with a 57%/43% desktop split, academy-green/navy styling, the supplied cricketer/stadium art, original academy logo, compact feature highlights, and a white authentication surface. Mobile retains the hero and uses an overlapping card with rounded top corners. Tablet positioning keeps the player's face visible. Short screens scroll vertically; controls use at least 44px touch areas and mobile inputs use 16px text to avoid focus zoom.

Original logo and source artwork are unchanged. `academy-stadium.webp` is a lossless encoding of the supplied Blue Cricket Stadium Wallpaper: 1,909,161 bytes to 1,383,928 bytes (27.5% smaller); decoded RGBA pixels were compared and match exactly. The reference dashboard image was used for composition guidance, not as a flattened login UI. The provided back-facing artwork does not reveal the left chest; no logo or different character was synthesized. No separate master character sheet/mobile reference was available in the supplied folder.

## Files changed / added

- `src/app/features/auth/login-page.html`: new responsive structure; accessible form/error/status markup; removed nonfunctional Google and language buttons.
- `src/app/features/auth/login-page.scss`: responsive layout, brand tokens, form states, focus styles, safe-area padding, reduced-motion treatment.
- `src/app/features/auth/login-page.ts`: reused RouterLink for recovery; duplicate-submit guard only. AuthService and guards unchanged.
- `src/app/features/auth/login-page.spec.ts`: validation, pending/error states, password toggle, remember-value forwarding, session expiry, return URLs and role-routing tests.
- `public/branding/login/academy-stadium.webp`: lossless optimized artwork. Original PNG assets retained.
- `docs/screenshots/login/login-1440.png`: desktop screenshot.
- `docs/screenshots/login/login-1024.png`: compact desktop screenshot.
- `docs/screenshots/login/login-768.png`: tablet screenshot.
- `docs/screenshots/login/login-390.png`: mobile screenshot.
- This report.

## Reused implementation

Angular Reactive Forms and existing validators, AuthService/Supabase sign-in and profile authorization, existing route guards and role redirect/splash pages, RouterLink, PrimeIcons and app typography/theme variables. No dependencies, new auth service, role selector, seed accounts, backend changes, RLS changes, or production mock responses added.

Successful sessions still use the backend profile role and existing mappings: admin -> `/redirect/admin`, coach -> `/redirect/coach`, receptionist -> `/redirect/reception`, parent -> `/redirect/parent`. These existing intermediate pages and guards continue to handle dashboard navigation. Local return URLs remain supported; external URLs are rejected.

## QA results

| Check | Result |
|---|---|
| Widths 320, 375, 390, 430, 768, 1024, 1440, 1920 | PASS: no horizontal overflow; screenshots reviewed at mobile/tablet/desktop |
| Original logo / same player | PASS: supplied assets reused; artwork losslessly encoded |
| Asset loading | PASS: decoded hero image before screenshot; explicit image dimensions |
| Short viewport / mobile scroll | PASS at 390x500 |
| Email/password validation | PASS: inline messages and aria-describedby/aria-invalid |
| Password visibility | PASS: keyboard-focusable toggle with changing accessible name |
| Loading / repeated submit / disabled button | PASS: pending text and aria-busy; duplicate request blocked |
| Invalid credentials / network failure / inactive account | PASS in controlled unit tests; network failure also simulated in isolated browser |
| Session-expired message | PASS in browser and unit tests |
| Forgot Password | PASS: existing recovery route opens; no real recovery email sent |
| Admin/Coach/Receptionist/Parent redirects | PASS unit tests against existing AuthService role mapping |
| Auth and role guards | PASS existing guard tests |
| Remember me | PARTIAL: checkbox and form value work; existing Supabase login ignores this flag and continues its configured persistent-session behavior |
| Google sign-in | NOT AVAILABLE: old button had no handler; removed rather than advertising an unsupported flow |
| Language selector | NOT AVAILABLE: old placeholder had no behavior; removed |
| Existing authenticated-session restoration | Implementation unchanged; not revalidated through real password login in this UI-only task |
| Live credentials for all four roles | NOT RUN: no new accounts created; reset had removed test accounts, and retained-admin password is not available |
| Tests | PASS: 19 login/auth tests plus 7 auth/role-guard tests (26 total) |
| Production build | PASS |

Remember-me persistence requires a separate reviewed change to auth session storage. It was not silently implemented in a UI-only change. Authentication remains the real Supabase integration; no role or account is hardcoded into the login implementation.
