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

	const markdownFiles = filesBelow(docsSource).filter(
		(path) => extname(path).toLowerCase() === '.md'
	);
	const readme = markdownFiles.find((path) => basename(path).toLowerCase() === 'readme.md');
	if (!readme) throw new Error(`${product.slug} must provide docs/README.md`);

	const documentRoutes = new Map();
	const seenRoutes = new Set();
	for (const sourceFile of markdownFiles) {
		const markdown = readFileSync(sourceFile, 'utf8');
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
		const markdown = readFileSync(sourceFile, 'utf8');
		writeFileSync(targetFile, rewriteLinks(markdown, product.slug, documentRoutes, sourceFile));
	}

	const sourceAssets = join(docsSource, 'assets');
	if (existsSync(sourceAssets))
		cpSync(sourceAssets, join(assetsTarget, 'assets'), { recursive: true });
	console.log(`Synced ${markdownFiles.length} documents for ${product.slug}.`);
}
