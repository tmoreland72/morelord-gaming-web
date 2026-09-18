import { json } from '@sveltejs/kit';

export const foundryCorsHeaders = {
	'access-control-allow-origin': '*',
	'access-control-allow-headers':
		'authorization, content-type, x-morelord-core-version, x-foundry-version',
	'access-control-allow-methods': 'GET, POST, OPTIONS'
};

export function foundryCorsPreflight(): Response {
	return new Response(null, { status: 204, headers: foundryCorsHeaders });
}

export function jsonWithCors(
	data: unknown,
	init?: { status?: number; headers?: Record<string, string> }
): Response {
	return json(data, {
		status: init?.status ?? 200,
		headers: { ...foundryCorsHeaders, ...init?.headers }
	});
}

export function requireD1(platform: App.Platform | undefined): D1Database | null {
	return platform?.env?.DB ?? null;
}

export function clientAddressKey(event: { getClientAddress: () => string }, kind: string): string {
	return `${kind}:${event.getClientAddress()}`;
}
