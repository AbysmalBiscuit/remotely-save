# Obsidian Secrets API Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate 8 user-entered sensitive fields to Obsidian's SecretStorage API, with auto-migration for existing users.

**Architecture:** Settings fields store secret *names* instead of raw values. A `resolveSecrets()` function hydrates the config with actual values before use. `SecretComponent` replaces text inputs in the settings UI. On first load after upgrade, existing raw credentials are auto-migrated into SecretStorage.

**Tech Stack:** Obsidian SecretStorage API, SecretComponent, Mocha + assert for tests.

**Design doc:** `docs/plans/2026-02-03-obsidian-secrets-api-design.md`

---

### Task 1: Add `secretsMigrated` field to settings type and defaults

**Files:**
- Modify: `src/baseTypes.ts:162` (after `password` field)
- Modify: `src/main.ts:128` (after `password` in DEFAULT_SETTINGS)

**Step 1: Add the field to the interface**

In `src/baseTypes.ts`, add after `password: string;` (line 162):

```ts
  secretsMigrated?: boolean;
```

**Step 2: Add the default value**

In `src/main.ts`, add after `password: "",` (line 128):

```ts
  secretsMigrated: false,
```

**Step 3: Run tests to verify nothing breaks**

Run: `bun test`
Expected: All existing tests pass (this is an additive change).

**Step 4: Commit**

```bash
git add src/baseTypes.ts src/main.ts
git commit -m "feat: add secretsMigrated field to settings"
```

---

### Task 2: Create `resolveSecrets()` helper and secret name constants

**Files:**
- Create: `src/secrets.ts`
- Test: `tests/secrets.test.ts`

**Step 1: Write the failing test**

Create `tests/secrets.test.ts`:

```ts
import { strict as assert } from "assert";
import { SECRET_FIELD_MAP, camelToSecretName } from "../src/secrets";

describe("Secrets", () => {
  describe("camelToSecretName", () => {
    it("should convert camelCase field to secret name format", () => {
      assert.equal(
        camelToSecretName("s3", "s3AccessKeyID"),
        "remotely-save-s3-access-key-id"
      );
    });

    it("should handle simple field names", () => {
      assert.equal(
        camelToSecretName("webdav", "password"),
        "remotely-save-webdav-password"
      );
    });

    it("should handle containerSasUrl", () => {
      assert.equal(
        camelToSecretName("azure", "containerSasUrl"),
        "remotely-save-azure-container-sas-url"
      );
    });
  });

  describe("SECRET_FIELD_MAP", () => {
    it("should contain all 8 secret fields", () => {
      assert.equal(Object.keys(SECRET_FIELD_MAP).length, 8);
    });

    it("should map s3AccessKeyID to the correct secret name", () => {
      assert.equal(
        SECRET_FIELD_MAP["s3.s3AccessKeyID"],
        "remotely-save-s3-access-key-id"
      );
    });

    it("should map password to e2e password secret name", () => {
      assert.equal(
        SECRET_FIELD_MAP["password"],
        "remotely-save-e2e-password"
      );
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test`
Expected: FAIL — cannot find module `../src/secrets`

**Step 3: Write the implementation**

Create `src/secrets.ts`:

```ts
import type { App } from "obsidian";

/**
 * Convert a camelCase field name to a secret-name-compatible format.
 * Secret names only allow [a-z\d\-].
 */
export function camelToSecretName(provider: string, field: string): string {
  // Split on uppercase letters, join with dashes, lowercase everything
  const parts = field
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
 * Returns the raw string if non-empty, or null if not found/empty.
 */
export async function resolveSecret(
  app: App,
  secretName: string
): Promise<string | null> {
  if (!secretName) return null;
  const value = app.secretStorage.get(secretName);
  return value ?? null;
}
```

**Step 4: Run test to verify it passes**

Run: `bun test`
Expected: PASS — all tests in secrets.test.ts pass.

**Step 5: Commit**

```bash
git add src/secrets.ts tests/secrets.test.ts
git commit -m "feat: add secret name mapping and resolveSecret helper"
```

