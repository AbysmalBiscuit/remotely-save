# Obsidian Secrets API Integration

## Overview

Migrate user-entered sensitive credentials from plaintext storage in `data.json` to Obsidian's SecretStorage API. This improves security by moving secrets out of the plugin's data file and into Obsidian's centralized, vault-scoped secret store.

## Scope

Eight user-entered sensitive fields across five providers:

| Provider | Field | Secret Name |
|----------|-------|-------------|
| S3 | `s3AccessKeyID` | `remotely-save-s3-access-key-id` |
| S3 | `s3SecretAccessKey` | `remotely-save-s3-secret-access-key` |
| WebDAV | `username` | `remotely-save-webdav-username` |
| WebDAV | `password` | `remotely-save-webdav-password` |
| Webdis | `username` | `remotely-save-webdis-username` |
| Webdis | `password` | `remotely-save-webdis-password` |
| Azure Blob | `containerSasUrl` | `remotely-save-azure-container-sas-url` |
| Plugin (E2E) | `password` | `remotely-save-e2e-password` |

OAuth tokens (Dropbox, OneDrive, Google Drive, Box, pCloud, Yandex Disk, Koofr) are out of scope. They are set programmatically by OAuth redirect flows, not typed by users.

Secret names follow the pattern `remotely-save-{provider}-{field}`, using only lowercase letters, numbers, and dashes (`[a-z\d\-]`).

## Data Model

Settings fields keep their existing names. Their meaning changes from "the actual credential value" to "the name of a secret in SecretStorage."

At runtime, the plugin resolves actual values via `app.secretStorage.get(secretName)`.

## Auto-Migration

On plugin load, the plugin detects existing raw credentials in `data.json` and migrates them:

1. For each sensitive field, check whether the stored value is a raw credential or an already-migrated secret name. Use a `secretsMigrated` boolean flag on the settings object to track migration state.
2. For each raw credential:
   - Call `app.secretStorage.setSecret(secretName, rawValue)` using the deterministic secret name from the table above.
   - Replace the field value in settings with the secret name.
   - Save settings.
3. Set `secretsMigrated = true` and save.
4. Show a notice: "Migrated credentials to Obsidian's secure storage."

Migration is idempotent. If `secretsMigrated` is already `true`, the migration step is skipped.

## Settings UI

Replace each sensitive field's text input with Obsidian's `SecretComponent`:

```ts
new Setting(containerEl)
  .setName("Access Key ID")
  .setDesc("Select or create a secret for your S3 access key")
  .addComponent(el => new SecretComponent(this.app, el)
    .setValue(settings.s3.s3AccessKeyID)
    .onChange(async value => {
      settings.s3.s3AccessKeyID = value;
      await plugin.saveSettings();
    }));
```

The `wrapTextWithPasswordHide()` wrapper is removed from these fields since `SecretComponent` handles its own display.

## Runtime Secret Resolution

A helper function centralizes resolution:

```ts
async function resolveSecret(
  app: App,
  secretName: string
): Promise<string | null> {
  if (!secretName) return null;
  return app.secretStorage.get(secretName);
}
```

Call sites that need updating:

- **S3** (`fsS3.ts`): resolve `s3AccessKeyID` and `s3SecretAccessKey` before constructing the S3 client.
- **WebDAV** (`fsWebdav.ts`): resolve `username` and `password` before creating the WebDAV client.
- **Webdis** (`fsWebdis.ts`): resolve `username` and `password` before connecting.
- **Azure Blob**: resolve `containerSasUrl` before connecting.
- **E2E encryption** (`main.ts`): resolve the encryption password before use.

Each provider's initialization already has an async path, so adding `await resolveSecret(...)` fits without restructuring control flow.

## Compatibility

Bump `minAppVersion` in `manifest.json` to `1.11.1` (the earliest version with SecretStorage support). No fallback for older versions; users on older Obsidian will not receive this update through the community plugin registry.

## Error Handling

- If `app.secretStorage.get(name)` returns `null` for a configured secret name, surface a notice: "Secret '{name}' not found. Please reconfigure in settings."
- Sync operations fail gracefully with a descriptive error rather than attempting to authenticate with a `null` credential.
- Migration logs a notice on success.
