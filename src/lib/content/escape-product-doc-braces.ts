/**
 * Product manuals are compiled by mdsvex as Svelte components. A literal `{` in
 * prose is parsed as an expression, so text such as `{party name}` fails the build.
 *
 * Remark decodes a source-level `&#123;` back into `{` before that compile, so
 * the entities have to be written onto the parsed prose. Fenced code and inline
 * code are separate nodes; mdsvex already escapes braces there, and they must
 * stay untouched so `` `api.openHoard({ profileId: "5-10" })` `` still renders.
 */

type MarkdownNode = {
	type: string;
	value?: string;
	url?: string;
	title?: string | null;
	alt?: string | null;
	children?: MarkdownNode[];
};

type MarkdownFile = {
	filename?: string;
	path?: string;
};

const protectedOpen = '\uE000';
const protectedClose = '\uE001';

export function escapeLiteralBraces(value: string): string {
	return value
		.replaceAll('&#123;', protectedOpen)
		.replaceAll('&#125;', protectedClose)
		.replaceAll('{', '&#123;')
		.replaceAll('}', '&#125;')
		.replaceAll(protectedOpen, '&#123;')
		.replaceAll(protectedClose, '&#125;');
}

function isProductDoc(file: MarkdownFile): boolean {
	const name = file.filename ?? file.path ?? '';
	return name.replaceAll('\\', '/').includes('/product-docs/');
}

function visit(node: MarkdownNode, visitNode: (node: MarkdownNode) => void) {
	visitNode(node);
	if (node.type === 'code' || node.type === 'inlineCode' || !node.children) return;
	for (const child of node.children) visit(child, visitNode);
}

function escapeNode(node: MarkdownNode) {
	if (node.type === 'code' || node.type === 'inlineCode') return;
	if ((node.type === 'text' || node.type === 'html') && typeof node.value === 'string') {
		node.value = escapeLiteralBraces(node.value);
	}
	if (typeof node.url === 'string') node.url = escapeLiteralBraces(node.url);
	if (typeof node.title === 'string') node.title = escapeLiteralBraces(node.title);
	if (typeof node.alt === 'string') node.alt = escapeLiteralBraces(node.alt);
}

export function escapeProductDocBraces() {
	return (tree: MarkdownNode, file: MarkdownFile) => {
		if (!isProductDoc(file)) return;
		visit(tree, escapeNode);
	};
}
