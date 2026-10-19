# Scenarios: emptyGame (the input layer on a bare LittleJS game)

A square a player moves with gaming-core's input actions (starters/input.js): keyboard, mouse, wheel and a gamepad,
rebinding and its storage. Canvas only, no menus. Each scenario is one test of the same title in
`tests/e2e/emptyGame.cjs`, played on a fresh copy by `node tests/e2e.cjs emptyGame`.

### Scenario: Holding D moves the square right and prompts name keyboard keys
- Given a fresh emptyGame
- When I hold D
- Then the square moves right and the device is the keyboard
- And the jump prompt reads "Space"

### Scenario: Space is the jump action
- Given a fresh emptyGame
- When I press Space
- Then the jump action is pressed

### Scenario: A left click fires and moves the square to the pointer
- Given a fresh emptyGame
- When I click the canvas
- Then the fire action is pressed and the square is under the pointer
- And the fire prompt reads "Left click"
- And the mouse wheel is reported

### Scenario: A gamepad stick moves the square and buttons are named by position
- Given a fresh emptyGame
- When I plug a gamepad and push its left stick right
- Then the square moves right and the device is the gamepad
- And the jump prompt reads "South", or "A" only when Xbox names are asked for
- And the south button jumps and back is the east button

### Scenario: The d-pad moves the square and an unplugged stick stops it
- Given a gamepad is plugged in
- When I hold the d-pad right, then hold the stick up and unplug the gamepad
- Then the square moved right
- And after unplugging it stays still and the keyboard is the device again

### Scenario: A rebound key is saved, survives a reload, and Reset brings the defaults back
- Given a fresh emptyGame
- When I bind jump to Q and save
- Then the binding is saved under <game-id>.input
- And after a reload Q jumps and Z no longer does
- And after Reset and a reload jump is Space, Z and the south button again

### Scenario: Pause and back cannot be rebound
- Given a fresh emptyGame
- When I try to bind pause or back to Q
- Then both are refused

### Scenario: Input is read once per tick, paused ticks included
- Given a fresh emptyGame
- When I read the input twice in one tick, then pause the engine
- Then both reads are the same snapshot
- And input ticks keep counting while paused
