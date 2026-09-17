export class AppError extends Error {
	readonly status: number;
	readonly expose: boolean;

	constructor(message: string, status = 400, expose = true) {
		super(message);
		this.name = 'AppError';
		this.status = status;
		this.expose = expose;
	}
}

export function publicErrorMessage(error: unknown, fallback: string): string {
	return error instanceof AppError && error.expose ? error.message : fallback;
}

export function publicErrorStatus(error: unknown, fallback = 500): number {
	return error instanceof AppError ? error.status : fallback;
}