---

### Task 3: Implement auto-migration logic

**Files:**
- Modify: `src/secrets.ts` (add `migrateSecretsFromSettings`)
- Test: `tests/secrets.test.ts` (add migration tests)

**Step 1: Write the failing tests**

Add to `tests/secrets.test.ts`:

```ts
import {
  SECRET_FIELD_MAP,
  camelToSecretName,
  getSecretsToMigrate,
} from "../src/secrets";

describe("getSecretsToMigrate", () => {
  it("should return entries for non-empty sensitive fields", () => {
    const settings = {
      s3: { s3AccessKeyID: "AKIAIOSFODNN7EXAMPLE", s3SecretAccessKey: "" },
      webdav: { username: "", password: "" },
      webdis: { username: "", password: "" },
      azureblobstorage: { containerSasUrl: "" },
      password: "my-vault-password",
    };
    const result = getSecretsToMigrate(settings as any);
    assert.equal(result.length, 2);
    assert.deepEqual(result[0], {
      secretName: "remotely-save-s3-access-key-id",
      rawValue: "AKIAIOSFODNN7EXAMPLE",
      dotPath: "s3.s3AccessKeyID",
    });
    assert.deepEqual(result[1], {
      secretName: "remotely-save-e2e-password",
      rawValue: "my-vault-password",
      dotPath: "password",
    });
  });

  it("should return empty array when all fields are empty", () => {
    const settings = {
      s3: { s3AccessKeyID: "", s3SecretAccessKey: "" },
      webdav: { username: "", password: "" },
      webdis: { username: "", password: "" },
      azureblobstorage: { containerSasUrl: "" },
      password: "",
    };
    const result = getSecretsToMigrate(settings as any);
    assert.equal(result.length, 0);
  });

  it("should skip fields that already contain a secret name", () => {
    const settings = {
      s3: {
        s3AccessKeyID: "remotely-save-s3-access-key-id",
        s3SecretAccessKey: "real-secret-key",
      },
      webdav: { username: "", password: "" },
      webdis: { username: "", password: "" },
      azureblobstorage: { containerSasUrl: "" },
      password: "",
      secretsMigrated: true,
    };
    const result = getSecretsToMigrate(settings as any);
    // secretsMigrated is true, so should return empty
    assert.equal(result.length, 0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test`
Expected: FAIL — `getSecretsToMigrate` is not exported

**Step 3: Write the implementation**

Add to `src/secrets.ts`:

```ts
import type { RemotelySavePluginSettings } from "./baseTypes";

interface SecretMigrationEntry {
  secretName: string;
  rawValue: string;
  dotPath: string;
}

/**
 * Reads the settings object and returns a list of sensitive fields
 * that contain raw credential values (not yet migrated to SecretStorage).
 */
export function getSecretsToMigrate(
  settings: RemotelySavePluginSettings
): SecretMigrationEntry[] {
  if (settings.secretsMigrated) {
    return [];
  }

  const entries: SecretMigrationEntry[] = [];

  for (const [dotPath, secretName] of Object.entries(SECRET_FIELD_MAP)) {
    let rawValue: string;
    if (dotPath.includes(".")) {
      const [provider, field] = dotPath.split(".");
      rawValue = (settings as any)[provider]?.[field] ?? "";
    } else {
      rawValue = (settings as any)[dotPath] ?? "";
    }

    if (rawValue && rawValue !== secretName) {
      entries.push({ secretName, rawValue, dotPath });
    }
  }

  return entries;
}

/**
 * Perform the actual migration: write raw values to SecretStorage,
 * replace settings fields with secret names, mark as migrated.
 * Returns true if any migration was performed.
 */
export async function migrateSecretsToStorage(
  app: App,
  settings: RemotelySavePluginSettings
): Promise<boolean> {
  const entries = getSecretsToMigrate(settings);
  if (entries.length === 0) {
    return false;
  }

  for (const { secretName, rawValue, dotPath } of entries) {
    app.secretStorage.setSecret(secretName, rawValue);

    // Replace the raw value in settings with the secret name
    if (dotPath.includes(".")) {
      const [provider, field] = dotPath.split(".");
      (settings as any)[provider][field] = secretName;
    } else {
      (settings as any)[dotPath] = secretName;
    }
  }

  settings.secretsMigrated = true;
  return true;
}
```

