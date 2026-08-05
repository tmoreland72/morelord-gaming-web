import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProductBySlug } from '$lib/server/catalog';

export const load: PageServerLoad = async ({ params, platform }) => {
	const result = await getProductBySlug(platform!.env.DB, params.slug);
	if (!result || result.product.status !== 'active') error(404, 'Product not found');
	return result;
};
