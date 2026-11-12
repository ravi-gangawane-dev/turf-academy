# Payment Management Module — Deep Analysis & Consolidation Audit

Date: 2026-11-02
Scope: `/payments`, `/payments/new`, `/payments/partial`, `/payments/full`,
`/payments/receipts`, `/payments/history`, `/payments/refunds`, plus every other
surface that reads or writes payment data (fees module, parent portal, student
details, dashboard).
Status: **analysis only — nothing implemented, no data touched.**

---

## 0. Headline finding

All seven "pages" are **one Angular component** (`PaymentsPage`) mounted seven
times with a different `data.paymentView` string, plus **one PostgreSQL RPC**
(`get_payment_list_page`) whose `p_view` argument decides the row filter. There
is no separate code per page to consolidate — the duplication is in
*information architecture and query semantics*, not in seven parallel
codebases. That makes the consolidation cheap and low risk, and it also means
the seven tabs survive only because the router and a nav array say so.

Two of the seven views (`list` and `history`) are **literally the same query**
(both fall through to `else true`). Receipts is the whole ledger with a
non-null receipt. "Partially Paid" / "Fully Paid" do not filter charges at all —
they list *payments* whose parent charge is currently partially or fully
settled. "Refunds" lists every successful payment in the academy.

---

## 1. Page-by-page audit

Routes: `src/app/app.routes.ts:672-728`. Every staff payment route carries
`permission: 'fees:write'`; only `payments/refunds` adds
`canActivate: [roleGuard]` with `roles: ['admin']`.

Component + view flag:

| Route | `data.paymentView` | Guard | Route permission |
|---|---|---|---|
| `/payments` | `list` | — | `fees:write` |
| `/payments/new` | `new` | — | `fees:write` |
| `/payments/partial` | `partial` | — | `fees:write` |
| `/payments/full` | `full` | — | `fees:write` |
| `/payments/receipts` | `receipts` | — | `fees:write` |
| `/payments/history` | `history` | — | `fees:write` |
| `/payments/refunds` | `refunds` | `roleGuard` admin | `fees:write` |

### 1.1 Payment History — `/payments`

- Purpose: staff ledger of recorded payments.
- UI: `app-page-hero` (title via a nested ternary chain,
  `payments-page.html:3-5`), `app-payment-view-navigation` (7 tab links),
  4 `app-summary-metric-card`s, `app-data-table` wrapping a 7-column table with
  6 `app-column-filter` cells, `app-table-tools` export, `app-sortable-header`
  on receipt/student/date/mode/status/amount, one action column
  (print receipt, download receipt PDF, refund receipt for refunded rows).
- Data: `PaymentsService.ledgerPage()` → RPC `get_payment_list_page`
  (`src/app/core/supabase/domain-services.ts:1538`) with `p_view='list'`.
- Working: paging, page size, column filters, sorting, CSV export, receipt
  print/PDF, empty + loading + error states, per-row actions.
- Issues:
  - No global search box and no status dropdown: `setSearch()`,
    `setStatus()`, `statusFilter`, `resetFilters()` exist in the component
    (`payments-page.ts:154-186`) but **nothing in the template calls them**.
    Filtering happens only through column filters, which map to
    `p_columns` — so `p_search`/`p_status` are always `''`/`all`.
  - `message` signal (`payments-page.ts:94`) is written/cleared but never
    rendered anywhere — dead state left over from the toast migration.
  - The page computes `filteredRows` and `pageRows` as pass-through aliases of
    `rows()` (`payments-page.ts:112-113`); the names imply client-side
    filtering that does not exist.
- Accessibility: table has sortable headers with `aria-sort` support via
  `SortableHeader`, every action button has `aria-label`, hero is an `h1`.
  The table itself has no `<caption>`; the region is labelled only by the
  surrounding page hero.
- Mobile: `payments-page.scss:184` collapses the layout at `800px`; the view
  nav wraps into two rows below `650px` (`payment-view-navigation.scss:30`).

### 1.2 Record Payment — `/payments/new`

- Purpose: post a payment against a student's outstanding monthly charge.
- UI: same hero + nav + the 4 metric cards (which describe the *whole ledger*),
  then a 4-field form: outstanding charge `<select>`, amount, mode
  (cash/upi/card/bank_transfer/online), provider reference
  (`payments-page.html:25-47`). The table is not rendered (`@else` branch).
- Data: `charges()` from `FeesService` (`domain-services.ts:1367`) fills the
  charge dropdown; `PaymentsService.record()` → RPC `record_payment`.
- Working: charge selection auto-fills the outstanding balance
  (`chargeChanged`), server-side amount ceiling, idempotency through
  `MutationAttempt` (`payments-page.ts:76, 130-137`), toast on success,
  form reset only after success.
- Issues:
  - `reload()` runs **before** the user does anything and always loads the
    whole payment ledger (`ledgerPage('new', …)` → `else true` = every
    payment) *and* `feesApi.charges()` which walks every page of
    `monthly_charge_balances` with a `students(*)` join. On this screen the
    ledger result is never displayed.
  - The charge dropdown is not searchable and is rendered from an unfiltered
    list of every charge with a positive balance
    (`payments-page.ts:344-353`). For a large academy this is a very long
    `<select>` and a slow page.
  - No `app-async-state` for the dropdown's loading/empty/failed state.
  - The page is a full-page form for what is a 30-second counter action; the
    same action already exists as a dialog in the fees module.
