import type { PageServerLoad } from './$types';
import { listReleases } from '$lib/server/catalog';

export const load: PageServerLoad = async ({ platform }) => ({
	releases: await listReleases(platform!.env.DB)
});
