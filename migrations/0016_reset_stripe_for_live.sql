-- Remove sandbox Stripe state before switching the production worker to live mode.
-- User accounts and webhook events from other providers are intentionally preserved.
DELETE FROM active_entitlements;
DELETE FROM subscriptions;
DELETE FROM stripe_customers;
DELETE FROM webhook_events WHERE provider = 'stripe';