- Missing: receipt number is not confirmed on screen after saving (the fees
  page does show it); the user is only told "Payment recorded and receipt
  generated."

### 1.3 Partially Paid — `/payments/partial`

- Purpose (as labelled): charges that are partially settled.
- Actual behaviour: lists **payments** whose charge currently has
  `paid_amount > 0 and balance_amount > 0` and whose payment status is
  `successful`/`partially_refunded` (`202610130010_payment_list_query.sql:48`).
- Issues:
  - Label vs content mismatch: the hero says "Partially Paid Charges" but rows
    are individual payments, so a charge with two part-payments produces two
    rows that both claim "partially paid".
  - The same charge can move from `partial` to `full` between page loads, so a
    bookmarked/filtered view is a moving target (documented as intentional in
    `202609240001_payment_accuracy.sql:66`).
- Duplicate of `/payments` with one extra `WHERE` clause; the page is
  otherwise byte-identical (same template branch, same columns, same actions).

### 1.4 Fully Paid — `/payments/full`

- Actual behaviour: payments whose charge currently has `balance_amount = 0`
  and status `successful`/`partially_refunded`.
- Issues: same label/content mismatch as partial. Because the filter reads the
  *charge's current* balance, a charge that was paid and later refunded drops
  out of this view entirely (balance returns to `final_amount`).
- Duplicate of `/payments` with one extra `WHERE` clause.

### 1.5 Receipts — `/payments/receipts`

- Actual behaviour: identical ledger page with `p_view='receipts'` →
  `r.id is not null`. It is not a receipt list: no receipt number search
  entry point beyond the receipt column filter, no receipt date, no document
  view, and no receipt-specific actions (the print/PDF buttons already exist on
  every other view).
- Issues: adds no capability over `/payments`; the only unique thing is the
  row filter. `receiptPath` is mapped into `PaymentRow` (`payments-page.ts:324`)
  but never used by the template — the receipt file path is dead data.

### 1.6 Transaction History — `/payments/history`

- Actual behaviour: `p_view='history'` → `when 'history' then true`, i.e. **the
  full payment ledger — exactly `list`**. This was added in
  `202610220001_payment_history_view.sql` purely to stop a 400
  ("Invalid payment view") after the column-control release dropped the
  `history` token.
- Issues: two nav tabs, two routes, identical query, identical UI, different
  heading. There is no transaction timeline, no status transition history
  (those live in `audit_logs`), no before/after state. The name promises
  something the page does not deliver.

### 1.7 Refunds — `/payments/refunds`

- Purpose: admin-only refund entry point.
- UI: the standard ledger table **plus** a second "Refund actions" card listing
  the current page's payments with a Refund button
  (`payments-page.html:162-186`). Refund dialog with amount ceiling and reason
  validation (`payments-page.html:190-214`). Refund-receipt dialog listing
  `payment_refunds` rows with print/PDF (`payments-page.html:216-...`).
- Data: `p_view='refunds'` → `status in ('successful','partially_refunded','refunded')`
  (i.e. almost every payment ever taken), `PaymentsService.refund()` → RPC
  `refund_payment`, `PaymentsService.refundReceipts(paymentId)`.
- Working: admin guard on the route, server-side `is_admin()` check inside
  `refund_payment` (`202609240001_payment_accuracy.sql:42`), refundable-amount
  ceiling, idempotent retry key `MutationAttempt` (`payments-page.ts:295`),
  refund receipt printing, charge balance recalculated by the RPC.
- Issues:
  - The page title says "Refunds" but the primary list is **payments**; the
    actual refund documents are only reachable one payment at a time through a
    dialog. There is no cross-payment refund register.
  - "Refund actions" iterates `filteredRows()`, which is `rows()` — the
    **current page only** (5 rows by default). Users reasonably expect a
    refunds page to show all refundable items.
  - The refunds view also renders the full ledger table above it, so the same
    payments appear twice on one screen.
  - Two different "refund" concepts share a page with no visual separation:
    *payment status* `refunded` / `partially_refunded` and the *refund
    document* in `payment_refunds`.
- Retain **independent**: the workflow itself must stay admin-only and
  audited (see §2).

---

## 2. Duplicate and overlapping features

### 2.1 Same records, multiple screens (verified)

| Overlap | Evidence |
|---|---|
| `list` ≡ `history` | `...payment_list_query.sql:47-53` both resolve to `else true` / `when 'history' then true` |
| `list` ≈ `refunds` | refunds only excludes `pending`/`failed`, which **no code path ever creates** (see 2.3) |
| `receipts` ⊂ `list` | every successful payment gets a receipt in `record_payment`; receipts = same rows minus the join-less |
| `partial`/`full` ⊂ `list` | same SELECT, extra `WHERE` on the joined charge balance |
| `/payments/refunds` list ≡ `/payments` list | same component branch, `@else` table |
| Record payment implemented twice | `payments-page.ts:120-150` **and** `fees-page.ts:322-355` (`submitPayment`, dialog at `fees-page.html:112-140`) |
| Receipt printing implemented on both sides | `payments-page.printReceipt()` and `parent-portal.printReceipt()`, both delegating to `PrintDocumentService.printReceipt` (good reuse of the service, duplicated row→input mapping) |

