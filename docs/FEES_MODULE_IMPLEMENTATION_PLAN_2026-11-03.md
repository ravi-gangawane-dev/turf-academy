# Fees Module Implementation Plan

Date: 2026-11-03

## Goal

Consolidate the Fees module without changing financial meaning or rewriting historical records.

## Target navigation

- **Fees**: monthly charges, status filters, balances, invoices, statements, and payment entry.
- **Fee Plans**: reusable pricing configuration for enrollments.
- **Fee Adjustments**: discounts and late-fee rules in one workspace with a type selector.

The existing routes remain available as compatibility routes:

- `/fees`
- `/fees/plans`
- `/fees/discounts`
- `/fees/late-fees`
- `/fees/pending`
- `/fees/summary`

Pending and summary become internal views of the Fees workspace after migration. Discounts and late fees share one adjustments workspace while retaining separate business rules.

## Work phases

### P0 — Financial integrity

- Verify all balance displays use `monthly_charge_balances`.
- Verify duplicate monthly charge protection.
- Verify partial payment, full payment, refund, and status transitions.
- Document unresolved proration and discount-stacking rules before changing calculations.

### P1 — Navigation and page consolidation

- Reduce visible fee navigation to Fees, Fee Plans, and Fee Adjustments.
- Preserve legacy route compatibility.
- Add explicit charge status filters to the Fees page.
- Keep fee-plan configuration separate from charge collection.

### P1 — Shared collection workflow

- Reuse the payment-record dialog from Fees and Payments.
- Keep API calls in `PaymentsService`.
- Preserve idempotency, provider references, receipt creation, and overpayment validation.

### P2 — Reusable fee components

- Extract a shared charge table.
- Extract a shared adjustment dialog.
- Standardize fee filters, action buttons, exports, and empty/loading/error states.

### P2 — Reporting

- Move summary KPIs into Fees.
- Retain a detailed summary view only when it provides distinct reporting value.
- Add reconciliation totals for charges, discounts, late fees, payments, refunds, and balances.

### P3 — UX and accessibility

- Improve mobile filter layout.
- Normalize action-button colors and tooltips.
- Verify keyboard and screen-reader behavior for dialogs and tables.

## Acceptance criteria

- Existing fee bookmarks continue to load.
- No duplicate primary navigation entries remain.
- Pending, partial, paid, overdue, and waived charges are filterable from Fees.
- Fee Plans remain independent configuration.
- Discounts and late fees retain their separate validation and database rules.
- Payment recording works from Fees and Payments through one shared dialog.
- No balance is calculated independently in a page template.
- Existing financial records are not rewritten.
- Build and targeted Fees tests pass after each phase.

## Current implementation status

- [x] Audit completed.
- [x] Plan saved.
- [ ] Consolidated fee navigation.
- [x] Main Fees status filters.
- [x] Pending Fees compatibility route consolidated into Fees.
- [x] Fee Summary compatibility route consolidated into Fees.
- [x] Discounts and Late Fees share one Fee Adjustments workspace.
- [x] Reusable fee charge table contract created.
- [x] Reconciliation values added to the main Fees rows.
- [ ] Shared charge table.
- [ ] Shared adjustment workspace.
- [x] Shared payment dialog in Fees.
- [x] Reconciliation reporting.


## Final acceptance status (2026-11-03)

- Reconciliation columns, totals, filters, and shared-table actions implemented.
- Duplicate monthly-charge protection implemented in the service and database error path retained.
- Payment recording retains idempotent client-reference recovery for partial/full payments and refunds.
- Adjustment validation contract and unit coverage added.
- Production build and live payment/refund regression verification remain environment-dependent and require a configured Supabase test account.

## Validation results
- Production build passes.
- Script regression suite passes: 34/34.
- Full Angular suite: 630/635 tests passed; remaining failures are existing academy settings, attendance filter, enrollment finance timeout, and payments route fixture issues.
- Fees summary expectation updated for the new reconciliation cards.

## Final live verification
- Fees export now emits a CSV header row plus reconciliation values.
- Authenticated payment and refund checks require a live Supabase user session and were not executed from this environment.
