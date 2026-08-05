import { env } from '$env/dynamic/private';

export function adminEmails(): string[] {
	return (env.ADMIN_EMAILS ?? '')
		.split(',')
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
	if (!email) return false;
	return adminEmails().includes(email.trim().toLowerCase());
}
