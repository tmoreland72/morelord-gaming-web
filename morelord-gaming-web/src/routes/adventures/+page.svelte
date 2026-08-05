<script lang="ts">
	const startPlayingProfile = 'https://startplaying.games/gm/morelord-gaming';
</script>

<svelte:head>
	<title>Morelord Adventures | Professional Online D&D</title>
	<meta
		name="description"
		content="Join Troy of Morelord Adventures for professionally run, beginner-friendly online D&D campaigns using Foundry VTT, Discord and D&D Beyond."
	/>
</svelte:head>

<section class="page-hero adventure-hero">
	<div class="shell split-hero">
		<div>
			<div class="eyebrow">Morelord Adventures</div>
			<h1>Professionally run adventures. Memorable stories.</h1>
			<p class="lead">
				Join a welcoming online table where character choices shape the campaign, combat carries
				real stakes and polished Foundry VTT presentation keeps the game moving.
			</p>
			<div class="actions">
				<a class="button" href={startPlayingProfile} target="_blank" rel="external noreferrer">
					View games on StartPlaying
				</a>
				<a
					class="button secondary"
					href={startPlayingProfile}
					target="_blank"
					rel="external noreferrer"
				>
					Request a private booking
				</a>
			</div>
		</div>
		<img class="hero-mascot" src="/branding/morelord-mascot.png" alt="Morelord Gaming mascot" />
	</div>
</section>

<section class="adventure-stats" aria-label="Morelord Adventures at a glance">
	<div class="shell adventure-stat-grid">
		<div class="adventure-stat">
			<strong>5.0</strong>
			<span>StartPlaying rating</span>
		</div>
		<div class="adventure-stat">
			<strong>Beginner Friendly</strong>
			<span>Zero experience required</span>
		</div>
		<div class="adventure-stat">
			<strong>Foundry VTT</strong>
			<span>Animated maps, lighting and sound</span>
		</div>
		<div class="adventure-stat">
			<strong>Professional</strong>
			<span>Prepared, punctual and organized</span>
		</div>
	</div>
</section>

<section class="section parchment-section">
	<div class="shell adventure-intro">
		<div>
			<div class="eyebrow dark-eyebrow">Meet your game master</div>
			<h2>The “Techie DM” behind Morelord Adventures</h2>
			<p class="adventure-copy">
				Troy first discovered D&amp;D in 1982 and now combines decades of technology, teaching and
				leadership experience with a love of collaborative storytelling. Before retiring, he spent
				35 years in technology and founded a cybersecurity software company that grew to more than
				150 employees.
			</p>
			<p class="adventure-copy">
				His games are relaxed, inclusive and story-driven. Rules provide a dependable structure,
				but fun and narrative come first. New players receive patient guidance, experienced players
				get meaningful tactical challenges, and everyone gets room to shape the story.
			</p>
			<a class="text-link dark-link" href={startPlayingProfile} target="_blank" rel="external noreferrer">
				Read Troy’s full StartPlaying profile <span>→</span>
			</a>
		</div>
		<div class="gm-card">
			<img src="/branding/morelord-mascot.png" alt="Morelord Gaming mascot holding a d20" />
			<div>
				<strong>Troy</strong>
				<span>Professional Game Master</span>
				<ul>
					<li>Military veteran and educator</li>
					<li>D&amp;D 5e campaigns and one-shots</li>
					<li>Foundry VTT, Discord and D&amp;D Beyond</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<section class="section brand-panel-section">
	<div class="shell">
		<div class="section-heading">
			<div>
				<div class="eyebrow">What to expect</div>
				<h2>A table built for the whole party</h2>
			</div>
			<p>
				Campaigns blend roleplay, exploration and dangerous combat while giving the players freedom
				to influence the balance through their choices.
			</p>
		</div>
		<div class="grid-3">
			<div class="card icon-card">
				<div class="feature-icon">🧭</div>
				<h3>Welcoming to new players</h3>
				<p>Clear explanations, patient Foundry guidance and a zero-judgment space for questions.</p>
			</div>
			<div class="card icon-card">
				<div class="feature-icon">📜</div>
				<h3>Character-driven stories</h3>
				<p>Backstories, decisions and relationships become meaningful parts of the campaign.</p>
			</div>
			<div class="card icon-card">
				<div class="feature-icon">⚔</div>
				<h3>Tactical stakes</h3>
				<p>Combat is exciting and consequential, but the table’s enjoyment always remains the priority.</p>
			</div>
			<div class="card icon-card">
				<div class="feature-icon">🔥</div>
				<h3>Foundry polish</h3>
				<p>Animated maps, dynamic lighting, soundscapes and automation support immersion.</p>
			</div>
			<div class="card icon-card">
				<div class="feature-icon">🤝</div>
				<h3>Collaborative table</h3>
				<p>Teamwork, good humor and respect matter more than individual spotlight chasing.</p>
			</div>
			<div class="card icon-card">
				<div class="feature-icon">⏱</div>
				<h3>Professional preparation</h3>
				<p>Sessions are organized, punctual and supported by substantial preparation between games.</p>
			</div>
		</div>
	</div>
</section>

<section class="section testimonials-section">
	<div class="shell">
		<div class="section-heading">
			<div>
				<div class="eyebrow">Player feedback</div>
				<h2>What players say</h2>
			</div>
			<p>More reviews and current campaign listings are available on the Morelord Adventures profile.</p>
		</div>
		<div class="grid-3">
			<blockquote class="testimonial-card">
				<p>“Very friendly, super patient, kept a pleasant group setting, and was always willing to teach and explain things.”</p>
				<footer>— StartPlaying player review</footer>
			</blockquote>
			<blockquote class="testimonial-card">
				<p>“Newbie or seasoned players will absolutely enjoy his games.”</p>
				<footer>— StartPlaying player review</footer>
			</blockquote>
			<blockquote class="testimonial-card">
				<p>“He was awesome at going over things and helping us learn. You cannot go wrong with this DM.”</p>
				<footer>— StartPlaying player review</footer>
			</blockquote>
		</div>
	</div>
</section>

<section class="section callout-section">
	<div class="shell callout adventure-callout">
		<div>
			<div class="eyebrow">Ready to roll?</div>
			<h2>Find your next Morelord Adventure.</h2>
			<p>See current schedules, open seats, pricing and private-booking options on StartPlaying.</p>
		</div>
		<a class="button" href={startPlayingProfile} target="_blank" rel="external noreferrer">
			View available games
		</a>
	</div>
</section>
