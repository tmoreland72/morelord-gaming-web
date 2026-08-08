# Discord Integration

The website links a Morelord Gaming account to a Discord identity using OAuth2 and synchronizes exactly three managed roles:

- Standard: Morelord Tools
- Premium: Morelord Tools + Tools Premium
- Champion: Morelord Tools + Tools Premium + Tools Champion

No campaign, GM, moderator, or other manually managed roles are modified.

## Production secrets

Configure these GitHub production environment secrets:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`

The production OAuth callback is derived from `ORIGIN` and is:

`https://morelordgaming.com/api/discord/callback`

Register that exact URL in the Discord Developer Portal OAuth2 redirect list.

## Discord server setup

1. Deploy the site and migration `0010_discord_role_sync.sql`.
2. Open Admin -> Discord and save the Discord Guild ID.
3. Use the Install bot button to add the bot to the server.
4. In Discord Server Settings -> Roles, move the bot role above Morelord Tools, Tools Premium, and Tools Champion.
5. Return to Admin -> Discord, select the three managed roles, add a permanent invite URL, and save.
6. Click Verify configuration.
7. Link a test Discord account from the website Account page.

## Synchronization

Role synchronization runs:

- immediately after Discord OAuth linking;
- after Stripe subscription events;
- when a user clicks Synchronize roles;
- when an administrator synchronizes one or all linked users.

Disconnecting Discord removes only the three website-managed roles before deleting the website connection.