**Step 4: Run tests to verify they pass**

Run: `bun test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/secrets.ts tests/secrets.test.ts
git commit -m "feat: add secrets migration logic with getSecretsToMigrate"
```

---

### Task 4: Wire migration into plugin load

**Files:**
- Modify: `src/main.ts:539` (after `await this.loadSettings()`)
- Modify: `src/main.ts` (import `migrateSecretsToStorage`)

**Step 1: Add the import**

In `src/main.ts`, add to the imports:

```ts
import { migrateSecretsToStorage } from "./secrets";
```

**Step 2: Call migration after loadSettings**

In `src/main.ts`, after `await this.loadSettings();` (line 539), add:

```ts
    // Migrate raw credentials to SecretStorage
    const didMigrate = await migrateSecretsToStorage(this.app, this.settings);
    if (didMigrate) {
      await this.saveSettings();
      new Notice("Migrated credentials to Obsidian's secure storage.");
    }
```

**Step 3: Run tests to verify nothing breaks**

Run: `bun test`
Expected: All existing tests pass.

**Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: wire secrets migration into plugin onload"
```

---

### Task 5: Add secret resolution before sync

The key insight: `getClient()` in `src/fsGetter.ts` takes the settings config objects directly. The `FakeFs*` constructors are synchronous and read credentials from the config. So secrets must be resolved **before** `getClient()` is called.

**Files:**
- Modify: `src/main.ts:252-261` (the sync setup block where `getClient` and `FakeFsEncrypt` are called)
- Modify: `src/secrets.ts` (add `resolveSettingsSecrets`)

**Step 1: Write the `resolveSettingsSecrets` function**

Add to `src/secrets.ts`:

```ts
/**
 * Resolve all secret names in settings to their actual values.
 * Mutates the settings object in place, replacing secret names with
 * resolved values. Call this before passing settings to getClient/FakeFsEncrypt.
 *
 * Returns a list of secret names that could not be resolved.
 */
export async function resolveSettingsSecrets(
  app: App,
  settings: RemotelySavePluginSettings
): Promise<string[]> {
  if (!settings.secretsMigrated) {
    return []; // Not migrated yet — settings contain raw values, nothing to resolve
  }

  const missing: string[] = [];

  for (const [dotPath, secretName] of Object.entries(SECRET_FIELD_MAP)) {
    let currentValue: string;
    if (dotPath.includes(".")) {
      const [provider, field] = dotPath.split(".");
      currentValue = (settings as any)[provider]?.[field] ?? "";
    } else {
      currentValue = (settings as any)[dotPath] ?? "";
    }

    // Only resolve if the field holds a secret name (not empty)
    if (!currentValue) continue;

    const resolved = await resolveSecret(app, currentValue);
    if (resolved === null) {
      missing.push(currentValue);
      continue;
    }

    // Write the resolved value back into settings for this sync session
    if (dotPath.includes(".")) {
      const [provider, field] = dotPath.split(".");
      (settings as any)[provider][field] = resolved;
    } else {
      (settings as any)[dotPath] = resolved;
    }
  }

  return missing;
}
```

**Step 2: Use it in the sync path**

In `src/main.ts`, the sync logic is in a method that starts around line 230. Before the `getClient()` call at line 252, add:

```ts
    // Resolve secret names to actual values before connecting
    const resolvedSettings = cloneDeep(this.settings);
    const missingSecrets = await resolveSettingsSecrets(this.app, resolvedSettings);
    if (missingSecrets.length > 0) {
      for (const name of missingSecrets) {
        new Notice(`Secret '${name}' not found. Please reconfigure in settings.`);
      }
      throw new Error(`Missing secrets: ${missingSecrets.join(", ")}`);
    }
