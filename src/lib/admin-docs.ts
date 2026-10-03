export const adminDocGuides = [
	{
		slug: 'authentication',
		title: 'Authentication',
		description: 'Configure sign-in, OAuth, and administrator access.'
	},
	{
		slug: 'deployment',
		title: 'Cloudflare deployment',
		description: 'Deployment, database migrations, secrets, and custom domains.'
	},
	{
		slug: 'stripe',
		title: 'Stripe subscriptions',
		description: 'Products, prices, webhooks, billing, and promotions.'
	},
	{
		slug: 'discord',
		title: 'Discord integration',
		description: 'Account linking, bot setup, and membership roles.'
	},
	{
		slug: 'installations',
		title: 'Foundry installations',
		description: 'Worlds, account activity, product adoption, and version statistics.'
	},
	{
		slug: 'release-automation',
		title: 'Release automation',
		description: 'Publish releases and maintain the public release feed.'
	}
] as const;
