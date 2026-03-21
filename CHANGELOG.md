# Changelog

## 0.2.1-beta.0 (2026-03-21)

### Features

* add 16 example extensions covering all hook patterns ([0562156](https://github.com/ashigirl96/hx-cli/commit/0562156c08afbf532ea434037435ebc00417ceae))
* add build pipeline and settings management ([5407a7e](https://github.com/ashigirl96/hx-cli/commit/5407a7efd3050ba37d68a0c682d504ea896cedc2))
* add CLI with build/init/new/list/enable/disable/clean commands ([1846b70](https://github.com/ashigirl96/hx-cli/commit/1846b703dcc8d724d7b1fa845e3c9ddcad5112e5))
* add core extension SDK (types, API, runtime) ([3a42f52](https://github.com/ashigirl96/hx-cli/commit/3a42f52aa34982495eb24c4300a1163bbf95ccf2))
* add ergonomic output helpers, matcher shorthand, and relaxed tool_input types ([60f36cc](https://github.com/ashigirl96/hx-cli/commit/60f36cc02ef19619294a99d674a751a25fd91667))
* add pre-commit check hook to guard extension ([67e69c2](https://github.com/ashigirl96/hx-cli/commit/67e69c2fc4707b5abaaa54726366f2503af91cc4))
* add release-it for automated releases ([d031730](https://github.com/ashigirl96/hx-cli/commit/d0317307c0c1fa9adf3d314291de053293c4e829))
* add sample guard extension blocking destructive commands ([de73974](https://github.com/ashigirl96/hx-cli/commit/de73974556d4816829b08e182831fa45f17b8deb))
* default to pre-release, add release:stable for promotion ([7ac8a39](https://github.com/ashigirl96/hx-cli/commit/7ac8a39c778572248e2ed7b0427f44e9bc0bd4f6))
* flatten build output to hooks/<name>.mjs and add visible() notification ([a212d34](https://github.com/ashigirl96/hx-cli/commit/a212d34fa8ee8a39b0151542e1cf02cdc2b794fe))

### Bug Fixes

* add GITHUB_TOKEN to release script and revert accidental version bump ([529a053](https://github.com/ashigirl96/hx-cli/commit/529a053f74733e8af586292ab6cc92d4e0a63c68))
* address code review — stale hooks, type safety, and artifact uniqueness ([b280d94](https://github.com/ashigirl96/hx-cli/commit/b280d94bdd2f55870de856c501b4aa085d5ecc1e))
* format CHANGELOG.md before commit in release-it hook ([73eabb4](https://github.com/ashigirl96/hx-cli/commit/73eabb45af8fc3358705d102513d1ef7a56b0110))
* guard oxfmt in release hook for missing CHANGELOG.md ([7fdf9b3](https://github.com/ashigirl96/hx-cli/commit/7fdf9b395c84f428d1db4d9b0486b3fbd3d4b784))
* prevent accidental auto-approval on PermissionRequest ([ae8a328](https://github.com/ashigirl96/hx-cli/commit/ae8a3287cd54c51b753b3a069379ec335458b24c))
* quote entire command path to handle spaces in directories ([fbcac82](https://github.com/ashigirl96/hx-cli/commit/fbcac82e5bc4e7599599bd3540e31aecfc56e6d0))
* remove useless return to fix oxlint CI failure ([4bde4e9](https://github.com/ashigirl96/hx-cli/commit/4bde4e92363f78580488b5e018ee1f627b6d7d8e))
* remove useless undefined return to satisfy oxlint ([b2fa926](https://github.com/ashigirl96/hx-cli/commit/b2fa926f04206d94e0cf7c49b6cdfcd177c80793))
* resolve "clex" imports when installed globally ([cccffc0](https://github.com/ashigirl96/hx-cli/commit/cccffc036f4fd6e2bf0a4644b67e733d7d1c277b))
* skip pre-push hook for release-it push ([9e53794](https://github.com/ashigirl96/hx-cli/commit/9e53794cf7354232f36ad850b066065833d4e2ca))
* use prerelease increment to only bump pre-release number ([e681b00](https://github.com/ashigirl96/hx-cli/commit/e681b005d9d3aefe38a467be879dc5103c374b1d))
* use symlink instead of Bun.plugin for runtime "clex" resolution ([0ccdcc9](https://github.com/ashigirl96/hx-cli/commit/0ccdcc94705bef646cec67c5907ab7c57da6d77b))
