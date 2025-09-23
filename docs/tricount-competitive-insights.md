# Tricount insights and feature backlog

Source: Public FAQs and product pages (bunq Together + tricount help/marketing). Summarized for inspiration; not a copy of their content.

## What users expect from a “tricount-like” app

- Group-first, collaborative tracking
  - Everyone adds their own expenses; changes sync in near real-time.
  - Join via link; easy to manage participants; large groups (up to ~50) work.
- Flexible split logic
  - Equal and uneven splits by shares or exact amounts per person.
  - Supports “transfer” (reimbursement) and “income” entries besides expenses.
  - Perfect-cent rounding: allow ≤ 1 cent discrepancy when indivisible.
- Clear totals and balances
  - “My total” (what impacts me) vs “Group total” (sum of group expenses).
  - Smart settlement suggestions that minimize number of transactions.
- Multi-currency done right
  - One base currency per group; expenses can be entered in other currencies.
  - Daily FX rate with manual override per expense; balances shown in base currency.
- Useful management tools
  - Create, archive, restore groups; rename, emoji/icon per group.
  - Edit/delete transactions; categories; optional notes.
  - Pull-to-refresh and predictable syncing when things look stale.
- Insights
  - Simple category breakdown (pie) for where the group spends money.
- Payment requests (region-limited in tricount)
  - Share a link to get paid back; bank/credit-card options; may include fees.
- Automation (tricount-specific with bunq)
  - Card/bank linking to auto-import expenses (only in certain regions).

## Mapping to our current app

- We already have: rooms (groups), room_members, expenses, join requests, settlements helper utils, Shadcn UI, charts.
- Recent fixes: stable redirect/loading, safer Supabase queries, non-recursive RLS policies.

## Backlog (prioritized)

### MVP (ship next)
1) Group basics polish
   - Emoji/icon + color per room.
   - Archive/restore (add `archived_at` to `rooms`; hide by default; restore action).
   - Participant limit (configurable, default 50).
2) Expense creation UX
   - Equal/uneven splits: by shares and by exact amounts; persist per-expense split.
   - Types: expense | transfer | income (enum). Exclude transfers from “totals” where appropriate.
   - Categories + notes; optional attachments (receipt image) for later.
3) Totals and balances
   - Show “My total” and “Group total” in the group header.
   - Settlement suggestions that minimize transactions (we have utils; surface UI + mark-as-paid flow).
4) Multi-currency v1
   - Base currency per room; per-expense currency with manual FX rate.
   - DB migration:
     - ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS currency text;
     - ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS fx_rate numeric;
     - UPDATE public.expenses SET currency = (SELECT currency FROM public.rooms r WHERE r.id = expenses.room_id) WHERE currency IS NULL;
   - Compute balances in base currency; allow manual override per entry.
5) Join/invite flows
   - Shareable invite link; pending join requests; owner approval.
6) Refresh controls
   - Pull-to-refresh (button/gesture) that revalidates data; visible “Updated just now”.

### Next (nice to have after MVP)
1) Insights
   - Category pie chart per room (existing chart component); time range filters.
2) CSV export
   - Export room expenses + balances as CSV (tricount removed export; we can keep as a value-add).
3) Payment request link (generic)
   - Generate a settlement link showing payer/payee and amount; allow copying UPI/IBAN or deep-link to preferred payment app; make fees transparent if any.
4) Attachments
   - Upload receipt images to storage; preview in expense details.
5) Notifications
   - Optional email/app notifications on new expense, join request, or settlement.

### Future/R&D
1) Automatic import
   - Bank/card integrations where feasible; otherwise mailbox parsing or manual import.
2) FX automation
   - Pull daily rates from a public API; keep manual override as the source of truth per expense.
3) Advanced insights
   - Trends, per-member analytics, per-category budgets.

## Data model suggestions

- rooms
  - + base_currency (ISO code)
  - + emoji (text), color (text), archived_at (timestamp null)
- expenses
  - + type enum ('expense'|'transfer'|'income')
  - + currency (ISO), fx_rate (numeric) nullable; applied_amount = amount * fx_rate -> base currency
  - + category (text), note (text), attachment_url (text) nullable
- expense_splits (optional explicit table if needed)
  - expense_id, user_id, share_type ('amount'|'ratio'), value (numeric)

RLS notes: keep non-recursive policies; for member counts visible to members, consider a derived view with owner/member access. For attachments, scope storage policies by room_id.

## UX notes

- Keep the UI skimmable like the tricount examples: clear cards for travelers/couples/roommates; emphasize “everyone adds, everyone knows”.
- Always show who paid, who it impacts, and how it was split.
- Provide a single, obvious action to “Settle up”.

## Acceptance criteria (MVP slice)

- A user can:
  - Create a room with emoji, invite members via link, approve joins.
  - Add expense with uneven split; see “My total” and “Group total”.
  - Add a transfer; group total excludes transfers; balances update.
  - Enter an expense in a foreign currency and set a manual rate; balances reflect base currency.
  - Archive a room and later restore it.
  - Refresh to fetch latest data; see a timestamp.

---
If you ask for a feature, we’ll reference this doc to propose the smallest shippable version first, then list follow-ups.
