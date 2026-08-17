import type { Component } from 'svelte';

export type ProductDocMetadata = {
	title: string;
	description?: string;
	slug: string;
	product: string;
	audience?: string;
	version?: string;
	foundry?: string | number;
	order?: number;
};

type ProductDocModule = {
	default: Component;
	metadata: ProductDocMetadata;
};

export type ProductDocNavigationItem = {
	title: string;
	href: string;
	audience?: string;
	order: number;
};

const modules = import.meta.glob<ProductDocModule>('/src/lib/content/product-docs/**/*.md', {
	eager: true
});

function routeFromSlug(slug: string): string {
	return `/docs/${slug.replace(/^\/+|\/+$/g, '')}`;
}

function routeOrder(module: ProductDocModule): number {
	if (module.metadata.order !== undefined) return Number(module.metadata.order);
	return module.metadata.slug === module.metadata.product ? 0 : 100;
}

export function getProductDoc(product: string, path = '') {
	const slug = path ? `${product}/${path}` : product;
	const entry = Object.entries(modules).find(([, module]) => module.metadata.slug === slug);
	if (!entry) return null;

	const [sourcePath, module] = entry;
	const navigation = Object.values(modules)
		.filter((candidate) => candidate.metadata.product === product)
		.map((candidate) => ({
			title: candidate.metadata.title,
			href: routeFromSlug(candidate.metadata.slug),
			audience: candidate.metadata.audience,
			order: routeOrder(candidate)
		}))
		.sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));

	return { sourcePath, metadata: module.metadata, navigation };
}

export function getProductDocComponent(sourcePath: string): Component | null {
	return modules[sourcePath]?.default ?? null;
}
