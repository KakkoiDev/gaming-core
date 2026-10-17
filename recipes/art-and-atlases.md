# Sprites, pixel atlases and terrain

Start with engine or helper drawing. For generated art use visual-core and retain source/provenance. Nearest filtering, no mipmaps for pixel terrain. The visual-core atlas has explicit rectangles and bit order; adapt coordinates, do not assume its mask order matches an engine enum.

Local reference paths:

- [textureGame.html](../vendor/littlejs-ai/templates/textureGame.html)
- [textureGenerator.js](../vendor/littlejs-ai/templates/textureGenerator.js)
- [animation.js](../vendor/littlejs/examples/shorts/animation.js)

Read the pinned upstream AGENTS.md/reference for the selected engine before adapting.
Keep copied upstream license notices. Reference availability is not browser verification
of every example. Test the actual host result and report any unsupported features.
