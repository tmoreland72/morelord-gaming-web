import { error } from '@sveltejs/kit';
import { getProductDoc } from '$lib/product-docs';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const document = getProductDoc(params.product, params.path);
	if (!document) error(404, 'Documentation not found');

	return document;
};
