export type LandingFeature = {
	name: string;
	description: string;
};

export type FeatureTier = 'standard' | 'premium' | 'champion';

export type LandingVideo = {
	youtubeId: string;
	caption: string;
};

export type SheetPreview = {
	src: string;
	alt: string;
};

export type LandingRequirements = {
	title: string;
	body: string;
};

export type ProductLanding = {
	headline: string;
	subhead: string;
	/** Two or three short paragraphs under the headline. */
	description: string[];
	/**
	 * One short line for the hero. When set, the longer description moves below the demo video.
	 */
	benefit?: string;
	/** Plain line under the benefit, above the account button. */
	freeAccount?: string;
	/** Screenshot of a finished shared character sheet. */
	sheetPreview?: SheetPreview;
	/** Replaces the default no-Core requirements card. */
	requirements?: LandingRequirements;
	/** YouTube video id for the demo near the top. Omit when the product has no public demo yet. */
	youtubeId?: string;
	/** Extra demos rendered below the feature list. */
	secondaryVideos?: LandingVideo[];
	requiresCore: boolean;
	features: Partial<Record<FeatureTier, LandingFeature[]>>;
};

export const moduleInstallerBlurb =
	'Morelord Gaming modules can be installed directly from the Foundry native module installer. Just search for "morelord".';

const roadToPhandalin: LandingVideo = {
	youtubeId: 'kubQ5qZ6B0I',
	caption: 'See it in a full campaign: Road to Phandalin'
};

