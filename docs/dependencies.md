# Pinned sources and verification

- LittleJS-AI 1.3.1, commit `5b712052848b58e4fce127cec2531c024cb3d9b5`.
  Its bundled engine is **1.27.0**. Use this engine with its helpers and guide.
- LittleJS 1.27.2, commit `cdcbef463d889d24dee37f481c2ea5f49bf7fcf5`.
  Complete source, examples, plugins, API/editor docs and original notices.
- ai-handbook routing reference inspected at
  `19f13d8907a2b12c2452cefa9c3e2d5ff633efaa`:
  [game route](https://github.com/KakkoiSchool/ai-handbook/blob/19f13d8907a2b12c2452cefa9c3e2d5ff633efaa/recipes/games.md).
  It is linked, not copied as a second handbook.

Both upstream projects are MIT. Optional Box2D components retain zlib notices in
vendor/littlejs/COPYRIGHT.txt. Original package/asset notices remain in their
snapshots. No optional native/WASM, Vite, TypeScript or external ThreeJS dependency
is required by our two starters. Keep all relevant notices if adopting those
optional components. Do not call all reference examples dependency-free.

Every source file hash and commit is in vendor/LOCK.json. Check before scaffolding.
Upgrade by replacing an explicit snapshot, updating hashes and replaying browser
checks. Never update the AI engine using the separate snapshot without compatibility
verification. Do not run vendor npm scripts or install all its dev dependencies
just to play the standard starters.

Offline contracts: `python3 -B tools/check.py`.
Optional development browser setup:

```sh
npm ci --prefix tests/browser --ignore-scripts
tests/browser/node_modules/.bin/playwright install chromium
node tests/browser.cjs
```

Without installing, an existing Playwright and Chromium can be used:
`NODE_PATH=<dir with playwright> GAMING_CORE_CHROMIUM=<chromium or headless_shell path> node tests/browser.cjs`.
The input mapping unit tests (`node --test tests/input_core.cjs`) need only Node and run in tools/check.py.
The browser runner also drives keyboard, mouse, wheel and a mocked `navigator.getGamepads()`.

The browser runner checks copied starters on a local server with external requests
blocked and saves screenshots. Actual browser evidence is separate from source
checks. Reference examples remain unverified until their own scenarios are tested.
