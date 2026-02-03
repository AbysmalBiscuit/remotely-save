import { strict as assert } from "assert";
import {
  SECRET_FIELD_MAP,
  camelToSecretName,
  getSecretsToMigrate,
} from "../src/secrets";

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
});