const campingWithoutTravel: LandingVideo = {
	youtubeId: 'wuTtNGgRsxc',
	caption: 'Camping without traveling: a short use-case demo'
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
		headline: 'View and share your Foundry characters anywhere.',
		subhead:
			'Download a character from Foundry, open the sheet on the Morelord Gaming website, and share a link when you want someone else to see it.',
		benefit:
			'Create a free account to import characters that you or your GM exported with Morelord Character Export. See every detail of your sheet in any browser, and share it with anyone.',
		freeAccount:
			'A free account lets you import the character under My Characters, open the sheet in a browser, and share a public link.',
		sheetPreview: {
			src: '/branding/chuck-shared-sheet.png',
			alt: "Chuck's shared character sheet on Morelord Gaming, with hit points, armor class, and ability scores."
		},
		requirements: {
			title: 'No account to export',
			body: 'Exporting from Foundry needs no Morelord account and no Morelord Core. A free account is only for viewing and sharing the character on the website.'
		},
		description: [
			'Morelord Character Export is for players and GMs who want a character somewhere other than the table. From the character sheet in Foundry, you download a file. The character there is left unchanged.',
			'The file is a snapshot. It carries the character data, the values the sheet had already prepared, and the artwork that was available. A later change in Foundry does not update the copy until you export again.',
			'A free Morelord Gaming account is enough to import the file into My Characters, open the sheet in a browser, and share a link or keep the character private. Exporting does not require Morelord Core.'
		],
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
		description: [
			'Morelord Journeys is for the GM running the road and for the players answering the checks. You plan the route and the party, then play the travel day instead of skipping to the destination.',
			'A day can include weather, pace, encounters, discovery, foraging, navigation, and whether to press on. Food and water are pooled from the travelers and the shared party. Tents, bedrolls, and blankets stay with the person carrying them.',
			'When the party stops, you assign watches and camp, then see whether the long rest was interrupted. Camping works even when nobody traveled. The GM keeps the expedition record, and players use the roll requests on their characters.'
		],
		youtubeId: 'T4_9GPdveBw',
		secondaryVideos: [campingWithoutTravel, roadToPhandalin],
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
		description: [
			'Morelord Marketplace is for a table that wants to shop, sell, and move gear during the session. Players work from the characters they have. The GM chooses which item compendiums are for sale and sets the sale rate.',
			'A player can sell what a character is carrying, buy from those compendiums, or hand an item to another character or the shared party. Payment can come from the character or from the party, and the item goes to the character you chose. A transfer does not move coin. A connected GM applies it.',
			'With Tools Premium or Champion, a purchase or a sale can wait until you accept it. You can also place a vendor on a scene, with its own stock, prices, and restocking.'
		],
		youtubeId: 'jLHKF39rGjM',
		secondaryVideos: [roadToPhandalin],
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
		description: [
			'Morelord Craftworks is for a party that comes back with materials and wants to see what those finds can become. The GM starts harvesting, gathering, encounter loot, and hoards. Players browse the materials and recipes.',
			"Materials are ordinary items. They can live in a character's inventory or with the shared party. The character doing the work still brings the tools, the proficiency, and the check.",
			'Recipes whose finished items come from the System Reference Document compendiums in the world are included. Finishing the item, and recipes from other books you have installed, are part of Tools Premium. Monsters of Drakkenheim components and recipes are part of Champion access when that content is installed.'
		],
		youtubeId: 'qmcmKaunt40',
		secondaryVideos: [roadToPhandalin],
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
		description: [
			'Morelord Encounters is a GM tool for building a scene from monsters already in the world. It looks at the party, aims at a difficulty, and gives you a roster to review before anything reaches the table.',
			'The included encounters use System Reference Document monsters from the world. Tools Premium can draw on the other monster compendiums you have installed. You can also start from a written encounter, edit it for the campaign, and bring that roster into play.',
			'Open a creature from the roster or drag it onto the scene, and save the encounter for later in this world. With Tools Premium, Guide Me can offer a situation from a few questions, including a scene that is not a fight.'
		],
		youtubeId: 'xADXldd1oRE',
		secondaryVideos: [roadToPhandalin],
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
		description: [
			'Morelord Core is for the GM connecting a Foundry world. Players do not connect the account. One connection lets the other Morelord modules see the membership for that world.',
			'Foundry shows a short-lived code. You approve it on the Morelord Gaming website, then come back. You can refresh access after a membership change, open your account, or disconnect the world. Disconnecting does not delete the campaign.',
			'Core also keeps a few shared tools: a diagnostic file for Morelord Gaming that leaves campaign notes out, a settings backup you can reuse in another world, locations you can assign to a scene, the distance to another visible token when you hover it, and a mark on a token after that creature uses its reaction. In a sidebar directory, you can select several documents and delete them together.'
		],
		youtubeId: '2advzIa3o9Q',
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
				},
				{
					name: 'Distance when you hover a token',
					description:
						'See how far another visible token is. Each player can turn the indicator off.'
				},
				{
					name: 'A mark when a reaction is used',
					description:
						'Core can mark a token after a creature uses its reaction in combat, then clear the mark at the start of its next turn.'
				},
				{
					name: 'Delete several documents',
					description:
						'Select multiple entries in a sidebar directory, review the names, and delete them together.'
				}
			]
		}
	},
	'morelord-downtime': {
		headline: 'Give the party projects between adventures.',
		subhead:
			"Publish a downtime session, let players spend their characters' time, and keep unfinished projects for the next session. Downtime requires Tools Premium or Champion.",
		description: [
			'Morelord Downtime is for the stretch between adventures. It requires Tools Premium or Champion. The GM sets the place, the hours, who is included, and which activities are allowed, then publishes the session.',
			'Players spend time on characters they own. A project that is not finished stays available for a later session. Training follows study with an instructor. A commission tracks hired work across campaign days. Choosing the item does not buy it, craft it, or deliver it.',
			"With Marketplace installed, committed time and gold can seek an item from a character's wishlist. With Craftworks installed, crafting projects open there. With Journeys installed, completed travel days can move the campaign calendar forward."
		],
		youtubeId: 'kubQ5qZ6B0I',
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
	},
	'morelord-game-master': {
		headline: 'Your in-game Dungeon Master Screen.',
		subhead:
			'Every DM needs a screen. Now yours lives inside Foundry, with roll requests, rewards, macros, sound, and a rules cheat sheet your players never see.',
		description: [
			'Morelord Game Master is for the GM running a D&D 5e table in Foundry. It opens one window that only the GM sees. Players never open it, but they receive the roll requests you send.',
			'Request checks and saves from the party, hand out XP, coins, and Heroic Inspiration in one step, and keep your macros, playlists, and ambience close at hand. Triggers react to moments in play, and you turn each one on or off to suit your table.',
			'Requires Foundry VTT v14 or newer, the D&D 5e system 6.0 or newer, and Morelord Core 0.8.0 or newer.'
		],
		youtubeId: '4zSk2jdiglM',
		requiresCore: true,
		features: {
			standard: [
				{
					name: 'Ask the table for a roll',
					description:
						'Send ability checks, skill checks, and saving throws to players as native Foundry rolls, including blind rolls.'
				},
				{
					name: 'Reward the party in one step',
					description:
						'Give or split coins and XP, grant or clear Heroic Inspiration, and undo the last bulk action.'
				},
				{
					name: 'Sound and macros at hand',
					description:
						'Run your macros from one place, start playlists and ambience, and stop all sound with one click.'
				},
				{
					name: 'Triggers you control',
					description:
						'Let moments in play react automatically, and turn each trigger on or off to suit your table.'
				},
				{
					name: 'Rules behind the screen',
					description:
						'Look up conditions, actions, DCs, exhaustion, travel pace, and other D&D 5e rules without leaving the game.'
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
			description: fallback.summary ? [fallback.summary] : [],
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
