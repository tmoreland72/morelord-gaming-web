<script lang="ts">
	let { discordInviteUrl }: { discordInviteUrl: string } = $props();

	type SocialIconName = 'discord' | 'etsy' | 'facebook' | 'x' | 'instagram';

	type SocialLink = {
		id: SocialIconName;
		href: string;
		label: string;
	};

	// Simple Icons brand marks, inlined so the footer does not take a new dependency.
	const socialIcons: Record<SocialIconName, string> = {
		discord:
			'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z',
		etsy: 'M8.559 2.445c0-.325.033-.52.59-.52h7.465c1.3 0 2.02 1.11 2.54 3.193l.42 1.666h1.27c.23-4.728.43-6.784.43-6.784s-3.196.36-5.09.36H6.635L1.521.196v1.37l1.725.326c1.21.24 1.5.496 1.6 1.606 0 0 .11 3.27.11 8.64 0 5.385-.09 8.61-.09 8.61 0 .973-.39 1.333-1.59 1.573l-1.722.33V24l5.13-.165h8.55c1.935 0 6.39.165 6.39.165.105-1.17.75-6.48.855-7.064h-1.2l-1.284 2.91c-1.005 2.28-2.476 2.445-4.11 2.445h-4.906c-1.63 0-2.415-.64-2.415-2.05V12.8s3.62 0 4.79.096c.912.064 1.463.325 1.76 1.598l.39 1.695h1.41l-.09-4.278.192-4.305h-1.391l-.45 1.89c-.283 1.244-.48 1.47-1.754 1.6-1.666.17-4.815.14-4.815.14V2.45h-.05z',
		facebook:
			'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
		x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
		instagram:
			'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077'
	};

	// Add a network by appending an entry. Icon paths for X and Instagram are already above.
	const socialLinks = $derived<SocialLink[]>([
		{ id: 'discord', href: discordInviteUrl, label: 'Join our Discord' },
		{ id: 'etsy', href: 'https://www.etsy.com/shop/MorelordGaming', label: 'Shop on Etsy' },
		{
			id: 'facebook',
			href: 'https://www.facebook.com/profile.php?id=61595274225719',
			label: 'Follow us on Facebook'
		}
		// TODO: X — no account yet, so this stays commented out with no live link.
		// { id: 'x', href: '', label: 'Morelord Gaming on X' },
		// TODO: Instagram — no account yet, so this stays commented out with no live link.
		// { id: 'instagram', href: '', label: 'Morelord Gaming on Instagram' }
	]);
</script>

<footer class="site-footer">
	<div class="shell footer-grid">
		<div class="footer-brand">
			<img src="/branding/morelord-gaming-logo.png" alt="Morelord Gaming" />
			<p>
				Professional online adventures and practical Foundry VTT tools—built by a game master, for
				game masters and players.
			</p>
			<nav class="social-links" aria-label="Social media">
				<ul>
					{#each socialLinks as link (link.id)}
						<li>
							<a
								href={link.href}
								target="_blank"
								rel="external noreferrer"
								aria-label={link.label}
								title={link.label}
							>
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<path d={socialIcons[link.id]} />
								</svg>
							</a>
						</li>
					{/each}
				</ul>
			</nav>
		</div>
		<div>
			<h3>Morelord Gaming</h3>
			<a href="/adventures">Adventures</a>
			<a
				href="https://startplaying.games/gm/morelord-gaming"
				target="_blank"
				rel="external noreferrer">StartPlaying profile</a
			>
			<a href="/tools">Foundry Tools</a>
			<a href="/pricing">Tools memberships</a>
		</div>
		<div>
			<h3>Resources</h3>
			<a href="/docs">Documentation</a>
			<a href="/releases">Product updates</a>
			<a href="/account">Customer account</a>
		</div>
		<div>
			<h3>Support & Legal</h3>
			<a href="/support">Contact us</a>
			<a href="/privacy">Privacy Policy</a>
			<a href="/terms">Terms of Service</a>
		</div>
	</div>
	<div class="shell copyright">
		© {new Date().getFullYear()} Morelord Gaming. All rights reserved.
	</div>
</footer>

<style>
	.social-links ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
		margin: 1.15rem 0 0;
		padding: 0;
		list-style: none;
	}

	.social-links a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		margin: 0;
		border: 1px solid #e5a62d55;
		border-radius: 10px;
		color: #c7baa6;
		background: #160f0c;
		transition:
			color 0.2s ease,
			border-color 0.2s ease,
			background 0.2s ease;
	}

	.social-links a:hover,
	.social-links a:focus-visible {
		color: #ffd35b;
		border-color: #e8b848;
		background: #2a1c12;
	}

	.social-links a:focus-visible {
		outline: 2px solid #e5a512;
		outline-offset: 2px;
	}

	.social-links svg {
		width: 1.15rem;
		height: 1.15rem;
		fill: currentColor;
	}
</style>
