# P0 dialog and theme source review — 2026-11-04

> **Current state (2026-11-15).** The findings table below is the original 2026-11-04 evidence and is kept for history; several of the rows it lists (photo editor keyboard lifecycle, busy guards, crop affordances, repeated global imports) have since been addressed. For the present state of the code, and the checks that back it, see §12 (“Fix log”) of [UI_ARCHITECTURE_AUDIT_2026-11-14.md](./UI_ARCHITECTURE_AUDIT_2026-11-14.md). Authenticated browser acceptance is still pending for the dialog work.

This is source evidence, not authenticated browser acceptance. No application code was changed during this review.

Follow-up: the findings below were subsequently corrected at the user's request. See the tracker section “Corrections and verification” for implementation and test results. The table preserves the original findings; authenticated browser acceptance remains pending.

| Finding | Evidence | Status |
| --- | --- | --- |
| Global imports repeat | `src/styles.css` imported Tailwind at lines 1/8, PrimeIcons at 4/9, foundations at 5/11. | **Fixed.** `src/styles.css` now has one import per stylesheet (lines 1-7), verified on 2026-11-16. |
| Photo editor lacks modal keyboard lifecycle | `profile-photo-upload.html` declared dialog semantics without `ModalFocus`. | **Fixed in source.** The component now imports `ModalFocus` and binds `appModalFocus` with `[modalBusy]`; browser acceptance (Tab cycling, Escape, focus restore, scroll lock) still pending. |
| Photo editor closes before persistence completes | `saveAndClose()` hid the editor without awaiting the parent save. | **Fixed in source.** `saveAndClose()` is async and the host drives `saving`, so the editor stays open until the parent save resolves; delayed/rejected-save acceptance still pending in a browser. |
| Photo editor can dismiss while busy | Close/Cancel called `close()` unguarded. | **Fixed in source.** Close, Cancel, Escape (`close()`, line 343) and the save button all return early while `saving || processing()`. |
| Crop handles are decorative | Crop-grid spans had no input handlers. | **Resolved by design.** The crop grid is now `aria-hidden` decoration over a documented fixed square crop: zoom, rotate and keyboard pan are the real controls, and the help copy states the behaviour. |
| Shared dialog keyboard behavior exists | `interaction-dialog/modal-focus.ts` provides initial focus, Tab wrapping, busy-aware Escape, scroll locking and focus restoration. | **Present and imported** by the photo editor and the attendance/batch/fee dialogs; runtime acceptance in a real browser is still outstanding. |

Preserve the photo shell's current `width: 100%`, `max-width: 760px`, `max-height: 90vh`, and 600px layout breakpoint during later corrections. Preserve the official logo, blue/sky-blue uniforms, permissions and business behavior.

The existing unstaged action-color changes in `src/styles.css` were present before this audit resumed. New captures describe the current working tree, not a pristine pre-change baseline.

Authenticated role screens, photo-save outcomes and protected dialog keyboard checks still require working test-account access. The previous tracker records rejected credentials for all four roles; this review did not retry those credentials or change accounts.
