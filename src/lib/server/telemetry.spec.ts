import { describe, it, expect } from 'vitest';
import { telemetrySchema, readTelemetry } from './telemetry';
const event = {
	id: crypto.randomUUID(),
	at: new Date().toISOString(),
	kind: 'usage',
	module: 'morelord-core',
	event: 'dashboard.opened',
	moduleVersion: '0.3.9',
	foundryVersion: '14.368',
	system: 'dnd5e',
	systemVersion: '6.0.3',
	role: 'gm'
};
const payload = () => ({ schemaVersion: 1, world: crypto.randomUUID(), events: [{ ...event }] });
describe('Foundry telemetry boundary', () => {
	it('accepts report bodies without account information', () =>
		expect(telemetrySchema.safeParse(payload()).success).toBe(true));
	it('rejects campaign fields, unknown modules, raw error messages and excessive batches', () => {
		expect(telemetrySchema.safeParse({ ...payload(), token: 'secret' }).success).toBe(false);
		expect(
			telemetrySchema.safeParse({
				...payload(),
				events: [{ ...event, module: 'morelord-campaign-manager' }]
			}).success
		).toBe(false);
		expect(
			telemetrySchema.safeParse({
				...payload(),
				events: [
					{
						...event,
						kind: 'error',
						type: 'Error',
						frames: [],
						recent: [],
						message: 'Actor secret'
					}
				]
			}).success
		).toBe(false);
		expect(telemetrySchema.safeParse({ ...payload(), events: Array(26).fill(event) }).success).toBe(
			false
		);
	});
	it('rejects oversized bodies without relying on Content-Length', async () => {
		await expect(
			readTelemetry(
				new Request('https://example.test', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: ' '.repeat(49153)
				})
			)
		).rejects.toThrow('Payload too large');
	});
	it('rejects stale dates', async () => {
		const data = payload();
		data.events[0].at = '2020-01-01T00:00:00.000Z';
		await expect(
			readTelemetry(
				new Request('https://example.test', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(data)
				})
			)
		).rejects.toThrow('Invalid event date');
	});
});
