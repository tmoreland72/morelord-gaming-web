# Subscription audit 500 fix

The Stripe subscriptions list request used nested expansions beyond Stripe's supported list-expansion depth. Stripe rejected the request, causing `/admin/subscription-audit` to return HTTP 500.

The audit now expands only `data.customer`. Subscription items already provide the price and product identifiers required for membership comparison. Promotion-code details are still populated when Stripe includes expanded discount data and otherwise remain optional.
