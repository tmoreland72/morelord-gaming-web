import { describe, expect, it } from 'vitest';
import { getProductDoc, getProductDocGroups } from './product-docs';

describe('product documentation modules', () => {
	it('loads every product landing page for the docs index', () => {
		const groups = getProductDocGroups();
		expect(groups.length).toBeGreaterThanOrEqual(8);
		expect(groups.map((group) => group.href)).toContain('/docs/morelord-core');
	});

	it('resolves Core telemetry and encounters manuals after docs sync', () => {
		expect(getProductDoc('morelord-core', 'telemetry')?.metadata.version).toBe('0.9.4');
		expect(getProductDoc('morelord-encounters', 'gm-manual')?.metadata.slug).toBe(
			'morelord-encounters/gm-manual'
		);
	});
});