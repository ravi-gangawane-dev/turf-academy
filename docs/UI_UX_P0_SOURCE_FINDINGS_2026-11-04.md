# P0 dialog and theme source review — 2026-11-04

This is source evidence, not authenticated browser acceptance. No application code was changed during this review.

Follow-up: the findings below were subsequently corrected at the user's request. See the tracker section “Corrections and verification” for implementation and test results. The table preserves the original findings; authenticated browser acceptance remains pending.

| Finding | Evidence | Follow-up acceptance |
| --- | --- | --- |
| Global imports repeat | `src/styles.css` imports Tailwind at lines 1/8, PrimeIcons at 4/9, foundations at 5/11. | P1: consolidate only after checking cascade and comparing screenshots. |
| Photo editor lacks modal keyboard lifecycle | `profile-photo-upload.html` declares dialog semantics, but its component does not import `ModalFocus` or implement initial focus, Tab containment, Escape handling, focus restoration, or scroll locking. | P2: open from keyboard; verify forward/backward Tab, Escape, restored trigger focus, and background scroll. |
| Photo editor closes before persistence completes | `ProfilePhotoUpload.saveAndClose()` emits `fileSelected` and `save`, then immediately sets `open = false`; the void output does not await the parent save. | P2: delayed success and rejected save must preserve the intended draft and expose a recoverable error. |
| Photo editor can dismiss while busy | Close and Cancel call `close()` without a busy guard; `close()` unconditionally hides the editor. | P2: exercise close, cancel and Escape while processing and saving. |
| Crop handles are decorative | Crop-grid spans have no input handlers; `render(true)` uses fixed crop coordinates. | P2: reconcile the visible crop affordance with supported interaction and verify exported framing. |
| Shared dialog keyboard behavior exists | `interaction-dialog/modal-focus.ts` provides initial focus, Tab wrapping, busy-aware Escape, body scroll locking and focus restoration; shared `DialogHost` imports it. | Verify in a real browser, including stacked dialogs and hidden/disabled controls; source presence is not a passing runtime result. |

Preserve the photo shell's current `width: 100%`, `max-width: 760px`, `max-height: 90vh`, and 600px layout breakpoint during later corrections. Preserve the official logo, blue/sky-blue uniforms, permissions and business behavior.

The existing unstaged action-color changes in `src/styles.css` were present before this audit resumed. New captures describe the current working tree, not a pristine pre-change baseline.

Authenticated role screens, photo-save outcomes and protected dialog keyboard checks still require working test-account access. The previous tracker records rejected credentials for all four roles; this review did not retry those credentials or change accounts.
