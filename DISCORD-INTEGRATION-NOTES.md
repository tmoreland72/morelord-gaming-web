# Discord Integration

The website links a Morelord Gaming account to a Discord identity using OAuth2 and synchronizes these site-managed roles:

- **Standard (all linked members):** Morelord Tools + Morelord Adventures
- **Premium:** Standard roles + Tools Premium
- **Champion:** Premium roles + Tools Champion

No campaign, GM, moderator, or other manually managed roles are modified.

## Production secrets

Configure these GitHub production environment secrets:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`
- `CRON_SECRET` (scheduled catch-up sync for members who join Discord after registering)
- Optional legacy fallbacks: `DISCORD_GUILD_ID`, `DISCORD_ROLE_TOOLS`, `DISCORD_ROLE_ADVENTURES`, `DISCORD_ROLE_PREMIUM`, `DISCORD_ROLE_CHAMPION`, `DISCORD_INVITE_URL`

The production OAuth callback is derived from `ORIGIN` and is:

`https://morelordgaming.com/api/discord/callback`

Register that exact URL in the Discord Developer Portal OAuth2 redirect list.

## Discord server setup

1. Deploy the site and migrations (including `0027_discord_adventures_role.sql`).
2. Open Admin -> Discord and save the Discord Guild ID.
3. Use the Install bot button to add the bot to the server.
4. In Discord Server Settings -> Roles, move the bot role above Morelord Tools, Morelord Adventures, Tools Premium, and Tools Champion.
5. Return to Admin -> Discord, select all four managed roles, add a permanent invite URL, and save.
6. Click Verify configuration.
7. Sign in with Discord or link from the Account page and confirm roles sync.

## Synchronization

Role synchronization runs:

- on every sign-in session when the user has a Discord auth account (auto-link + sync);
- immediately after the optional Discord OAuth role-linking callback;
- after Stripe subscription events;
- when a user opens Account while status is `not_in_server` (rate-limited retry);
- every 15 minutes via Cloudflare cron for `not_in_server` connections (batch);
- when a user clicks Synchronize roles;
- when an administrator runs Backfill Discord sign-ins or Synchronize all.

Disconnecting Discord removes only the site-managed roles before deleting the website connection.