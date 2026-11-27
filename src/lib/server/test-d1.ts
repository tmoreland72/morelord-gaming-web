import type { DatabaseSync, SQLInputValue } from 'node:sqlite';

export function createTestD1(sqlite: DatabaseSync): D1Database {
	const prepare = (sql: string) => {
		let values: SQLInputValue[] = [];
		const statement = sqlite.prepare(sql);
		const api = {
			bind(...args: SQLInputValue[]) {
				values = args;
				return api;
			},
			async first<T>() {
				return (statement.get(...values) as T | undefined) ?? null;
			},
			async all<T>() {
				return { results: statement.all(...values) as T[] };
			},
			async run() {
				const result = statement.run(...values);
				return { meta: { changes: result.changes } };
			},
			async raw<T>() {
				const rows = statement.all(...values) as Record<string, T>[];
				if (!rows.length) return [] as T[][];
				return rows.map((row) => Object.values(row));
			}
		};
		return api;
	};

	return { prepare } as unknown as D1Database;
}