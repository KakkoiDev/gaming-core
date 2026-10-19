# Verify and package a game

Open the actual game, test controls/core loop/restart, inspect console and screenshots at desktop/mobile sizes. No-build development is supported. Optional upstream release minification needs its own pinned dev installation and standalone/repo path configuration; our init command does not promise that build integration.

Local reference paths:

- [build.mjs](../vendor/littlejs-ai/build.mjs)
- [package-lock.json](../vendor/littlejs-ai/package-lock.json)

Read the pinned upstream AGENTS.md/reference for the selected engine before adapting.
Keep copied upstream license notices. Reference availability is not browser verification
of every example. Test the actual host result and report any unsupported features.

Scenarios: every starter's `SCENARIOS.md`; see "Testing protocol" in the README.
