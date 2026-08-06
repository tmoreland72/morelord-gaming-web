# Admin subscription audit and shared navigation

## Added

- Shared administration tabs across every `/admin` route.
- Protected `/admin/subscription-audit` page.
- Live comparison of Stripe subscription state against D1 subscription records.
- Membership, price, status, cancellation, period-end, and entitlement mismatch detection.
- Promotion-code visibility and deleted-coupon warnings.
- Search and status filters for audit records.

## Notes

Reload the audit page to request current Stripe data and compare it with the latest synchronized D1 records.
Historical canceled Stripe subscriptions are omitted unless the website still marks one as the current subscription.