### 2.2 Overlapping with other modules (not to be merged, but must cross-link)

| Surface | File | Overlap |
|---|---|---|
| Fees → Monthly Charges | `src/app/features/fees/fees-page.ts/html` | Own record-payment dialog per charge row (`confirmPay` → `submitPayment`), own receipt banner linking to `/payments/receipts` |
| Fees → Pending Fees | `fee-operations-page.ts` resource `'pending'` | Charge-level open balances — the *correct* place for "Partially Paid / Fully Paid" semantics, which are charge states, not payment states |
| Fees → Fee Summary | `fee-operations-page.ts` resource `'summary'` | Charge-level totals (`paid_amount`, `balance_amount`) from the same `monthly_charge_balances` view |
| Student details → Payments tab | `student-details-page.ts:117,151-162` | Per-student payment history with its own pagination |
| Parent portal → Payments / Receipts / Fees | `parent-portal-page.ts:284-411` | Parent-scoped ledger, receipt detail by `?payment=`, charge summary |
| Dashboard | `dashboard-page.html:14,47` | Two "Record Payment" entry points to `/payments/new` |
| Fees statement / invoice | `fees-page.ts` + `PrintDocumentService.printStatement/printInvoice` | Reads payments + refunds; already authoritative |

### 2.3 Status model reality check

- `public.payment_status` enum: `pending, successful, failed, refunded, partially_refunded` (`202609040001_core_schema.sql:11`).
- `record_payment` always inserts `'successful'` (`202610300001_record_payment_status_cast.sql:30`).
  No code path inserts `pending` or `failed`.
- Consequence: the status filter's `pending` and `failed` options, and the
  `refunds` view's `status in ('successful','partially_refunded','refunded')`
  guard, are both effectively no-ops. `refunds` ≡ everything.
- Charge status is a **separate** enum (`pending`, `partial`, `paid`, `waived`)
  written by `record_payment` and `refund_payment`.
- Refunds have **no status and no approval step**: `refund_payment` is
  admin-only, executes immediately, writes one `payment_refunds` row plus one
  `audit_logs` row (`action='REFUND'`). The "approved by" shown on a refund
  receipt is the *refunding* admin (`refunded_by` → `profiles`), not an
  approver.

Therefore "financial status, transaction status and refund status" must stay
conceptually separate: charge settlement (Fees module), payment status (payment
row), refund document (payment_refunds row, statusless, admin-created).

---

## 3. Recommended module structure

Principles: one ledger, status as filters not tabs; obligations stay in Fees;
refunds stay a privileged workflow; deep links keep working.

### Proposed

| Existing | Proposed | Form |
|---|---|---|
| Payment History `/payments` | **Payments** — single ledger | Page, keeps URL |
| Record Payment `/payments/new` | **Record payment** dialog | `RecordPaymentDialog` opened from ledger hero button, dashboard, fees row, student payments tab. `/payments/new` redirects to `/payments?record=1` (and honours `?charge=`) |
| Partially Paid `/payments/partial` | Settlement filter chip | `/payments?settlement=partial`; old path redirects |
| Fully Paid `/payments/full` | Settlement filter chip | `/payments?settlement=full`; old path redirects |
| Receipts `/payments/receipts` | Column filter + per-row actions (already there) | `/payments?receipt=1`; old path redirects. A separate document library is a **later** option, not part of this consolidation |
| Transaction History `/payments/history` | Folded into ledger | `/payments/history` redirects to `/payments`. A real per-payment timeline belongs in `PaymentDetailsDialog`, sourced from `audit_logs`, not in a second table |
| Refunds `/payments/refunds` | **Refunds** — keep as its own admin screen, but list **refund documents** | Second primary page, admin-only, stays admin-guarded; refund is initiated from a payment row/detail; the page shows `payment_refunds` rows across payments |

Resulting staff nav: `Fees` (obligations) and `Payments` (money in/out). Inside
Payments: one table + two actions, and a Refunds screen visible to admins only.

### Why the settlement filters must reuse `p_view`

`partial`/`full` are computed server-side against `monthly_charge_balances`
inside the RPC. Reproducing that in the client (or in a generic `p_status`
filter) would either drop the charge join or double the query cost. Keep
`p_view` as the settlement channel and let the page send
`partial`/`full` when a chip is active — no SQL change required for the merge.

### Migration shape

- `payment-view-navigation.ts` (35 lines, 7 links) → 1–2 links or removed
  entirely in favour of filter chips.
- Routes: 5 of the 7 entries become `redirectTo` with a matcher that preserves
  query params; `/payments/refunds` keeps `roleGuard`.
- No removal of `partial`/`full`/`receipts`/`history` tokens from the RPC —
  they stay as the filter vocabulary. Only the tab UI changes.

