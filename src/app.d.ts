import type { Session, User } from 'better-auth';
import type { createAuth } from '$lib/server/auth';

declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			user?: User;
			session?: Session;
			auth: ReturnType<typeof createAuth>;
		}
	}
}

export {};
