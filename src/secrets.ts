import type { App } from "obsidian";

/**
 * Convert a camelCase field name to a secret-name-compatible format.
 * Secret names only allow [a-z\d\-].
 */
export function camelToSecretName(provider: string, field: string): string {
  // Strip provider prefix from field name if present (e.g. "s3AccessKeyID" -> "AccessKeyID" when provider is "s3")
  let stripped = field;
  if (field.toLowerCase().startsWith(provider.toLowerCase())) {
    stripped = field.slice(provider.length);
    // Lowercase the first character if it was uppercase after stripping
    if (stripped.length > 0 && stripped[0] === stripped[0].toUpperCase()) {
      stripped = stripped[0].toLowerCase() + stripped.slice(1);
    }
  }
  // Split on uppercase letters, join with dashes, lowercase everything
  const parts = stripped
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
  return `remotely-save-${provider}-${parts}`;
}

/**
 * Map of "dotpath" -> "secret name" for all sensitive fields.
 * Dotpath format: "provider.field" for provider-specific, or "field" for top-level.
 */
export const SECRET_FIELD_MAP: Record<string, string> = {
  "s3.s3AccessKeyID": "remotely-save-s3-access-key-id",
  "s3.s3SecretAccessKey": "remotely-save-s3-secret-access-key",
  "webdav.username": "remotely-save-webdav-username",
  "webdav.password": "remotely-save-webdav-password",
  "webdis.username": "remotely-save-webdis-username",
  "webdis.password": "remotely-save-webdis-password",
  "azureblobstorage.containerSasUrl": "remotely-save-azure-container-sas-url",
  "password": "remotely-save-e2e-password",
};

/**
 * Resolve a secret name to its actual value from SecretStorage.
 * Returns the raw string if found, or null if not found/empty.
 */
export function resolveSecret(
  app: App,
  secretName: string
): string | null {
  if (!secretName) return null;
  return app.secretStorage.getSecret(secretName);
}
