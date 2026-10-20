/**
 * Core checks in a few seconds after approval. The account page keeps reading
 * lastValidatedAt through this window, including when the browser clock is off.
 */
export const FIRST_VALIDATION_WAIT_MS = 3 * 60_000;
export const FIRST_VALIDATION_POLL_MS = 2_000;

const CLOCK_SKEW_MS = 3 * 60_000;

export function awaitingFirstValidation(
	installations: ReadonlyArray<{
		createdAt: Date | string | number;
		lastValidatedAt?: Date | string | number | null;
	}>,
	now = Date.now()
): boolean {
	return installations.some((installation) => {
		if (installation.lastValidatedAt) return false;
		const createdAt = new Date(installation.createdAt).getTime();
		if (!Number.isFinite(createdAt)) return false;
		const age = now - createdAt;
		return age < FIRST_VALIDATION_WAIT_MS && age > -CLOCK_SKEW_MS;
	});
}
