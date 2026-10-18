# gaming-core agent router

Read the host AGENTS.md/CLAUDE.md/README first. Preserve existing engines unless
migration was requested. For a new browser game use the pinned LittleJS-AI route:
[upstream instructions](vendor/littlejs-ai/AGENTS.md) and the relevant
[recipe](RECIPES.md). Do not load all examples into the prompt.

Choose a genre starter (`tools/game.py genres`, [genres](recipes/genres/README.md)) or
emptyGame/pong with tools/game.py init into a fresh directory. Genre starters put every word,
menu and number in HTML through the [game kit](recipes/game-kit.md), in English and Japanese. The
scaffolder copies actual engine bytes and licenses. Edit the new game, never the
vendor snapshot. Default engine is the AI snapshot 1.27.0: classic script globals,
no ESM/LJS namespace. Read its reference before guessing API names. The separate
1.27.2 engine snapshot is reference-only until deliberately adopted and tested.

Starters read controls through input.js ([input-actions](recipes/input-actions.md)).
Use engine math, input, collision, particles, UI and helper modules before writing
replacements. Keep a playable goal/failure/restart loop small. coding-core supports
pure rules/data transformations; it does not replace mutable EngineObjects.
visual-core owns UI/art generation; Pi's existing music tool owns custom audio;
p2p-core owns networking. No MCP server or new chat loop belongs here.

Run tools/check.py and the browser checks documented in docs/dependencies.md.
Inspect the actual game and console, test controls/restart and present a screenshot
or playable path. Distinguish copied examples from verified behavior. Keep metadata
and licenses on export; never silently fetch CDN dependencies. Use the user's
language. Deployment/Git operations follow ai-handbook and explicit user scope.
