export type LandingFeature = {
	name: string;
	description: string;
};

export type FeatureTier = 'standard' | 'premium' | 'champion';

export type ProductLanding = {
	headline: string;
	subhead: string;
	/** YouTube video id. Omit when the product has no public demo yet. */
	youtubeId?: string;
	requiresCore: boolean;
	features: Partial<Record<FeatureTier, LandingFeature[]>>;
};

export type CatalogFeature = {
	key: string;
	name: string;
	description: string | null;
	tier: FeatureTier;
};

/**
 * Audience copy for every product page. Add a YouTube id or a feature bullet here;
 * the shared page renders whatever this record contains.
 */
const landings: Record<string, ProductLanding> = {
	'morelord-character-export': {
		headline: 'View and share your Foundry character anywhere.',
		subhead:
			'Download a character from Foundry, open the sheet on the Morelord Gaming website, and share a link when you want someone else to see it.',
		youtubeId: 'FkbDyflfSpU',
		requiresCore: false,
		features: {
			standard: [
				{
					name: 'Your character, away from the table',
					description:
						'Import the file into My Characters and open the sheet in a browser between sessions.'
				},
				{
					name: 'A snapshot you can share',
					description:
						'Download prepared values and available artwork from the character sheet. Share a public link, or keep the character private. The Foundry character is left unchanged.'
				}
			]
		}
	},
	'morelord-journeys': {
		headline: "Camp, keep watch and rest, even when the party isn't traveling.",
		subhead:
			'Plan the route and resolve the travel day, then assign watches and a long rest. The party can camp without covering any ground.',
		youtubeId: 'wuTtNGgRsxc',
		requiresCore: true,
		features: {
			standard: [
				{
					name: 'Plan the route before you leave',
					description:
						'Set the distance, danger, and the checks for discovery, foraging, and navigation.'
				},
				{
					name: 'Play through the travel day',
					description:
						'Resolve weather, pace, encounters, discovery, foraging, navigation, and whether to press on.'
				},
				{
					name: 'See the supplies the party actually has',
					description:
						'Food and water are pooled from travelers and the shared party. Sleeping gear stays with the character who carries it.'
				},
				{
					name: 'Camp, keep watch, and rest',
					description:
						'Assign watches and camp actions, then see whether the long rest was interrupted. This still works when the party stays put.'
				}
			]
		}
	},
	'morelord-marketplace': {
		headline: 'Let the party shop, sell, and trade during the session.',
		subhead:
			'Players buy and sell from the item compendiums you enable, and move gear to another character or the shared party.',
		requiresCore: true,
		features: {
			standard: [
				{
					name: 'A shop the table can use',
					description:
						'Buy and sell through a player-facing workflow instead of stopping play to do the math.'
				},
				{
					name: 'Sell what a character is carrying',
					description: 'Turn eligible inventory into coin at the sale rate you set.'
				},
				{
					name: 'Buy from the compendiums you turned on',
					description: 'Players purchase from the catalogs offered to the world, at your rates.'
				},
				{
					name: 'Hand an item to someone else',
					description:
						'Move inventory to another character or the party. A connected GM applies the transfer, and currency stays put.'
				}
			],
			premium: [
				{
					name: 'Approve the deals you care about',
					description: 'Hold a purchase or a sale until you accept it.'
				},
				{
					name: 'Put a vendor on the map',
					description:
						'Build a scene shop with its own stock, prices, and restocking, and have it ready quickly.'
				}
			]
		}
	},
	'morelord-craftworks': {
		headline: 'Turn what the party finds into what they can make.',
		subhead:
			'Harvest, gather, and loot in Foundry, then browse the materials and recipes those finds can become.',
		requiresCore: true,
		features: {
			standard: [
				{
					name: 'Bring materials back from the adventure',
					description:
						'Run harvesting, gathering, encounter loot, and hoards, then browse the shared materials and recipes.'
				},
				{
					name: 'System Reference Document 5.1 recipes',
					description:
						'Use materials and recipes whose finished items come from the SRD 5.1 compendiums installed in the world.'
				},
				{
					name: 'System Reference Document 5.2 recipes',
					description:
						'Use materials and recipes whose finished items come from the SRD 5.2 compendium installed in the world.'
				}
			],
			premium: [
				{
					name: 'Finish the item',
					description:
						'Spend the recipe materials, make the check, track progress, and add the completed item.'
				},
				{
					name: "Player's Handbook recipes",
					description: 'Craft from that compendium when it is installed in the world.'
				},
				{
					name: "Dungeon Master's Guide recipes",
					description: 'Craft from that compendium when it is installed in the world.'
				}
			],
			champion: [
				{
					name: 'Monsters of Drakkenheim',
					description:
						"Use that book's components, harvesting notes, and recipes when the content is installed and Champion access is active."
				}
			]
		}
	},
	'morelord-encounters': {
		headline: 'Build a ready-to-run encounter from monsters you already have.',
		subhead:
			'Choose a difficulty, review the roster, and drag the creatures onto the scene. Morelord Encounters uses monster compendiums installed in the world.',
		requiresCore: true,
		features: {
			standard: [
				{
					name: 'Encounters from the System Reference Document',
					description:
						'Generate a roster from the SRD 5.1 and SRD 5.2 monsters available in the world.'
				}
			],
			premium: [
				{
					name: 'The other monster books in the world',
					description:
						'Include installed monster compendiums beyond the System Reference Document, including the core books you already own.'
				},
				{
					name: 'Guide Me when you want a prompt',
					description:
						'Answer a few questions and get an encounter, including a scene that is not a fight.'
				},
				{
					name: 'A story you can reshape',
					description:
						'Start from a written encounter, edit it for the campaign, and bring its roster into play.'
				}
			]
		}
	},
	'morelord-core': {
		headline: 'Connect your Foundry world to Morelord once.',
		subhead:
			'Core links the world to a Morelord Gaming account and shares membership, locations, and support tools with the other modules.',
		requiresCore: false,
		features: {
			standard: [
				{
					name: 'One account for the world',
					description:
						'Connect Foundry to a Morelord Gaming account so supported modules can see the membership.'
				},
				{
					name: 'Help that skips the repeat questions',
					description:
						'Download a diagnostic file for Morelord Gaming. Campaign notes and private information stay out of it.'
				},
				{
					name: 'Settings you can keep',
					description:
						'Export Morelord module configuration as a backup, or reuse it so another world starts from the same setup.'
				},
				{
					name: 'Locations the campaign can share',
					description:
						'Name places and the activities they allow, then assign a location to a scene.'
				}
			]
		}
	},
	'morelord-downtime': {
		headline: 'Give the party projects between adventures.',
		subhead:
			"Publish a downtime session, let players spend their characters' time, and keep unfinished projects for the next session. Downtime requires Tools Premium or Champion.",
		requiresCore: true,
		features: {
			premium: [
				{
					name: 'A session the party can plan around',
					description:
						'Set the place, the hours, who is included, and which activities are allowed, then publish it.'
				},
				{
					name: 'Projects that outlast the session',
					description:
						'Players spend time on characters they own. Unfinished projects stay available for a later session.'
				},
				{
					name: 'Training, commissions, and sourcing',
					description:
						'Track study with an instructor and hired work over campaign days. With Marketplace installed, committed time and gold can seek an item from a wishlist.'
				}
			]
		}
	}
};

