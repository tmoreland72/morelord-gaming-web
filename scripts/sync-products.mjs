import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const tables = ['products', 'features', 'product_features', 'releases', 'release_changes'];
const identifier = (value) => '"' + value.replaceAll('"', '""') + '"';
const literal = (value) =>
	value == null
		? 'NULL'
		: typeof value === 'number'
			? String(value)
			: "'" + String(value).replaceAll("'", "''") + "'";
export function buildSync(source, target, references) {
	const statements = ['PRAGMA defer_foreign_keys=TRUE;'];
	const remaps = {};
	const removals = {};
	const productSlug = (snapshot, id) => snapshot.products.find((row) => row.id === id)?.slug;
	for (const table of ['products', 'features', 'releases']) {
		const key = (row, snapshot) =>
			table === 'products'
				? row.slug
				: table === 'features'
					? row.key
					: `${productSlug(snapshot, row.product_id)}\0${row.version}`;
		remaps[table] = new Map();
		for (const old of target[table]) {
			const current = source[table].find(
				(row) => row.id === old.id || key(row, source) === key(old, target)
			);
			if (current && current.id !== old.id) {
				if (target[table].some((row) => row.id === current.id))
					throw new Error(`Conflicting IDs in ${table}; resolve before syncing.`);
				remaps[table].set(old.id, current.id);
			}
		}
		removals[table] = target[table]
			.filter(
				(row) =>
					!source[table].some(
						(candidate) => candidate.id === row.id || key(candidate, source) === key(row, target)
					)
			)
			.map((row) => row.id);
	}
	// Update references along with IDs; never replace parent rows and cascade-delete dependent data.
	for (const table of ['products', 'features', 'releases']) {
		for (const [oldId, newId] of remaps[table]) {
			statements.push(
				`UPDATE ${identifier(table)} SET id=${literal(newId)} WHERE id=${literal(oldId)};`
			);
			for (const ref of references.filter((ref) => ref.parent === table))
				statements.push(
					`UPDATE ${identifier(ref.table)} SET ${identifier(ref.column)}=${literal(newId)} WHERE ${identifier(ref.column)}=${literal(oldId)};`
				);
		}
	}
	statements.push('DELETE FROM release_changes;', 'DELETE FROM product_features;');
	for (const table of ['products', 'features', 'releases', 'product_features', 'release_changes']) {
		for (const row of source[table]) {
			const columns = Object.keys(row);
			const keys = table === 'product_features' ? ['product_id', 'feature_id'] : ['id'];
			statements.push(
				`INSERT INTO ${identifier(table)} (${columns.map(identifier).join(',')}) VALUES (${columns.map((column) => literal(row[column])).join(',')}) ON CONFLICT (${keys.map(identifier).join(',')}) DO UPDATE SET ${columns
					.filter((column) => !keys.includes(column))
					.map((column) => `${identifier(column)}=excluded.${identifier(column)}`)
					.join(',')};`
			);
		}
	}
	for (const table of ['releases', 'features', 'products']) {
		if (removals[table].length)
			statements.push(
				`DELETE FROM ${identifier(table)} WHERE id IN (${removals[table].map(literal).join(',')});`
			);
	}
	return { sql: statements.join('\n'), removals };
}

function canonical(snapshot) {
	return JSON.stringify(
		tables.map((table) =>
			snapshot[table]
				.map((row) => Object.fromEntries(Object.entries(row).sort()))
				.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
		)
	);
}
function main() {
	const args = process.argv.slice(2);
	if (
		args.some((arg) => !['--pull', '--push', '--apply'].includes(arg)) ||
		args.includes('--pull') === args.includes('--push')
	)
		throw new Error('Use --pull or --push [--apply]. Push defaults to preview.');
	const push = args.includes('--push');
	const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
	const directory = resolve(
		root,
		'.local',
		'product-sync',
		new Date().toISOString().replaceAll(':', '-')
	);
	mkdirSync(directory, { recursive: true });
	function run(mode, sql, file) {
		const result = spawnSync(
			process.execPath,
			[
				resolve(root, 'node_modules/wrangler/bin/wrangler.js'),
				'd1',
				'execute',
				'morelord-gaming',
				mode,
				'--json',
				...(file ? ['--file', file] : ['--command', sql])
			],
			{
				cwd: root,
				encoding: 'utf8',
				maxBuffer: 32 * 1024 * 1024,
				env: { ...process.env, WRANGLER_LOG_PATH: resolve(directory, 'logs') }
			}
		);
		if (result.status !== 0)
			throw new Error(result.stderr || result.stdout || 'Database command failed');
		const output = JSON.parse(result.stdout);
		if (output.some((entry) => !entry.success)) throw new Error('Database command failed');
		return output.map((entry) => entry.results);
	}
	const read = (mode) =>
		Object.fromEntries(
			run(mode, tables.map((table) => `SELECT * FROM ${identifier(table)}`).join(';')).map(
				(rows, index) => [tables[index], rows]
			)
		);
	const sourceMode = push ? '--local' : '--remote';
	const targetMode = push ? '--remote' : '--local';
	const source = read(sourceMode);
	const target = read(targetMode);
	writeFileSync(resolve(directory, 'source.json'), JSON.stringify(source, null, 2));
	writeFileSync(resolve(directory, 'target-before.json'), JSON.stringify(target, null, 2));
	if (canonical(source) === canonical(target)) {
		console.log('Product records already match exactly.');
		return;
	}
	const names = run(
		targetMode,
		"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'"
	)[0].map((row) => row.name);
	const foreignKeys = run(
		targetMode,
		names.map((name) => `PRAGMA foreign_key_list(${identifier(name)})`).join(';')
	);
	const references = foreignKeys.flatMap((rows, index) =>
		rows
			.filter((row) => ['products', 'features', 'releases'].includes(row.table))
			.map((row) => ({ table: names[index], column: row.from, parent: row.table }))
	);
	const plan = buildSync(source, target, references);
	for (const ref of references.filter((ref) => !tables.includes(ref.table))) {
		const removed = plan.removals[ref.parent];
		if (!removed.length) continue;
		const count = run(
			targetMode,
			`SELECT COUNT(*) AS count FROM ${identifier(ref.table)} WHERE ${identifier(ref.column)} IN (${removed.map(literal).join(',')})`
		)[0][0].count;
		if (count)
			throw new Error(
				`Sync would remove catalog records used by ${ref.table}; resolve those references first.`
			);
	}
	const file = resolve(directory, 'apply.sql');
	writeFileSync(file, plan.sql);
	console.log(
		`${push ? 'Upload' : 'Download'}: ${tables.map((table) => `${table} ${target[table].length} → ${source[table].length}`).join(', ')}.`
	);
	console.log(`Backup and SQL: ${directory}`);
	if (push && !args.includes('--apply')) {
		console.log('Preview only. Use npm run products:push -- --apply to upload.');
		return;
	}
	run(targetMode, undefined, file);
	const actual = read(targetMode);
	writeFileSync(resolve(directory, 'target-after.json'), JSON.stringify(actual, null, 2));
	if (canonical(source) !== canonical(actual))
		throw new Error(
			'Verification failed: catalog records differ. Backups are available in the sync directory.'
		);
	const violations = run(targetMode, 'PRAGMA foreign_key_check')[0];
	if (violations.length) throw new Error('Foreign key verification failed.');
	console.log('Verified: all product catalog rows and IDs match exactly.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		main();
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
