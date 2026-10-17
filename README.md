# gaming-core

Local, opinionated recipes and examples for agents building browser games with
LittleJS. Start from a playable loop, use existing helpers, verify the actual game.

Based on ai-handbook's task-routing approach: preserve the host, load only relevant
instructions, and use LittleJS-AI as the engine authority. No second engine
handbook or generic game framework is maintained here.

[Agent router](AGENTS.md) · [Recipes](RECIPES.md) · [All local examples](docs/examples.md)
· [Dependencies and versions](docs/dependencies.md) · [Pi integration](docs/pi-integration.md)

```sh
python3 -B tools/game.py catalog
python3 -B tools/game.py init pong --out /absolute/fresh/game
python3 -B tools/check.py
```

Open the generated index.html or serve the folder locally. No npm install, CDN,
model service or runtime build is needed for these two starters. Python 3.11+ is
only scaffold/check tooling; browser gameplay is JavaScript. Original library
recipes/adapters are MIT, upstream notices are retained.

The full pinned LittleJS-AI toolkit and LittleJS source/examples are available
locally. `CATALOG.json` indexes examples, templates and skills. Broader examples
are reference material, not a claim that every engine feature is integrated or
tested. Optional Box2D uses WASM and is outside the default starter. No live Pi
integration or weak-model benchmark is claimed.