```

Then update the `getClient` and `FakeFsEncrypt` calls to use `resolvedSettings` instead of `this.settings`:

```ts
    const fsRemote = getClient(
      resolvedSettings,
      this.app.vault.getName(),
      async () => await this.saveSettings()
    );
    const fsEncrypt = new FakeFsEncrypt(
      fsRemote,
      resolvedSettings.password ?? "",
      resolvedSettings.encryptionMethod ?? "rclone-base64"
    );
```

**Important:** We use `cloneDeep` to avoid overwriting the stored secret names in `this.settings` with resolved values. The resolution is only for this sync session.

**Step 3: Add the import**

Add `resolveSettingsSecrets` to the import from `./secrets` in `src/main.ts`.

**Step 4: Run tests**

Run: `bun test`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/secrets.ts src/main.ts
git commit -m "feat: resolve secrets before sync operations"
```

---

### Task 6: Replace settings UI inputs with SecretComponent (S3 + E2E password)

**Files:**
- Modify: `src/settings.ts:2` (add `SecretComponent` import)
- Modify: `src/settings.ts:927-953` (S3 access key + secret key)
- Modify: `src/settings.ts:2038-2062` (E2E password)

**Step 1: Add the import**

In `src/settings.ts`, add `SecretComponent` to the obsidian import (line 2):

```ts
import {
  type App,
  Modal,
  Notice,
  Platform,
  PluginSettingTab,
  SecretComponent,
  Setting,
  requireApiVersion,
} from "obsidian";
```

**Step 2: Replace S3 Access Key ID input (lines 927-939)**

Replace:
```ts
    new Setting(s3Div)
      .setName(t("settings_s3_accesskeyid"))
      .setDesc(t("settings_s3_accesskeyid_desc"))
      .addText((text) => {
        wrapTextWithPasswordHide(text);
        text
          .setPlaceholder("")
          .setValue(`${this.plugin.settings.s3.s3AccessKeyID}`)
          .onChange(async (value) => {
            this.plugin.settings.s3.s3AccessKeyID = value.trim();
            await this.plugin.saveSettings();
          });
      });
```

With:
```ts
    new Setting(s3Div)
      .setName(t("settings_s3_accesskeyid"))
      .setDesc(t("settings_s3_accesskeyid_desc"))
      .addComponent((el) =>
        new SecretComponent(this.app, el)
          .setValue(this.plugin.settings.s3.s3AccessKeyID)
          .onChange(async (value) => {
            this.plugin.settings.s3.s3AccessKeyID = value;
            await this.plugin.saveSettings();
          })
      );
```

**Step 3: Replace S3 Secret Access Key input (lines 941-953)**

Replace:
```ts
    new Setting(s3Div)
      .setName(t("settings_s3_secretaccesskey"))
      .setDesc(t("settings_s3_secretaccesskey_desc"))
      .addText((text) => {
        wrapTextWithPasswordHide(text);
        text
          .setPlaceholder("")
          .setValue(`${this.plugin.settings.s3.s3SecretAccessKey}`)
          .onChange(async (value) => {
            this.plugin.settings.s3.s3SecretAccessKey = value.trim();
            await this.plugin.saveSettings();
          });
      });
```

With:
```ts
    new Setting(s3Div)
      .setName(t("settings_s3_secretaccesskey"))
      .setDesc(t("settings_s3_secretaccesskey_desc"))
      .addComponent((el) =>
        new SecretComponent(this.app, el)
          .setValue(this.plugin.settings.s3.s3SecretAccessKey)
          .onChange(async (value) => {
            this.plugin.settings.s3.s3SecretAccessKey = value;
            await this.plugin.saveSettings();
          })
      );
```

**Step 4: Replace E2E password input (lines 2038-2062)**

This one is more complex because it has a confirm button and modal. Replace the `passwordSetting` block:

Replace:
```ts
    passwordSetting
      .setName(t("settings_password"))
      .setDesc(t("settings_password_desc"))
      .addText((text) => {
        wrapTextWithPasswordHide(text);
        text
          .setPlaceholder("")
          .setValue(`${this.plugin.settings.password}`)
          .onChange(async (value) => {
            newPassword = value.trim();
          });
      })
```

