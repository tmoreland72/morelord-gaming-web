import { page } from 'vitest/browser';
import { expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CharacterSheet from './CharacterSheet.svelte';
import { readActorJson } from '../import/read-actor-file';
import type { StoredCharacter } from '../models/stored-character';

it('marks selected weapon masteries in character traits and all matching inventory copies', async () => {
	render(CharacterSheet, {
		character: {
			localId: 'masteries',
			name: 'Fighter',
			actorType: 'character',
			sourceFileName: 'fighter.json',
			importedAt: '2026-09-25',
			actor: {
				name: 'Fighter',
				type: 'character',
				effects: [],
				system: {
					traits: {
						weaponProf: {
							value: ['sim', 'mar', 'spear'],
							mastery: { value: ['handaxe', 'javelin', 'lighthammer', 'spear'] }
						}
					}
				},
				items: [
					{
						name: 'Spear',
						type: 'weapon',
						system: { type: { baseItem: 'spear' }, mastery: 'sap' }
					},
					{
						name: 'Enchanted Spear',
						type: 'weapon',
						system: { type: { baseItem: 'spear' }, mastery: 'sap' }
					},
					{
						name: 'Greatsword',
						type: 'weapon',
						system: { type: { baseItem: 'greatsword' }, mastery: 'graze' }
					},
					{ name: 'Unspecified Weapon', type: 'weapon', system: {} }
				]
			}
		}
	});
	await page.getByRole('button', { name: 'Character', exact: true }).click();
	const tags = [...document.querySelectorAll('.trait-tag')];
	for (const name of ['Handaxe', 'Javelin', 'Light Hammer', 'Spear']) {
		const matches = tags.filter((tag) => tag.textContent?.includes(name));
		expect(matches).toHaveLength(1);
		expect(matches[0].querySelector('[aria-label="Weapon Mastery"]')).not.toBeNull();
	}
	for (const name of ['Simple', 'Martial']) {
		expect(
			tags.find((tag) => tag.textContent?.includes(name))?.querySelector('.weapon-mastery')
		).toBeNull();
	}
	await page.getByRole('button', { name: 'Inventory', exact: true }).click();
	await expect
		.element(page.getByRole('button', { name: 'View details for Spear', exact: true }))
		.toBeVisible();
	const rows = [...document.querySelectorAll('.inventory-tab .item-row')];
	for (const name of ['Spear', 'Enchanted Spear']) {
		expect(
			rows
				.find((row) => row.querySelector('strong')?.textContent?.trim() === name)
				?.querySelector('.weapon-mastery')
		).not.toBeNull();
	}
	expect(document.querySelectorAll('.inventory-tab .weapon-mastery')).toHaveLength(2);
});

it('shows a read-only sheet without portrait editing when shared', async () => {
	render(CharacterSheet, {
		character: {
			localId: 'shared',
			name: 'Shared Hero',
			actorType: 'character',
			sourceFileName: 'hero.json',
			importedAt: '2026-09-25',
			actor: {
				name: 'Shared Hero',
				type: 'character',
				system: {
					details: {
						biography: {
							value:
								'<p>Safe biography</p><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">Unsafe link</a><script>alert(1)</script>'
						}
					}
				},
				items: [],
				effects: []
			}
		}
	});
	await expect.element(page.getByRole('button', { name: 'Shared Hero portrait' })).toBeDisabled();
	await expect.element(page.getByRole('button', { name: 'Inventory', exact: true })).toBeEnabled();
	await page.getByRole('button', { name: 'Biography', exact: true }).click();
	await expect.element(page.getByText('Safe biography', { exact: true })).toBeVisible();
	const biography = document.querySelector('.biography-content')!;
	expect(biography.querySelector('script, [onerror], [href^="javascript:"]')).toBeNull();
});

it('keeps imported artwork and descriptions, expands proficiencies, and downloads proxy-backed diagnostics', async () => {
	const image =
		'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ZkAAAAASUVORK5CYII=';
	const imported = readActorJson(
		'test.morelord-character.json',
		JSON.stringify({
			format: 'morelord-character',
			formatVersion: 3,
			actor: {
				name: 'Test Character',
				type: 'character',
				system: {
					traits: {
						armorProf: { value: ['lgt', 'med', 'shl'] },
						weaponProf: { value: ['sim', 'mar'] }
					},
					details: { biography: { value: 'Private biography' } }
				},
				items: ['class', 'race', 'background', 'weapon', 'equipment', 'spell', 'feat'].map(
					(type) => ({
						_id: type,
						type,
						name: `Test ${type}`,
						img: `modules/test/${type}.png`,
						system: {
							description: { value: type === 'equipment' ? '' : `<p>Description for ${type}</p>` },
							levels: 2
						}
					})
				),
				effects: []
			},
			assets: {
				images: { icon: { data: image, embedded: true } },
				references: {
					items: Object.fromEntries(
						['class', 'race', 'background', 'weapon', 'equipment', 'spell', 'feat'].map((type) => [
							type,
							'icon'
						])
					)
				}
			}
		})
	);
	// Like Svelte's deep state, these readable proxies cannot be structured-cloned.
	imported.actor.system.details = new Proxy(imported.actor.system.details as object, {});
	for (const item of imported.actor.items) item.system = new Proxy(item.system!, {});
	const character: StoredCharacter = {
		...imported,
		localId: 'test',
		name: imported.actor.name,
		actorType: 'character',
		sourceFileName: imported.fileName,
		importedAt: '2026-09-14'
	};
	let reportBlob: Blob | undefined;
	const createUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
		reportBlob = blob as Blob;
		return 'blob:diagnostic-test';
	});
	const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
	try {
		render(CharacterSheet, { character, onPortraitChange: () => {} });
		for (const label of ['Light', 'Medium', 'Shields', 'Simple', 'Martial']) {
			await expect.element(page.getByRole('main').getByText(label, { exact: true })).toBeVisible();
		}
		for (const [tab, type] of [
			['Character', 'class'],
			['Character', 'race'],
			['Character', 'background'],
			['Inventory', 'weapon'],
			['Inventory', 'equipment'],
			['Spellbook', 'spell'],
			['Features', 'feat']
		]) {
			await page.getByRole('button', { name: tab, exact: true }).click();
			const button = page.getByRole('button', {
				name: `View details for Test ${type}`,
				exact: true
			});
			await expect.element(button).toBeEnabled();
			await button.click();
			await expect
				.element(
					page.getByText(
						type === 'equipment'
							? 'No description was included in the export.'
							: `Description for ${type}`,
						{ exact: true }
					)
				)
				.toBeVisible();
			const dialogImage = document.querySelector<HTMLImageElement>('.item-details-dialog img');
			expect(dialogImage?.getAttribute('src')).toBe(image);
			await page.getByRole('button', { name: 'Close details', exact: true }).click();
		}
		await page.getByRole('button', { name: 'Diagnostics', exact: true }).click();
		await page.getByRole('button', { name: 'Download Report', exact: true }).click();
		await expect
			.element(page.getByText('Diagnostic report downloaded.', { exact: true }))
			.toBeVisible();
		const report = JSON.parse(await reportBlob!.text());
		expect(report.actorSystem.details.biography).toBe('[content removed]');
		expect(
			report.representativeItems.every(
				(item: { system: { description: string } }) =>
					item.system.description === '[content removed]'
			)
		).toBe(true);
		expect(imported.actor.items[0].system?.description).toEqual({
			value: '<p>Description for class</p>'
		});
	} finally {
		createUrl.mockRestore();
		click.mockRestore();
	}
});
