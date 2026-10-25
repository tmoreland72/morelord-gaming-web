import registryJson from '../../scripts/product-docs.json';

type ProductDocsRegistry = {
	products: Array<{
		slug: string;
		foundryPackageId?: string;
	}>;
};

const registry = registryJson as ProductDocsRegistry;
const packageIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Official Foundry VTT package page for a module.
 * The id lives on the site docs registry, not in synced Markdown, so a
 * product-docs-updated dispatch cannot remove the link.
 */
export function foundryPackagePageUrl(productSlug: string): string | null {
	const packageId = registry.products.find(
		(product) => product.slug === productSlug
	)?.foundryPackageId;
	if (!packageId || !packageIdPattern.test(packageId)) return null;
	return `https://foundryvtt.com/packages/${packageId}`;
}
