import { compile as compileMarkdown } from 'mdsvex';
import { compile as compileSvelte } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';
import { escapeLiteralBraces, escapeProductDocBraces } from './escape-product-doc-braces';

const productDoc = '/src/lib/content/product-docs/morelord-craftworks/gm-manual.md';

const manual = `---
title: "Keep {frontmatter}"
---

Choose **Place in {party name} Inventory**.

Call \`api.openHoard({ profileId: "5-10" })\` when ready.

\`\`\`js
api.openHoard({ profileId: "5-10" })
\`\`\`
`;

describe('product doc braces', () => {
	it('escapes prose braces and leaves code-span braces to render', async () => {
		expect(escapeLiteralBraces('Place in {party name} Inventory')).toBe(
			'Place in &#123;party name&#125; Inventory'
		);
		expect(escapeLiteralBraces(escapeLiteralBraces('{party}'))).toBe('&#123;party&#125;');

		const prose = { type: 'text', value: 'Place in {party name} Inventory' };
		const codeSpan = { type: 'inlineCode', value: 'api.openHoard({ profileId: "5-10" })' };
		const fenced = { type: 'code', value: 'api.openHoard({ profileId: "5-10" })' };
		escapeProductDocBraces()(
			{ type: 'root', children: [{ type: 'paragraph', children: [prose, codeSpan] }, fenced] },
			{ filename: productDoc }
		);
		expect(prose.value).toBe('Place in &#123;party name&#125; Inventory');
		expect(codeSpan.value).toBe('api.openHoard({ profileId: "5-10" })');
		expect(fenced.value).toBe('api.openHoard({ profileId: "5-10" })');

		const compiled = await compileMarkdown(manual, {
			filename: productDoc,
			extensions: ['.md'],
			remarkPlugins: [escapeProductDocBraces]
		});
		expect(compiled?.code).toContain('Place in &#123;party name&#125; Inventory');
		expect(compiled?.code).toContain('api.openHoard(&#123; profileId: "5-10" &#125;)');

		const svelte = compileSvelte(compiled?.code ?? '', {
			filename: 'gm-manual.svelte',
			generate: 'server',
			css: 'injected'
		});
		expect(svelte.js.code).toContain('Keep {frontmatter}');
		expect(svelte.js.code).toContain('Place in {party name} Inventory');
		expect(svelte.js.code).toContain('api.openHoard({ profileId: "5-10" })');
		expect(svelte.js.code).not.toContain('stringify');
	});

	it('still rejects unescaped prose braces', async () => {
		const compiled = await compileMarkdown('Place in {party name} Inventory.', {
			filename: productDoc,
			extensions: ['.md']
		});
		expect(() =>
			compileSvelte(compiled?.code ?? '', {
				filename: 'gm-manual.svelte',
				generate: 'server',
				css: 'injected'
			})
		).toThrow(/Expected token/);
	});
});