With:
```ts
    passwordSetting
      .setName(t("settings_password"))
      .setDesc(t("settings_password_desc"))
      .addComponent((el) =>
        new SecretComponent(this.app, el)
          .setValue(this.plugin.settings.password)
          .onChange(async (value) => {
            newPassword = value;
          })
      )
```

**Note:** The confirm button and `PasswordModal` logic that follows stays unchanged — it already handles saving the password value.

**Step 5: Run tests**

Run: `bun test`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/settings.ts
git commit -m "feat: replace S3 and E2E password inputs with SecretComponent"
```

---

### Task 7: Replace settings UI inputs with SecretComponent (WebDAV + Webdis)

**Files:**
- Modify: `src/settings.ts:1549-1593` (WebDAV username + password)
- Modify: `src/settings.ts:1763-1789` (Webdis username + password)

**Step 1: Replace WebDAV username input (lines 1549-1570)**

Replace:
```ts
    new Setting(webdavDiv)
      .setName(t("settings_webdav_user"))
      .setDesc(t("settings_webdav_user_desc"))
      .addText((text) => {
        wrapTextWithPasswordHide(text);
        text
          .setPlaceholder("")
          .setValue(this.plugin.settings.webdav.username)
          .onChange(async (value) => {
            this.plugin.settings.webdav.username = value.trim();
            // deprecate auto on 20240116, force to manual_1
            if (
              this.plugin.settings.webdav.depth === "auto" ||
              this.plugin.settings.webdav.depth === "auto_1" ||
              this.plugin.settings.webdav.depth === "auto_infinity" ||
              this.plugin.settings.webdav.depth === "auto_unknown"
            ) {
              this.plugin.settings.webdav.depth = "manual_1";
            }
            await this.plugin.saveSettings();
          });
      });
```

With:
```ts
    new Setting(webdavDiv)
      .setName(t("settings_webdav_user"))
      .setDesc(t("settings_webdav_user_desc"))
      .addComponent((el) =>
        new SecretComponent(this.app, el)
          .setValue(this.plugin.settings.webdav.username)
          .onChange(async (value) => {
            this.plugin.settings.webdav.username = value;
            // deprecate auto on 20240116, force to manual_1
            if (
              this.plugin.settings.webdav.depth === "auto" ||
              this.plugin.settings.webdav.depth === "auto_1" ||
              this.plugin.settings.webdav.depth === "auto_infinity" ||
              this.plugin.settings.webdav.depth === "auto_unknown"
            ) {
              this.plugin.settings.webdav.depth = "manual_1";
            }
            await this.plugin.saveSettings();
          })
      );
```

**Step 2: Replace WebDAV password input (lines 1572-1593)**

Same pattern — replace `.addText` + `wrapTextWithPasswordHide` with `.addComponent` + `SecretComponent`. Keep the depth auto-deprecation logic.

**Step 3: Replace Webdis username input (lines 1763-1775)**

Replace:
```ts
    new Setting(webdisDiv)
      .setName(t("settings_webdis_user"))
      .setDesc(t("settings_webdis_user_desc"))
      .addText((text) => {
        wrapTextWithPasswordHide(text);
        text
          .setPlaceholder("")
          .setValue(this.plugin.settings.webdis.username ?? "")
          .onChange(async (value) => {
            this.plugin.settings.webdis.username = (value ?? "").trim();
            await this.plugin.saveSettings();
          });
      });
```

With:
```ts
    new Setting(webdisDiv)
      .setName(t("settings_webdis_user"))
      .setDesc(t("settings_webdis_user_desc"))
      .addComponent((el) =>
        new SecretComponent(this.app, el)
          .setValue(this.plugin.settings.webdis.username ?? "")
          .onChange(async (value) => {
            this.plugin.settings.webdis.username = value ?? "";
            await this.plugin.saveSettings();
          })
      );
