<svelte:head><title>Stripe Setup | Morelord Gaming</title>	<meta name="robots" content="noindex,nofollow" />
</svelte:head>
<section class="page-hero compact-hero"><div class="shell"><div class="eyebrow">Deployment guide</div><h1>Stripe subscriptions</h1><p class="lead">Connect Morelord Tools Premium and Champion to Stripe Checkout, the Customer Portal and Billing Entitlements.</p></div></section>
<section class="section brand-panel-section"><div class="shell prose-card card">
	<h2>1. Create two Stripe products</h2><p>Create <strong>Morelord Tools Premium</strong> and <strong>Morelord Tools Champion</strong>. Add one monthly and one annual recurring price to each product.</p>
	<h2>2. Create entitlement features</h2><p>Create the feature lookup keys <code>premium-modules</code>, <code>early-access</code>, <code>premium-discord</code>, <code>champion-discord</code>, and <code>priority-support</code>. Attach the first three to Premium and all applicable features to Champion.</p>
	<h2>3. Configure the Customer Portal</h2><p>Enable payment-method updates, invoice history, cancellation, and switching between the four Morelord prices. Configure live mode separately from test mode.</p>
	<h2>4. Create the webhook</h2><p>Use <code>https://morelordgaming.com/api/stripe/webhook</code>. Subscribe to <code>customer.subscription.created</code>, <code>customer.subscription.updated</code>, <code>customer.subscription.deleted</code>, and <code>entitlements.active_entitlement_summary.updated</code>.</p>
	<h2>5. Add GitHub production secrets</h2><pre>STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PREMIUM_MONTHLY
STRIPE_PRICE_PREMIUM_ANNUAL
STRIPE_PRICE_CHAMPION_MONTHLY
STRIPE_PRICE_CHAMPION_ANNUAL</pre>
	<h2>6. Friends & Family codes</h2><p>Use <a href="/admin/discount-codes">Admin → Friends & Family</a> to create a customer-facing promotion code. Each code creates a Stripe coupon for 100% off forever and can be restricted to Premium, Champion, or both. Keep maximum redemptions at one for personal codes. Deactivating an unused code prevents redemption; it does not remove a discount from an existing subscription.</p>
	<h2>7. Deploy and test</h2><p>Use Stripe test mode first. Subscribe with a test card, confirm the account page updates after the webhook, test a Friends & Family code, open the billing portal, change plans, and cancel at period end.</p>
</div></section>
