import { strict as assert } from "assert";
import {
  SECRET_FIELD_MAP,
  camelToSecretName,
  getResolvedSettings,
  getSecretsToMigrate,
  migrateSecretsToStorage,
  resolveSettingsSecrets,
} from "../src/secrets";

const makeFakeApp = (initial?: Record<string, string>) => {
  const store = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    store,
    app: {
      secretStorage: {
        setSecret: (id: string, secret: string) => {
          store.set(id, secret);
        },
        getSecret: (id: string) => store.get(id) ?? null,
        listSecrets: () => [...store.keys()],
      },
    } as any,
  };
};

const makeEmptySettings = () =>
  ({
    s3: { s3AccessKeyID: "", s3SecretAccessKey: "" },
    webdav: { username: "", password: "" },
    webdis: { username: "", password: "" },
    azureblobstorage: { containerSasUrl: "" },
    password: "",
    secretsMigrated: false,
  }) as any;

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
      assert.equal(SECRET_FIELD_MAP["password"], "remotely-save-e2e-password");
    });
  });

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

  describe("migrateSecretsToStorage", () => {
    it("should move raw values into SecretStorage under canonical names", async () => {
      const { app, store } = makeFakeApp();
      const settings = makeEmptySettings();
      settings.webdav.username = "alice";
      settings.webdav.password = "raw-app-password";

      await migrateSecretsToStorage(app, settings);

      assert.equal(store.get("remotely-save-webdav-username"), "alice");
      assert.equal(
        store.get("remotely-save-webdav-password"),
        "raw-app-password"
      );
      assert.equal(settings.webdav.username, "remotely-save-webdav-username");
      assert.equal(settings.webdav.password, "remotely-save-webdav-password");
      assert.equal(settings.secretsMigrated, true);
    });

    it("should set secretsMigrated even when there is nothing to migrate", async () => {
      const { app } = makeFakeApp();
      const settings = makeEmptySettings();

      await migrateSecretsToStorage(app, settings);

      assert.equal(settings.secretsMigrated, true);
    });

    it("should leave fields referencing an existing secret untouched", async () => {
      // The user picked or created a secret through the settings UI, so the
      // field already holds a secret name; re-wrapping it would store the
      // name itself as the canonical secret's value.
      const { app, store } = makeFakeApp({
        "my-nextcloud-pass": "real-password",
      });
      const settings = makeEmptySettings();
      settings.webdav.password = "my-nextcloud-pass";

      await migrateSecretsToStorage(app, settings);

      assert.equal(settings.webdav.password, "my-nextcloud-pass");
      assert.equal(store.has("remotely-save-webdav-password"), false);
      assert.equal(settings.secretsMigrated, true);
    });
  });

  describe("fresh install flow", () => {
    it("should resolve user-selected secrets after migration runs on load", async () => {
      // Fresh install: secretsMigrated defaults to false, the user selects
      // existing secrets via SecretComponent (fields hold secret names), and
      // then the plugin reloads: migrate, then resolve before connecting.
      const { app } = makeFakeApp({
        "nc-user": "alice",
        "nc-pass": "real-password",
      });
      const settings = makeEmptySettings();
      settings.webdav.username = "nc-user";
      settings.webdav.password = "nc-pass";

      await migrateSecretsToStorage(app, settings);
      const missing = resolveSettingsSecrets(app, settings);

      assert.deepEqual(missing, []);
      assert.equal(settings.webdav.username, "alice");
      assert.equal(settings.webdav.password, "real-password");
    });
  });

  describe("getResolvedSettings", () => {
    it("should return a resolved clone without mutating the original", () => {
      const { app } = makeFakeApp({
        "remotely-save-webdav-username": "alice",
        "remotely-save-webdav-password": "real-password",
      });
      const settings = makeEmptySettings();
      settings.webdav.username = "remotely-save-webdav-username";
      settings.webdav.password = "remotely-save-webdav-password";
      settings.secretsMigrated = true;

      const { settings: resolved, missingSecrets } = getResolvedSettings(
        app,
        settings
      );

      assert.deepEqual(missingSecrets, []);
      assert.equal(resolved.webdav.username, "alice");
      assert.equal(resolved.webdav.password, "real-password");
      // the stored settings keep the secret names
      assert.equal(settings.webdav.username, "remotely-save-webdav-username");
      assert.equal(settings.webdav.password, "remotely-save-webdav-password");
    });

    it("should report secret names that cannot be resolved on this device", () => {
      const { app } = makeFakeApp();
      const settings = makeEmptySettings();
      settings.webdav.password = "remotely-save-webdav-password";
      settings.secretsMigrated = true;

      const { missingSecrets } = getResolvedSettings(app, settings);

      assert.deepEqual(missingSecrets, ["remotely-save-webdav-password"]);
    });
  });
});
