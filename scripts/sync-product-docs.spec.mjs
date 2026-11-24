import { describe, expect, it } from 'vitest';
import { configuredMarkdown, stripFrontmatter } from './sync-product-docs.mjs';

describe('sync-product-docs configured frontmatter', () => {
	it('replaces invalid module YAML when the registry defines the document', () => {
		const brokenTelemetry = `---
title: Morelord Core: Usage and Error Reporting
description: Reporting consent
slug: morelord-core/telemetry
product: morelord-core
version: 0.9.4
---

# Usage`;

		const document = {
			title: 'Morelord Core: Usage and Error Reporting',
			description: 'Reporting consent, privacy, event coverage, and troubleshooting.',
			slug: 'morelord-core/telemetry',
			audience: 'game-master',
			version: '0.9.4',
			foundry: 14
		};

		const synced = configuredMarkdown(brokenTelemetry, { slug: 'morelord-core' }, document);
		expect(synced).toContain('title: "Morelord Core: Usage and Error Reporting"');
		expect(synced).toContain('version: "0.9.4"');
		expect(stripFrontmatter(synced)).toMatch(/^# Usage/);
	});
});