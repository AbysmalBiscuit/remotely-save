import { strict as assert } from "assert";
import { checkIsSkipItemOrNotByName } from "../src/sync";

describe("Sync: checkIsSkipItemOrNotByName", () => {
  it("should be ok everywhere for empty config", async () => {
    let isSkip = checkIsSkipItemOrNotByName(
      "xxx.md",
      false,
      false,
      false,
      ".obsidian",
      /*    ignorePaths */ [],
      /* onlyAllowPaths */ []
    ).finalIsIgnored;
    assert.ok(!isSkip);

    isSkip = checkIsSkipItemOrNotByName(
      "xxx.md",
      false,
      false,
      false,
      ".obsidian",
      /*    ignorePaths */ [""],
      /* onlyAllowPaths */ ["", "\n"]
    ).finalIsIgnored;
    assert.ok(!isSkip);
  });

  it("should be ok for deny list", async () => {
    let isSkip = checkIsSkipItemOrNotByName(
      "xxx.md",
      false,
      false,
      false,
      ".obsidian",
      /*    ignorePaths */ ["xxx"],
      /* onlyAllowPaths */ []
    ).finalIsIgnored;
    assert.ok(isSkip);

    isSkip = checkIsSkipItemOrNotByName(
      "yyy.md",
      false,
      false,
      false,
      ".obsidian",
      /*    ignorePaths */ ["xxx"],
      /* onlyAllowPaths */ []
    ).finalIsIgnored;
    assert.ok(!isSkip);

    isSkip = checkIsSkipItemOrNotByName(
      "xxx.md",
      false,
      false,
      false,
      ".obsidian",
      /*    ignorePaths */ ["xxx$"],
      /* onlyAllowPaths */ []
    ).finalIsIgnored;
    assert.ok(!isSkip);

    // if we deny a folder, we have to deny all the sub files
    // TODO: it's soooo hard to do the path resolution in this func with regex,
    //       so we defer the detection to later steps now.
    //       the test here doesn't work.
    // isSkip = checkIsSkipItemOrNotByName(
    //   'xxx/yyy.md',
    //   false,
    //   false,
    //   false,
    //   '.obsidian',
    //   /*    ignorePaths */ ['xxx/$'],
    //   /* onlyAllowPaths */ []
    // ).finalIsIgnored;
    // assert.ok(isSkip);
  });

  it("should be ok for allow list", async () => {
    let isSkip = checkIsSkipItemOrNotByName(
      "xxx.md",
      false,
      false,
      false,
      ".obsidian",
      /*    ignorePaths */ [],
      /* onlyAllowPaths */ ["xxx"]
    ).finalIsIgnored;
    assert.ok(!isSkip);

    isSkip = checkIsSkipItemOrNotByName(
      "yyy.md",
      false,
      false,
      false,
      ".obsidian",
      /*    ignorePaths */ [""],
      /* onlyAllowPaths */ ["xxx"]
    ).finalIsIgnored;
    assert.ok(isSkip);

    isSkip = checkIsSkipItemOrNotByName(
      "xxx.md",
      false,
      false,
      false,
      ".obsidian",
      /*    ignorePaths */ [],
      /* onlyAllowPaths */ ["xxx$"]
    ).finalIsIgnored;
    assert.ok(isSkip);

    // should NOT skip because we allow the sub file AND not deny the folder
    // TODO: it's soooo hard to do the path resolution in this func with regex,
    //       so we defer the detection to later steps now.
    //       the test here doesn't work.
    // isSkip = checkIsSkipItemOrNotByName(
    //   'xxx/',
    //   false,
    //   false,
    //   false,
    //   '.obsidian',
    //   /*    ignorePaths */ [],
    //   /* onlyAllowPaths */ ['xxx/yyy.md']
    // ).finalIsIgnored;
    // assert.ok(!isSkip);
  });

  it("should detect the name by two lists together", async () => {
    // should skip because we ignore the path
    let isSkip = checkIsSkipItemOrNotByName(
      "xxx.md",
      false,
      false,
      false,
      ".obsidian",
      /*    ignorePaths */ ["xxx"],
      /* onlyAllowPaths */ ["yyy"]
    ).finalIsIgnored;
    assert.ok(isSkip);

    // should skip because we disallow the whole folder
    isSkip = checkIsSkipItemOrNotByName(
      "xxx/yyy.md",
      false,
      false,
      false,
      ".obsidian",
      /*    ignorePaths */ ["xxx"],
      /* onlyAllowPaths */ ["xxx/yyy.md"]
    ).finalIsIgnored;
    assert.ok(isSkip);
  });

  it("should skip items inside excludedFolders", async () => {
    // folder itself
    let isSkip = checkIsSkipItemOrNotByName(
      "Notes/",
      false,
      false,
      false,
      ".obsidian",
      /* ignorePaths */ [],
      /* onlyAllowPaths */ [],
      /* excludedFolders */ ["Notes/"]
    ).finalIsIgnored;
    assert.ok(isSkip);

    // file inside excluded folder
    isSkip = checkIsSkipItemOrNotByName(
      "Notes/foo.md",
      false,
      false,
      false,
      ".obsidian",
      /* ignorePaths */ [],
      /* onlyAllowPaths */ [],
      /* excludedFolders */ ["Notes/"]
    ).finalIsIgnored;
    assert.ok(isSkip);

    // nested folder inside excluded folder
    isSkip = checkIsSkipItemOrNotByName(
      "Notes/sub/",
      false,
      false,
      false,
      ".obsidian",
      /* ignorePaths */ [],
      /* onlyAllowPaths */ [],
      /* excludedFolders */ ["Notes/"]
    ).finalIsIgnored;
    assert.ok(isSkip);

    // sibling folder should not be excluded
    isSkip = checkIsSkipItemOrNotByName(
      "Notes-Old/foo.md",
      false,
      false,
      false,
      ".obsidian",
      /* ignorePaths */ [],
      /* onlyAllowPaths */ [],
      /* excludedFolders */ ["Notes/"]
    ).finalIsIgnored;
    assert.ok(!isSkip);

    // empty excludedFolders excludes nothing
    isSkip = checkIsSkipItemOrNotByName(
      "Notes/foo.md",
      false,
      false,
      false,
      ".obsidian",
      /* ignorePaths */ [],
      /* onlyAllowPaths */ [],
      /* excludedFolders */ []
    ).finalIsIgnored;
    assert.ok(!isSkip);
  });
});