---

## 4. Component and architecture analysis

### Already reusable (keep, do not rebuild)

`DataTable` + `Pagination` (`shared/data-table`, `shared/pagination`),
`TableTools` (CSV/export), `ColumnFilter` (`shared/column-filter`),
`SortableHeader`, `StatusBadge` (already maps `partially_refunded` →
warning, `refunded` → danger), `AsyncState`, `SummaryMetricCard`, `PageHero`,
`ModalFocus`, `ToastService`, `AcademyPreferencesService`,
`AcademyMoneyPipe`, `PrintDocumentService`
(`printReceipt`, `printRefundReceipt`, `printInvoice`, `printStatement`),
`MutationAttempt` (idempotency), `TableService`/`DataRequestError`.

### Proposed new shared pieces

| Component | Kind | Replaces | Priority |
|---|---|---|---|
| `RecordPaymentDialog` (`features/payments/record-payment-dialog/`) | New | `payments-page` inline form **and** `fees-page` payment dialog; opens from dashboard/fees/student tab | P1 |
| `PaymentDetailsDialog` | New | The refund-receipt dialog; becomes the ledger "view" action and the intended home for a payment timeline | P2 |
| `RefundDialog` | Extracted | Inline refund modal in `payments-page.html:190-214` | P1 (while consolidating refunds) |
| `ReceiptActions` (`print` / `PDF` / `refund receipt`) | New, small | Repeated 3-button action cell in ledger and parent receipt view | P2 |
| `payment.models.ts` | Extracted types | `PaymentRow`, `PaymentStatus`, `ChargeOption` currently private to `payments-page.ts:38-61` | P1 (prerequisite for the dialogs) |
| `PaymentStatusBadge` | **Not needed** | `StatusBadge` already covers every payment status | — |

Do **not** create a generic "payments data grid" abstraction on top of
`DataTable` — the existing composition (`DataTable` + `ColumnFilter` +
`SortableHeader` + `TableTools`) is already the project pattern and is used by
six other modules.

Two housekeeping moves worth folding into P2: `features/payments/document-pdf.ts`
is imported only by `settings/` (`academy-settings-page.ts:15`,
`settings-tools-page.ts:8`) — move it to `shared/`; and the unused
`PaymentsService.history()` / `historyPage()` (`domain-services.ts:1589-1616`)
plus the older `get_payment_page` RPC and the 8-argument
`get_payment_list_page` overload are dead code.

---

## 5. Supabase and data integrity

### Tables and relationships (verified in `202609040001_core_schema.sql`)

```
students ──< enrollments ──< monthly_charges ──< payments ──1:1 receipts
                                    │                 └──< payment_refunds
                                    └── view monthly_charge_balances
                                        (paid_amount, balance_amount)
```

- `payments.monthly_charge_id` is **nullable** → payments without a charge can
  never appear in `partial`/`full`. The RPC's `left join monthly_charge_balances`
  handles this (NULL charge → neither filter matches). Confirm no legacy rows
  rely on it before shipping the consolidated filter.
- `payments.client_reference` is `unique` — the idempotency backbone already
  used by both UIs and both RPCs.
- `receipts.payment_id` is `unique` → one receipt per payment, always.
- `monthly_charge_balances` (latest definition,
  `202609240001_payment_accuracy.sql:7-12`):
  `paid = Σ(amount − Σ refunds)` over `successful|partially_refunded|refunded`;
  `balance = max(0, final_amount − paid)`. Refunds therefore re-open charges —
  correct, but it is why `/payments/full` loses a payment after a refund.
- `payment_refunds` has **no status column**. Refund lifecycle is
  "created" only; history lives in `audit_logs`.

### Consistency between screens

| Calculation | Payments page | Fees module | Parent portal |
|---|---|---|---|
| Collection total | `get_payment_list_page` metrics over the **filtered** set | `get_staff_list_page('summary')` over charges | `summarizeChargeBalances` (`parent-fee-summary.ts`) |
| Basis | payments − refunds | charges final/paid/balance | charges |
| Units | currency × 100 → back to currency in template (`payments-page.ts:319-323`) | paise convention (`amountPaise`) | currency |

Three independent implementations of "how much money came in" exist. They agree
mathematically because all three derive from `payments`/`monthly_charge_balances`,
but they are separately maintained. Consolidation should **not** merge them —
the grains differ (payment vs obligation vs parent subset) — but the ledger
metric should be labelled with its scope ("for current filters") so it is not
mistaken for an academy-wide total.

Another consistency caveat: the payment page multiplies by 100 into fields named
`...Paise` although the academy currency is configurable
(`academy_settings.currency_code`). Harmless today, misleading for any
non-2-decimal currency; rename to `...Minor` when the models are extracted.

### Access control (verified)

