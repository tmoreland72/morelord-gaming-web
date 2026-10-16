const internalReleaseNote =
	/\/tmp\/|working files|release staging|release-note sources|generated zip|zip validation|module-local|demo-production|runtime zip/i;

/** Drop developer-only release sentences so they cannot reach a public page. */
export function stripInternalReleaseNotes(value: string | null | undefined): string {
	if (!value) return '';
	return value
		.split(/\n+/)
		.flatMap((line) => line.split(/(?<=[.!])\s+/))
		.map((part) => part.trim())
		.filter((part) => part.length > 0 && !internalReleaseNote.test(part))
		.join(' ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

/**
 * Public release copy only: bold, italic, code, and http(s) links.
 * Everything else is escaped, and internal dev notes are removed first.
 */
export function renderReleaseMarkdown(value: string | null | undefined): string {
	const text = stripInternalReleaseNotes(value);
	if (!text) return '';

	const codes: string[] = [];
	const withCodes = text.replace(/`([^`]+)`/g, (_match, code: string) => {
		codes.push(escapeHtml(code));
		return `@@CODE${codes.length - 1}@@`;
	});

	let html = escapeHtml(withCodes);
	html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	html = html.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
	html = html.replace(
		/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
		(_match, label: string, href: string) => {
			return `<a href="${escapeHtml(href)}" rel="noreferrer noopener">${label}</a>`;
		}
	);
	html = html.replace(
		/@@CODE(\d+)@@/g,
		(_match, index: string) => `<code>${codes[Number(index)]}</code>`
	);
	return html;
}

export function publicReleaseChange(description: string): string | null {
	const text = stripInternalReleaseNotes(description);
	return text || null;
}
