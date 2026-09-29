/** Build a GitHub repository URL from either "owner/repo" or a full GitHub URL. */
export function githubRepoUrl(value: string): string {
	const path = value
		.trim()
		.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '')
		.replace(/\.git$/i, '')
		.replace(/\/+$/, '');
	return `https://github.com/${path}`;
}
