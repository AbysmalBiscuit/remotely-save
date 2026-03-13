# Changelog

## [0.7.0](https://github.com/AbysmalBiscuit/remotely-save/compare/v0.6.1...v0.7.0) (2026-03-13)


### Features

* add excluded folders picker UI to settings ([b244cb4](https://github.com/AbysmalBiscuit/remotely-save/commit/b244cb44b2afe0d911d00c85b8ac9cfa789701ba))
* add excludedFolders field to plugin settings ([4072c3d](https://github.com/AbysmalBiscuit/remotely-save/commit/4072c3d33bbcea5934e1d6246d6511c279ffc065))
* add i18n strings for excluded folders setting ([1ad0c7c](https://github.com/AbysmalBiscuit/remotely-save/commit/1ad0c7cf71ec1ec239dd521c3c73b071bf0b79c5))
* filter excluded folders in walk() before sync pipeline ([2f30543](https://github.com/AbysmalBiscuit/remotely-save/commit/2f30543644a3c82400b6f9a2a853cdb6fc539973))


### Bug Fixes

* apply excludedFolders in checkIsSkipItemOrNotByName so remote entries are also excluded from sync ([6e43cc5](https://github.com/AbysmalBiscuit/remotely-save/commit/6e43cc5617d2ac3054171938c104e32cbda3a32e))
* exclude TFolder entity itself by normalizing key before prefix check ([09af2e6](https://github.com/AbysmalBiscuit/remotely-save/commit/09af2e6090b52ca3dbb9f35b0290490d1655f034))
* pass excludedFolders to FakeFsLocal in clear dup files flow ([e90ae0b](https://github.com/AbysmalBiscuit/remotely-save/commit/e90ae0bb7d5357b090fe1ec193bfd52a56f90e2b))
* recursively enumerate child folders of hidden directories in exclusion picker ([ebcd53a](https://github.com/AbysmalBiscuit/remotely-save/commit/ebcd53aa293a1b7a29449a5f35d9d5d612e71a5c))
* show hidden folders in exclusion picker and remove root folder from options ([696130d](https://github.com/AbysmalBiscuit/remotely-save/commit/696130dd7405a6f9e8e48fe87273d2ffb64feee2))
* use normalized key for folder exclusion check, remove redundant field initializer ([6e7a57c](https://github.com/AbysmalBiscuit/remotely-save/commit/6e7a57cae8389d000935b8115ed482f45d9c11d4))

## [0.6.1](https://github.com/AbysmalBiscuit/remotely-save/compare/v0.6.0...v0.6.1) (2026-02-04)


### Bug Fixes

* plugin not loading on mobile ([a3c9b4e](https://github.com/AbysmalBiscuit/remotely-save/commit/a3c9b4e0022ecb39d4bed6e06770852e2752e2e7))
* restore esbuild.injecthelper.mjs process injection ([dd05973](https://github.com/AbysmalBiscuit/remotely-save/commit/dd05973f67bc214b89f403bed29e33b2be35ed85))

## [0.6.0](https://github.com/AbysmalBiscuit/remotely-save/compare/v0.5.27...v0.6.0) (2026-02-03)


### Features

* add secret name mapping and resolveSecret helper ([259c0e5](https://github.com/AbysmalBiscuit/remotely-save/commit/259c0e5f9288ec81d23c4ff17f1106b8dee8a90e))
* add secrets migration logic with getSecretsToMigrate ([66f2fef](https://github.com/AbysmalBiscuit/remotely-save/commit/66f2fef10f929fdfd0ed96d7df51e54a10f8ba30))
* add secretsMigrated field to settings ([f59d969](https://github.com/AbysmalBiscuit/remotely-save/commit/f59d96938b411407d504d28bb7623e05d637113d))
* bump minAppVersion to 1.11.1 for SecretStorage support ([30eb2ef](https://github.com/AbysmalBiscuit/remotely-save/commit/30eb2ef3a9df77f169ffa4e78d0086fcbb92cf76))
* replace Azure Blob SAS URL input with SecretComponent ([c09d74b](https://github.com/AbysmalBiscuit/remotely-save/commit/c09d74b3235c89808051f39ab43da70bb6e54b44))
* replace S3 and E2E password inputs with SecretComponent ([d75b1e4](https://github.com/AbysmalBiscuit/remotely-save/commit/d75b1e46d06cbe780aab746de03c8045a44a04d7))
* replace WebDAV and Webdis inputs with SecretComponent ([0b478b8](https://github.com/AbysmalBiscuit/remotely-save/commit/0b478b8c39b0103956298a3912327421e05d2e1e))
* resolve secrets before sync operations ([30c8085](https://github.com/AbysmalBiscuit/remotely-save/commit/30c80854604e3e5eafd1d1b61605d4ce49a5ba7e))
* wire secrets migration into plugin onload ([383b68d](https://github.com/AbysmalBiscuit/remotely-save/commit/383b68d040b7da8f88d6a7e7508658a433d2133f))

## [0.5.27](https://github.com/AbysmalBiscuit/remotely-save/compare/0.5.26...v0.5.27) (2026-02-03)


### Bug Fixes

* mobile version errors due to missing imports ([1fcb8d6](https://github.com/AbysmalBiscuit/remotely-save/commit/1fcb8d66378586b43303b06f15045ec0fb824230))
* typescript errors ([655df3d](https://github.com/AbysmalBiscuit/remotely-save/commit/655df3d511efa4bb203c60df10e66adbe80aa38e))