```

**Step 4: Replace Webdis password input (lines 1777-1789)**

Same pattern as Webdis username.

**Step 5: Run tests**

Run: `bun test`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/settings.ts
git commit -m "feat: replace WebDAV and Webdis inputs with SecretComponent"
```

---

### Task 8: Replace Azure Blob SAS URL input with SecretComponent

**Files:**
- Modify: `pro/src/settingsAzureBlobStorage.ts:153-167`
- Modify: `pro/src/settingsAzureBlobStorage.ts` (add SecretComponent import)

**Step 1: Add the import**

Add `SecretComponent` to the obsidian import in `pro/src/settingsAzureBlobStorage.ts`.

**Step 2: Replace the containerSasUrl input (lines 153-167)**

Replace:
```ts
    new Setting(azureBlobStorageAllowedToUsedDiv)
      .setName(t("settings_azureblobstorage_containersasurl"))
      .setDesc(
        stringToFragment(t("settings_azureblobstorage_containersasurl_desc"))
      )
      .addText((text) => {
        wrapTextWithPasswordHide(text);
        text
          .setPlaceholder("")
          .setValue(`${plugin.settings.azureblobstorage.containerSasUrl}`)
          .onChange(async (value) => {
            plugin.settings.azureblobstorage.containerSasUrl = value.trim();
            await plugin.saveSettings();
          });
      });
```

With:
```ts
    new Setting(azureBlobStorageAllowedToUsedDiv)
      .setName(t("settings_azureblobstorage_containersasurl"))
      .setDesc(
        stringToFragment(t("settings_azureblobstorage_containersasurl_desc"))
      )
      .addComponent((el) =>
        new SecretComponent(app, el)
          .setValue(plugin.settings.azureblobstorage.containerSasUrl)
          .onChange(async (value) => {
            plugin.settings.azureblobstorage.containerSasUrl = value;
            await plugin.saveSettings();
          })
      );
```

**Note:** This file uses `app` and `plugin` (passed as function parameters), not `this.app` and `this.plugin`. Check the function signature to confirm the correct variable names.

**Step 3: Run tests**

Run: `bun test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add pro/src/settingsAzureBlobStorage.ts
git commit -m "feat: replace Azure Blob SAS URL input with SecretComponent"
```

---

### Task 9: Bump minAppVersion

**Files:**
- Modify: `manifest.json:5`

**Step 1: Update the version**

In `manifest.json`, change:
```json
"minAppVersion": "1.10.0",
```
To:
```json
"minAppVersion": "1.11.1",
```

**Step 2: Commit**

```bash
git add manifest.json
git commit -m "feat: bump minAppVersion to 1.11.1 for SecretStorage support"
```

---

### Task 10: End-to-end verification

**Step 1: Run all tests**

Run: `bun test`
Expected: All tests pass.

**Step 2: Verify the build compiles**

Run: `bun run build`
Expected: Build succeeds with no TypeScript errors.

**Step 3: Review all changes**

Run: `git diff main --stat` and `git log --oneline main..HEAD`
Expected: Changes only in the files specified in this plan.

**Step 4: Final commit (if any fixups needed)**

Only if previous steps revealed issues that needed fixing.

---

## Unresolved Questions

1. **E2E password confirm flow:** The E2E password uses a `PasswordModal` with a confirm button. Does `SecretComponent` work well inside this flow, where the user selects a secret name but doesn't "confirm" it until clicking the button? The `newPassword` variable will hold a secret *name* instead of a raw password — the `PasswordModal` will need to resolve it before using it. This may require a small change to the modal.

2. **`SecretComponent` availability in type declarations:** The current `obsidian` types in `node_modules` may not include `SecretComponent` if the type stubs are older than 1.11.1. If so, the import will fail at compile time. Check `node_modules/obsidian/obsidian.d.ts` for `SecretComponent` — if missing, the obsidian types package needs updating.

3. **Sync paths beyond the main sync:** Are there other places where `getClient()` is called besides the main sync method? Search for all `getClient(` calls to ensure secret resolution covers all code paths.
