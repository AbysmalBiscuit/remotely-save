import { describe, test, expect } from "bun:test";

// We test the normalization logic and prefix matching directly
// since FakeFsLocal requires Obsidian's Vault which isn't available in unit tests.

function normalizeExcludedFolder(p: string): string {
  let normalized = p.trim();
  if (normalized.startsWith("/")) normalized = normalized.slice(1);
  if (!normalized.endsWith("/")) normalized = normalized + "/";
  return normalized;
}

function isExcluded(entryPath: string, excludedFolders: string[]): boolean {
  return excludedFolders.some(prefix => entryPath.startsWith(prefix));
}

describe("folder exclusion filter", () => {
  test("normalizes path: removes leading slash", () => {
    expect(normalizeExcludedFolder("/Notes/")).toBe("Notes/");
  });

  test("normalizes path: adds trailing slash", () => {
    expect(normalizeExcludedFolder("Notes")).toBe("Notes/");
  });

  test("normalizes path: handles both", () => {
    expect(normalizeExcludedFolder("/.dev/node_modules")).toBe(".dev/node_modules/");
  });

  test("excludes exact folder", () => {
    expect(isExcluded("Notes/", ["Notes/"])).toBe(true);
  });

  test("excludes file inside folder", () => {
    expect(isExcluded("Notes/foo.md", ["Notes/"])).toBe(true);
  });

  test("excludes nested folder", () => {
    expect(isExcluded("Notes/sub/", ["Notes/"])).toBe(true);
  });

  test("does not exclude unrelated path", () => {
    expect(isExcluded("NotesArchive/foo.md", ["Notes/"])).toBe(false);
  });

  test("does not exclude sibling folder", () => {
    expect(isExcluded("Notes-Old/", ["Notes/"])).toBe(false);
  });

  test("empty excludedFolders excludes nothing", () => {
    expect(isExcluded("Notes/foo.md", [])).toBe(false);
  });
});
