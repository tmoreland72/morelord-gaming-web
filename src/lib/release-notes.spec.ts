import { describe, expect, it } from 'vitest';
import {
	publicReleaseChange,
	renderReleaseMarkdown,
	stripInternalReleaseNotes
} from './release-notes';

describe('stripInternalReleaseNotes', () => {
	it('removes the local /tmp working-file sentence and keeps the public one', () => {
		expect(
			stripInternalReleaseNotes(
				'Added a manifest changelog link and moved release history into `release-notes/`. Local working files belong in ignored `/tmp/`.'
			)
		).toBe('Added a manifest changelog link and moved release history into `release-notes/`.');
	});

	it('drops a change that is only about release staging', () => {
		expect(
			publicReleaseChange(
				'Release staging and generated ZIP files use module-local `/tmp/`; ZIP validation rejects working files and release-note sources.'
			)
		).toBeNull();
	});

	it('drops packaging notes about demo artwork and the runtime ZIP', () => {
		expect(
			stripInternalReleaseNotes(
				'Removed obsolete demo/video working notes and kept demo-production artwork out of the runtime ZIP.'
			)
		).toBe('');
	});
});

describe('renderReleaseMarkdown', () => {
	it('renders Journeys saved-journey emphasis and strips nothing public', () => {
		const html = renderReleaseMarkdown(
			'Added named Saved Journeys. Use **Save Journey** to keep a planner setup and **Choose Saved Journey** to open its manager.'
		);
		expect(html).toContain('<strong>Save Journey</strong>');
		expect(html).toContain('<strong>Choose Saved Journey</strong>');
		expect(html).not.toContain('**');
	});

	it('renders inline code after internal notes are removed', () => {
		const html = renderReleaseMarkdown(
			'Moved release history into `release-notes/`. Local working files belong in ignored `/tmp/`.'
		);
		expect(html).toContain('<code>release-notes/</code>');
		expect(html).not.toContain('/tmp/');
	});

	it('escapes raw HTML and refuses non-http links', () => {
		const html = renderReleaseMarkdown(
			'<script>alert(1)</script> [notes](javascript:alert(1)) **Safe**'
		);
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
		expect(html).not.toContain('href="javascript:');
		expect(html).toContain('<strong>Safe</strong>');
	});
});