| Object | Policy / check |
|---|---|
| `get_payment_list_page` | `stable security invoker` + `is_admin_or_receptionist()` else `42501` |
| `record_payment` | `security definer` + `is_admin_or_receptionist()` |
| `refund_payment` | `security definer` + **`is_admin()`** |
| `payments` RLS | `payments_read`: staff or `parent_owns_student`; `payments_staff_insert`: staff |
| `receipts` RLS | staff or parent-of-owner; staff insert |
| `payment_refunds` RLS | `payment_refunds_admin_read` + `payment_refunds_scoped_read` (readable by anyone who can read the parent payment) |
| Route | `fees:write` for all payment pages; `refunds` additionally admin-only |

Consequences for the consolidation: moving refund initiation into the ledger
row/detail **must not** rely on hiding the button — `refund_payment` already
enforces admin, and the refund dialog must keep its guard. Receptionists can
currently *read* refunds of a payment they can see (scoped policy) while not
being able to create one; a shared `PaymentDetailsDialog` should therefore show
refund history read-only for receptionists.

### Audit trail

`audit_logs` receives a row on every `payments` insert/update via the
`audit_changes` trigger, plus an explicit `REFUND` row from `refund_payment`.
Refund receipt numbers (`RFR-…`) are **derived on the client** from the refund
id (`domain-services.ts:1687-1691`) — they are stable but not persisted. Any
future "refund register" must keep deriving them the same way or add a
persisted column; changing the scheme would break reprints of existing receipts.

---

## 6. UI/UX recommendations

1. **One ledger, filters not tabs.** Status chips (All / Successful /
   Partially refunded / Refunded), settlement chips (All / Partially settled /
   Fully settled), a search box and a date range. Removes 5 of 7 nav entries.
   Nothing is hidden — every existing filter remains reachable, and the old
   URLs keep working through redirects.
2. **Wire the filters that already exist.** `setSearch`/`setStatus`/
   `resetFilters` are implemented but unreachable; a single toolbar row makes
   them live and gives the page the search it lacks today.
3. **Record payment as a dialog** opened from the ledger hero, dashboard tile,
   fees row and student payments tab. Same fields, same idempotency, no page
   change. Cuts the common flow from 3 navigations to 1 click and keeps the
   user's filter context.
4. **Receipt actions inline** (print / PDF / refund receipt) — already there;
   surface them in a details dialog too instead of a dedicated Receipts tab.
5. **Refunds as documents, not payments.** Refunds page lists
   `payment_refunds` rows (student, original receipt, amount, reason, refunded
   by, date) with a "New refund" that starts from a payment search. Removes the
   duplicated payment table and the misleading current-page-only action list.
6. **Details dialog** on row click: payment, charge context (batch, month),
   receipt, refunds, and (P3) an `audit_logs`-backed timeline. This is where
   "Transaction History" actually belongs.
7. **Sensitive-action confirmation**: keep `ModalFocus`, amount ceiling,
   mandatory reason, and the pending-state lock on both dialogs; add a
   confirmation summary before a refund is submitted (amount + student +
   receipt) — the only irreversible action in the module.
8. **Mobile**: single-column card list under 600px for the ledger rather than
   horizontal scroll on a 7-column table; dialogs already use `ModalFocus`
   which traps focus correctly.
9. **Consistency**: keep the project's existing design tokens and shared
   components; no new UI library.

Every change above is reachable through existing URLs, filters, or row actions
— nothing that exists today becomes unreachable.

---

## 7. Reports

### Report A — Current functionality audit

| Page | Features | Status | Issues | Recommendation | Priority |
|---|---|---|---|---|---|
| `/payments` | Ledger table, 6 column filters, sorting, paging, CSV export, receipt print/PDF, refund-receipt dialog, 4 metrics | Working | No reachable search/status filter; dead `message`/`filteredRows`/`pageRows`; unused `receiptPath`; no row details view | Keep as main page; wire filters; add details dialog | P1 |
| `/payments/new` | Charge picker with balance auto-fill, amount/mode/reference, idempotent submit, toast | Working (inefficient) | Loads whole ledger + every charge on entry; unsearchable dropdown; no loading state for options; no receipt confirmation | Convert to `RecordPaymentDialog`; load charges on open, filtered/searchable | P1 |
| `/payments/partial` | Same table filtered by charge settlement | Working (mislabeled) | Shows payments, not charges; moving target between loads; duplicate page | Convert to settlement chip | P1 |
| `/payments/full` | Same table filtered by `balance_amount = 0` | Working (mislabeled) | Same as above; refunded payments disappear from view | Convert to settlement chip | P1 |
| `/payments/receipts` | Same table filtered to rows with a receipt | Working (redundant) | No receipt-specific capability; `receiptPath` unused | Fold into ledger filter + row actions | P2 |
| `/payments/history` | Identical query to `/payments` | Working (duplicate) | Adds no information; name promises a timeline it does not render | Remove tab; ship redirect; real timeline in details dialog | P1 |
| `/payments/refunds` | Ledger + "Refund actions" list + refund dialog + refund-receipt dialog | Partially Working | Lists all payments instead of refunds; action list limited to current page; same rows shown twice; no refund register; no confirmation step | Dedicated admin refund register; refund from payment row/detail | P0/P1 |
| `/fees` payment dialog | Per-charge record payment | Working (duplicate) | Second implementation, slightly different modes (no card/bank transfer), own receipt banner | Replace with shared `RecordPaymentDialog` | P1 |
| Parent `/parent/payments`,`/receipts`,`/fees` | Scoped history, receipt detail, charge summary | Working | Receipt reached only through a query param; no deep-link fallback beyond "no receipt selected" | Keep; reuse `ReceiptActions`; link via details dialog | P3 |
| Student details → Payments | Per-student history with paging | Working | Separate pagination/sort state from ledger | Keep; add "Record payment" that opens the dialog pre-filled | P2 |
| Dashboard → Record Payment | Two buttons to `/payments/new` | Working | Navigates away from dashboard for a 30-second action | Open dialog in place | P2 |

