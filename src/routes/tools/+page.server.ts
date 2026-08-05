import type { PageServerLoad } from './$types';
import { listActiveProducts } from '$lib/server/catalog';

export const load: PageServerLoad = async ({ platform }) => ({
	products: await listActiveProducts(platform!.env.DB)
});