export function getProductLanding(
	slug: string,
	fallback: { name: string; summary: string }
): ProductLanding {
	return (
		landings[slug] ?? {
			headline: fallback.name,
			subhead: fallback.summary,
			requiresCore: slug !== 'morelord-core',
			features: {}
		}
	);
}

export function publicFeatureTiers(
	slug: string,
	features: CatalogFeature[]
): Record<FeatureTier, LandingFeature[]> {
	const curated = landings[slug]?.features;
	if (curated) {
		return {
			standard: curated.standard ?? [],
			premium: curated.premium ?? [],
			champion: curated.champion ?? []
		};
	}

	const grouped: Record<FeatureTier, LandingFeature[]> = {
		standard: [],
		premium: [],
		champion: []
	};
	for (const feature of features) {
		const name = feature.name.trim();
		if (!name) continue;
		grouped[feature.tier].push({
			name,
			description: feature.description?.trim() ?? ''
		});
	}
	return grouped;
}

export type ProductCallToAction = {
	label: 'Create your free account' | 'Unlock premium features';
	href: string;
};

export function productCallToAction(input: {
	loggedIn: boolean;
	hasPremium: boolean;
	returnTo: string;
}): ProductCallToAction | null {
	if (input.hasPremium) return null;
	if (!input.loggedIn) {
		return {
			label: 'Create your free account',
			href: `/login?returnTo=${encodeURIComponent(input.returnTo)}`
		};
	}
	return { label: 'Unlock premium features', href: '/pricing' };
}