Legend: Working / Partially Working / Broken / Missing / Not Verified. Nothing
in this module was found **Broken**; no page returned an error in the current
tree. Refunds is **Partially Working** because its primary list and action list
do not represent what the page claims.

### Report B — Page consolidation matrix

| Existing pages | Merge? | Proposed destination | Reason | Impact |
|---|---|---|---|---|
| Payment History + Transaction History | **Yes** | `/payments` | Identical RPC branch (`true`) and identical template | One redirect; no data change |
| Payment History + Partially Paid + Fully Paid | **Yes** (as filters) | `/payments?settlement=partial|full` | Same SELECT, one extra `WHERE`; RPC already parameterised | Two redirects; chip UI; p_view unchanged |
| Payment History + Receipts | **Yes** (as filter + actions) | `/payments?receipt=1` | Receipts ⊂ ledger; print/PDF already per row | One redirect |
| Record Payment page | **Yes** (as dialog) | Shared `RecordPaymentDialog` | Duplicate of the fees dialog; page load is wasteful | `?record=1` deep link; 2 call sites replaced |
| Refunds | **No** — keep separate | `/payments/refunds` (rebuilt as refund register) | Distinct privilege (admin), distinct audit object, irreversible money movement | Behaviour change on that page only; route/guard unchanged |
| Fees Pending / Fee Summary | **No** | `/fees/pending`, `/fees/summary` | Different grain (charges), owns "partially paid charge" semantics | None; add cross-link to record payment |
| Parent payments / receipts | **No** | `/parent/payments`, `/parent/receipts` | Parent-scoped RLS and different verbs | None |

### Report C — Component reusability report

| Component | Existing/New | Used by | Reuse opportunity | Priority |
|---|---|---|---|---|
| `DataTable`+`Pagination` | Existing | 8 modules incl. payments | Keep as the only table shell | — |
| `ColumnFilter` / `createColumnFilters` | Existing | fees, batches, payments | Keep; filter URLs via query params after consolidation | P1 |
| `SortableHeader` | Existing | payments, fees, batches | Keep | — |
| `StatusBadge` | Existing | everywhere | Already maps all payment statuses; no new badge needed | — |
| `AsyncState` | Existing | payments, parent portal | Use for the charge picker's loading/empty state | P2 |
| `SummaryMetricCard` | Existing | payments, fees, dashboard | Keep; label scope ("current filters") | P2 |
| `ModalFocus` | Existing | payments dialogs, fees dialogs | Reuse in all extracted dialogs | — |
| `MutationAttempt` | Existing | payments, fees | Must be carried into `RecordPaymentDialog`/`RefundDialog` | P0 (regression risk if dropped) |
| `PrintDocumentService` | Existing | payments, fees, parent | Keep; `ReceiptActions` wraps the 3 calls | P1 |
| `RecordPaymentDialog` | **New** | payments, fees, dashboard, student tab | Replaces 2 implementations | P1 |
| `RefundDialog` | **New (extract)** | payments ledger, refunds page | Removes inline modal from a 370-line component | P1 |
| `PaymentDetailsDialog` | **New** | ledger, student tab, parent (later) | Replaces refund-receipt dialog; home for timeline | P2 |
| `ReceiptActions` | **New (small)** | ledger, details dialog, parent receipt | Removes 3 copies of button markup | P2 |
| `payment.models.ts` | **New (extract)** | all of the above | Shared `PaymentRow`/`PaymentStatus`/`ChargeOption` | P1 |
| `document-pdf.ts` | Existing, misfiled | settings only | Move to `shared/` | P3 |

### Report D — Technical and database impact

**Angular**

- `src/app/app.routes.ts:672-728` — 5 routes become redirects; `/payments/refunds` keeps `roleGuard`.
- `src/app/features/payments/payments-page.ts` (370 lines) — loses the inline form, refund modal, refund-receipt modal, `feesApi.charges()` load for non-`new` views, dead signals; gains query-param-driven filters.
- `src/app/features/payments/payments-page.html` (212 lines) — ternary title chain → single title; form branch → dialog; refund action card removed; settlement/receipt chips added.
- `src/app/features/payments/payment-view-navigation.ts` (+scss) — 7 links → 2 or removed.
- New: `record-payment-dialog/*`, `refund-dialog/*`, `payment-details-dialog/*`, `receipt-actions/*`, `payment.models.ts`.
- `src/app/features/fees/fees-page.ts:322-355` + `fees-page.html:112-140` — dialog replaced by shared component; `paymentAttempt` logic removed from here.
- `src/app/features/dashboard/dashboard-page.html:14,47` — buttons open the dialog instead of navigating.
- `src/app/features/students/student-details-page.*` — optional "Record payment" pre-filled action (P2).
- `src/app/layout/staff-layout/staff-layout.ts:72` — Payments entry unchanged (single item already).

