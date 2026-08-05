import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { stripeCustomers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createPortalSession } from '$lib/server/stripe';

export const POST: RequestHandler = async ({ locals, platform, url }) => {
	if (!locals.user) redirect(303, '/login?returnTo=/account');
	if (!platform?.env?.DB) error(500, 'D1 database binding is unavailable.');

	const db = getDb(platform.env.DB);
	const customer = await db.query.stripeCustomers.findFirst({ where: eq(stripeCustomers.userId, locals.user.id) });
	if (!customer) error(404, 'No Stripe billing account exists for this user.');

	const portal = await createPortalSession({ customerId: customer.stripeCustomerId, returnUrl: `${url.origin}/account` });
	redirect(303, portal.url);
};
