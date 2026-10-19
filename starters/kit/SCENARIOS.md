# Scenarios: the game kit (every genre starter)

The kit's shared blocks, as a player meets them. Each scenario is one test of the same title in `tests/e2e/kit.cjs`,
played on every genre starter by `node tests/e2e.cjs` (a fresh game on its title screen each time).

### Scenario: Language switches every visible text at once and is saved
- Given the title screen in English
- When I open Settings, choose the Language tab and press the Language row
- Then the page and the Settings title are in Japanese
- And the language is saved under <game-id>.settings
- And the title's Confirm hint reads 決定 after I close Settings
- And pressing the Language row again brings English back

### Scenario: Audio settings change with the arrow keys and clicks
- Given the Audio tab of Settings is open
- When I press ← on the Music row, click the right half of the Sound Effects row and click Mute When in Background
- Then Music is lower, Sound Effects stays at its loudest
- And Mute When in Background is on and saved

### Scenario: Display settings change and are saved
- Given the Display tab of Settings is open
- When I press Reduce Motion and Text Size
- Then Reduce Motion is on, the text is large, and both are saved
- And Full Screen can be switched on

### Scenario: A rebindable action takes the next key and is saved
- Given the Controls screen opened from the Settings' Controls tab
- When I choose the first rebindable action and press K
- Then that action's keyboard input is K
- And it is saved under <game-id>.input in gaming-core's format
- And the fixed rows Pause and Back come last and cannot be chosen

### Scenario: A key that a fixed action holds is refused
- Given the Controls screen is listening for a new key
- When I press P, which Pause holds
- Then the screen says Pause holds it
- And Esc stops listening

### Scenario: The gamepad tab shows button positions
- Given a gamepad is connected and the Controls screen is open
- When I choose the Gamepad tab
- Then the inputs are shown by position, never by letter
- And the Keyboard tab brings the keys back

### Scenario: Reset All brings back the default controls
- Given I bound an action to K on the Controls screen
- When I press R and confirm
- Then the action no longer holds K

### Scenario: The game pauses when the window loses focus
- Given a game is being played
- When the window loses focus
- Then the pause menu opens with "Paused while you were away"
- And Resume plays on

### Scenario: The pause menu opens Settings and Controls
- Given a game is being played
- When I press Esc and choose Controls
- Then the Controls screen opens, and Back returns to the pause menu
- And Settings opens the Settings screen

### Scenario: A touch shows the on-screen controls and Tap prompts
- Given the game is played with a keyboard
- When a finger touches the screen
- Then the device becomes touch and stays touch
- And the on-screen controls show where the genre has them
- And the on-screen Pause button opens the pause menu