**Services / interfaces**

- `PaymentsService.ledgerPage` — add a settlement parameter mapping to `p_view` (or keep `p_view` and pass `list|partial|full|receipts`); add a `refundsPage()` for the register.
- `PaymentsService.refundReceipts(paymentId)` — reused by the register (needs an all-payments variant or a new RPC).
- `PaymentsService.history()`/`historyPage()` — delete (unused).
- `PaymentHistoryRecord`, `RefundReceiptRecord`, `ChargeBalanceRecord` — unchanged; new `PaymentRow` model extracted from the component.

**Supabase**

- No schema change required for the page merge.
- `get_payment_list_page`: keep both view vocabulary and `p_columns`; optionally add `p_settlement` so status and settlement can be combined (today `p_view` carries only one dimension and cannot express "partially settled **and** refunded"). **This is the one real backend gap** in the proposal.
- Drop the unused 8-argument overload and the older `get_payment_page` RPC (verify no external caller first).
- A refund register needs either a new page RPC over `payment_refunds` or reuse of `readAllPages` with the existing embedded select in `refundReceipts`.
- Policies unchanged: `payments_read`, `receipts_read`, `payment_refunds_*`, and the `is_admin()` / `is_admin_or_receptionist()` RPC guards.
- No data migration, no backfill, no deletion — the consolidation is read-path only. `record_payment`/`refund_payment` are untouched.

**Permissions**

- Admin: full ledger + refunds + record.
- Receptionist: ledger + record; refund button hidden and refused server-side (`refund_payment`). Refund *history* remains readable via `payment_refunds_scoped_read`.
- Coach: `coach:portal` only — no payment routes (verified in `permissions.ts`).
- Parent: `/parent/payments`, `/parent/receipts`, `/parent/fees` only, RLS-scoped by `parent_owns_student`.

**Automated tests affected**

- Unit: `src/app/features/payments/payments-page.spec.ts` (4 tests — references `page['form']`, `page['openRefund']`, `ledgerPage` args), `src/app/features/fees/fees-page.spec.ts` (payment submit), `src/app/core/supabase/enrollment-finance-services.spec.ts` (`record`, `refundReceipts`), `domain-services.spec.ts`.
- E2E: `e2e/live-priority-workflows.spec.ts:64-71` (partial/full URLs + metric assertions), `e2e/live-refund-workflow.spec.ts:49,140` (refunds page, admin/non-admin), `e2e/live-role-pages.spec.ts:5` (route list per role), `e2e/route-coverage.spec.ts:16-17` (all 7 URLs must render), `e2e/vertical-slice.spec.ts:53,63` (`/payments/new`, `/payments/receipts`).
- Redirects keep `route-coverage`/`live-role-pages` green; `live-priority-workflows` needs URL updates where it asserts settlement filtering; `live-refund-workflow` needs the register's row/button names.

### Report E — Estimated optimisation benefits

All figures are **estimates** with the basis stated; none are measured
performance claims.

| Measure | Current | Proposed | Basis |
|---|---|---|---|
| Payment routes with their own screen | 7 | 2 primary (+5 redirects) | `app.routes.ts:672-728` |
| Staff nav entries for payment tabs | 7 | 0–2 | `payment-view-navigation.ts` |
| Distinct ledger queries for "all payments" | 3 (`list`, `history`, `refunds`) | 1 | RPC branches |
| Record-payment implementations | 2 | 1 | `payments-page.ts` + `fees-page.ts` |
| Full-table charge fetches per payment page view | 1 on every view | 0 (only when the dialog opens, and filtered) | `reload()` calls `feesApi.charges()` unconditionally |
| Payment component size | 370 ts + 212 html | ≈ 200 ts + 140 html + 4 small components | Removing 3 inline dialogs/branches |
| Reusable components added | 0 | 5 | Report C |
| Refund register | none (payments re-listed) | 1 | Report B |

Navigation impact: recording a payment from the dashboard or a fee row goes
from 2–3 navigations to 0 (dialog in place). Reaching "partially settled
payments" goes from a tab to one chip, and remains deep-linkable.

Risk/complexity: **Low–Medium.** No schema migration, no write-path change, no
data change; the RPC vocabulary and guards are preserved. The main risks are
test churn (6 spec files) and the combined status+settlement filter, which is
the only item that may need a small RPC signature addition.

### Report F — Priority-based implementation plan

**P0 — Critical (financial integrity / security)**

Nothing is currently broken in the write path; `record_payment` and
`refund_payment` are correct, idempotent, guarded, and audited. Two P0 items are
about *preserving* that while consolidating:

