import { readFileSync, writeFileSync } from 'fs';

const targetVersion = process.argv[2]; // Passed from prepareCmd

if (!targetVersion) {
  console.error("No version provided");
  process.exit(1);
}

// 1. Update manifest.json
const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const minAppVersion = manifest.minAppVersion;
manifest.version = targetVersion;
writeFileSync('manifest.json', JSON.stringify(manifest, null, '\t'));

// 2. Update versions.json
let versions = {};
try {
  versions = JSON.parse(readFileSync('versions.json', 'utf8'));
} catch (e) {
  versions = {};
}
versions[targetVersion] = minAppVersion;
writeFileSync('versions.json', JSON.stringify(versions, null, '\t'));

console.log(`Successfully bumped to ${targetVersion}`);
