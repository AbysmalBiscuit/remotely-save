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