- P0.1 Keep `is_admin()` inside `refund_payment` as the only authority when the refund UI moves into the ledger (button visibility is not security).
- P0.2 Carry `MutationAttempt` keys into the extracted `RecordPaymentDialog`/`RefundDialog` — dropping them silently re-enables duplicate payments on retry.
  - Files: `src/app/features/payments/*`, `src/app/features/fees/fees-page.ts`.
  - Prerequisite: none. Risk: duplicate payments. Test: existing retry-key assertions in `payments-page.spec.ts:60-104`.

**P1 — High (duplicate functionality, confusing navigation)**

- P1.1 Extract `payment.models.ts` + `RecordPaymentDialog`; switch `/payments/new` and the fees dialog to it.
- P1.2 Fold `history` into `/payments`; remove the tab; add the redirect.
- P1.3 Convert `partial`/`full` to settlement chips over the same ledger; add redirects preserving `?student=`.
- P1.4 Rebuild `/payments/refunds` as an admin refund register (refund from a payment row/detail), remove the duplicated table and the current-page-only action list.
- P1.5 Wire the existing search/status filters into the toolbar.
  - Acceptance: every previously reachable row set is reachable via a filter or deep link; all old URLs resolve; refunds still admin-only at route *and* RPC; existing unit + live e2e updated and green.
  - Risk: RPC cannot combine status + settlement (see D) — decide between `p_settlement` addition or UI that allows only one dimension at a time.

**P2 — Medium (reuse, cleanup, UX)**

- P2.1 `ReceiptActions` + `PaymentDetailsDialog`; drop `receiptPath` dead data or use it.
- P2.2 Remove dead code: `message` signal, `filteredRows`/`pageRows` aliases, `setStatus`/`resetFilters` if still unused, `PaymentsService.history()`/`historyPage()`.
- P2.3 Move `document-pdf.ts` to `shared/`.
- P2.4 Add "Record payment" to student details (pre-filled) and dashboard (dialog).
- P2.5 Mobile card layout for the ledger under 600px.

**P3 — Low**

- P3.1 Audit-log-backed payment timeline inside the details dialog (this is what "Transaction History" should have been).
- P3.2 Receipt document library (if the academy later wants bulk receipt downloads).
- P3.3 Rename `...Paise` fields to `...Minor` for currency independence.
- P3.4 Drop the unused `get_payment_list_page` 8-arg overload and `get_payment_page`.

---

## 8. Before / after workflows

| Task | Before | After |
|---|---|---|
| Find a partially settled payment | Payments → Partially Paid tab (payments, not charges; label misleading) | Payments → chip "Partially settled" |
| Find a receipt | Payments → Receipts tab → print button | Payments → receipt column filter (or details dialog) → print |
| Review a payment | Payments → scan row (no details) | Row → details dialog (charge, receipt, refunds, timeline) |
| Record a payment from dashboard | Dashboard → button → full page → select charge → submit → reload | Dashboard → button → dialog → submit |
| Record a payment from fees | Fees → row wallet icon → confirm → dialog → submit | Fees → row → shared dialog |
| Refund | Admin → Payments → Refunds tab → scroll payments → Refund | Admin → Refunds register or payment details → Refund (confirmation) |
| See all refunds | Not possible (per-payment dialog only) | Refunds register lists every refund document |
| See "transaction history" | Second tab, identical table | Details dialog timeline (P3); tab removed |

## 9. Risks, dependencies, test recommendations

1. **Settlement semantics** — `partial`/`full` describe the *charge's current*
   settlement, not the payment. Any new label must say so ("payments on
   partially settled charges"), otherwise the same mismatch reappears.
2. **Combined filters** — status + settlement in one query is not expressible
   today. Prefer adding `p_settlement` to the RPC over client-side filtering.
3. **Deep links / bookmarks** — five redirects must preserve query params
   (`?student=`, `?charge=`), and `route-coverage.spec.ts` must stay green.
4. **Refund privilege regression** — keep the route guard and rely on
   `is_admin()`; add an e2e assertion that a receptionist cannot see the refund
   action *and* that the RPC still rejects the attempt
   (`live-refund-workflow.spec.ts:135-150` already does the second half).
5. **Idempotency regression** — the retry-key tests in
   `payments-page.spec.ts:60-104` must be ported to the dialog before the
   inline form is deleted.
6. **Metric scope** — if filters become prominent, relabel the cards as
   "current view" totals so they are not read as academy-wide figures.
7. **Legacy payments with a null `monthly_charge_id`** — confirm none exist
   before shipping the settlement chips; they are currently invisible to
   `partial`/`full` and would remain so.
8. **Testing**: unit port for every extracted dialog (submit success, server
   rejection, retry key stability, refund ceiling, reason validation), plus
   live e2e updates for the five URL changes and a new refund-register spec.

---

## 10. Deliverables checklist

1. Executive summary — §0.
2. Existing vs proposed navigation — §3.
3. Page-by-page audit — §1 + Report A.
4. Merge / retain / remove — Report B.
5. Reusable component inventory — Report C.
6. Supabase and data integrity impact — §5 + Report D.
7. Role and permission impact — §5 (access control) + Report D.
8. Before/after workflows — §8.
9. Prioritised roadmap — Report F.
10. Risks, dependencies, testing — §9.

**No code, schema, data, or configuration was modified by this audit.**
