<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep studio content in `src/content/site.ts` and testimonial rotation in its focused component so content changes do not duplicate display logic.
- Booking rules (120-min limit, deposit split, availability, overlap) are enforced in database functions (`create_booking`, `available_slots`, exclusion constraint on `bookings.period`); `src/lib/booking-rules.ts` only mirrors them for UI — change both together.
- Payments are confirmed only by querying the Mercado Pago API (webhook `/api/public/mercadopago` or status refresh) and calling `apply_payment_status` (service role only); never trust return URLs.
- Administrative scheduling uses authenticated server functions and role-checked transactional database RPCs; rescheduling preserves financial fields, manual bookings are explicitly unpaid, and database triggers audit all administrative changes.
- Initial owner activation is pinned to an explicitly authorized user UUID and requires verified email ownership; never assign administrative privileges from an email match or user-editable metadata.
- Password visibility is shared by login and recovery; recovery uses official auth-link processing, revalidates the user before updates, and never sends current_password for a recovery session.
- Production payment requests use the canonical published webhook URL, stable per-card-token idempotency, and status-only provider error logs so notifications reach production and sensitive provider payloads are not retained.
