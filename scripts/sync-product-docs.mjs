import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = join(projectRoot, 'scripts', 'product-docs.json');
const contentRoot = join(projectRoot, 'src', 'lib', 'content', 'product-docs');
const assetsRoot = join(projectRoot, 'static', 'docs-assets');
const args = process.argv.slice(2);
const sourceRootArg = args.indexOf('--source-root');
const sourceRoot = resolve(
	sourceRootArg >= 0 && args[sourceRootArg + 1]
		? args[sourceRootArg + 1]
		: join(projectRoot, '.product-docs')
);
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));

function assertGeneratedPath(path, root) {
	const relativePath = relative(root, path);
	if (!relativePath || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
		throw new Error(`Refusing to replace unexpected generated path: ${path}`);
	}
}

function filesBelow(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		return entry.isDirectory() ? filesBelow(path) : [path];
	});
}

function frontmatterValue(markdown, key) {
	const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!frontmatter) return null;
	const match = frontmatter[1].match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'));
	return match?.[1]?.replace(/^['"]|['"]$/g, '') ?? null;
}

function configuredMarkdown(markdown, product, document) {
	if (!document || markdown.startsWith('---\n') || markdown.startsWith('---\r\n')) {
		return markdown;
	}

	const metadata = {
		title: document.title,
		description: document.description,
		slug: document.slug,
		product: product.slug,
		audience: document.audience,
		version: document.version,
		foundry: document.foundry,
		order: document.order
	};
	const frontmatter = Object.entries(metadata)
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
		.join('\n');
	return `---\n${frontmatter}\n---\n\n${markdown}`;
}

function routeForDocument(productSlug, markdown, filename) {
	const declaredSlug = frontmatterValue(markdown, 'slug');
	if (declaredSlug) return `/docs/${declaredSlug.replace(/^\/+|\/+$/g, '')}`;
	return basename(filename).toLowerCase() === 'readme.md'
		? `/docs/${productSlug}`
		: `/docs/${productSlug}/${basename(filename, extname(filename))}`;
}

function rewriteLinks(markdown, productSlug, documentRoutes, sourceFile) {
	return markdown.replace(/(!?)\[([^\]]*)\]\(([^)]+)\)/g, (match, image, label, target) => {
		const [path, suffix = ''] = target.split(/(?=[?#])/u, 2);
		if (/^(?:[a-z]+:|\/|#)/iu.test(path)) return match;

		if (image && path.startsWith('assets/')) {
			const assetPath = join(dirname(sourceFile), path);
			if (!existsSync(assetPath))
				throw new Error(`Missing image referenced by ${sourceFile}: ${path}`);
			return `![${label}](/docs-assets/${productSlug}/${path.split(sep).join('/')}${suffix})`;
		}

		if (!image && path.toLowerCase().endsWith('.md')) {
			const linkedFile = resolve(dirname(sourceFile), path);
			const route = documentRoutes.get(linkedFile);
			if (!route) throw new Error(`Missing document referenced by ${sourceFile}: ${path}`);
			return `[${label}](${route}${suffix})`;
		}

		return match;
	});
}

for (const product of registry.products) {
	const docsSource = join(sourceRoot, product.slug, product.docsPath);
	if (!existsSync(docsSource)) {
		throw new Error(
			`Documentation source not found for ${product.slug}: ${docsSource}. ` +
				'Check out the product repository there or pass --source-root.'
		);
	}

	const configuredDocuments = new Map(
		(product.documents ?? []).map((document) => [resolve(docsSource, document.source), document])
	);
	const markdownFiles = configuredDocuments.size
		? [...configuredDocuments.keys()]
		: filesBelow(docsSource).filter((path) => extname(path).toLowerCase() === '.md');
	for (const sourceFile of markdownFiles) {
		if (!existsSync(sourceFile)) throw new Error(`Configured document not found: ${sourceFile}`);
	}

	const markdownBySource = new Map(
		markdownFiles.map((sourceFile) => [
			resolve(sourceFile),
			configuredMarkdown(
				readFileSync(sourceFile, 'utf8'),
				product,
				configuredDocuments.get(resolve(sourceFile))
			)
		])
	);

	const documentRoutes = new Map();
	const seenRoutes = new Set();
	for (const sourceFile of markdownFiles) {
		const markdown = markdownBySource.get(resolve(sourceFile));
		for (const requiredKey of ['title', 'product']) {
			if (!frontmatterValue(markdown, requiredKey)) {
				throw new Error(`${sourceFile} is missing required frontmatter: ${requiredKey}`);
			}
		}
		if (frontmatterValue(markdown, 'product') !== product.slug) {
			throw new Error(`${sourceFile} has a product value that does not match ${product.slug}`);
		}
		const route = routeForDocument(product.slug, markdown, sourceFile);
		if (seenRoutes.has(route)) throw new Error(`Duplicate documentation route: ${route}`);
		seenRoutes.add(route);
		documentRoutes.set(resolve(sourceFile), route);
	}
	if (!seenRoutes.has(`/docs/${product.slug}`)) {
		throw new Error(`${product.slug} must provide a documentation landing route`);
	}

	const contentTarget = join(contentRoot, product.slug);
	const assetsTarget = join(assetsRoot, product.slug);
	assertGeneratedPath(contentTarget, contentRoot);
	assertGeneratedPath(assetsTarget, assetsRoot);
	rmSync(contentTarget, { recursive: true, force: true });
	rmSync(assetsTarget, { recursive: true, force: true });
	mkdirSync(contentTarget, { recursive: true });

	for (const sourceFile of markdownFiles) {
		const targetFile = join(contentTarget, relative(docsSource, sourceFile));
		mkdirSync(dirname(targetFile), { recursive: true });
		const markdown = markdownBySource.get(resolve(sourceFile));
		writeFileSync(targetFile, rewriteLinks(markdown, product.slug, documentRoutes, sourceFile));
	}

	const sourceAssets =
		product.assetsPath === null ? null : join(docsSource, product.assetsPath ?? 'assets');
	if (sourceAssets && existsSync(sourceAssets))
		cpSync(sourceAssets, join(assetsTarget, 'assets'), { recursive: true });
	console.log(`Synced ${markdownFiles.length} documents for ${product.slug}.`);
}
