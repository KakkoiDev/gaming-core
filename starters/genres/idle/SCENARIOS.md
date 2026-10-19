# Scenarios: Coin Garden (idle)

Tap the big coin to earn, buy helpers that earn on their own and come back later to collect what they made. At a
million coins the garden is in full bloom: keep growing, or start over with a bigger bonus. Nothing fails; the
garden autosaves. Each scenario is one test of the same title in `tests/e2e/genres/idle.cjs` (a fresh game each
time); the game kit's own scenarios run too (`starters/kit/SCENARIOS.md`).

### Scenario: New Game opens the garden with the keys on the game
- Given the title screen of a first visit with New Game focused
- When I press Enter
- Then the coins, the helper list and the earning tip show
- And the keys belong to the game, not to a helper button

### Scenario: Space and a click on the coin earn, a click beside it does not
- Given a new garden
- When I press Space five times and click the coin
- Then I have 6 coins from 6 taps, as the HUD shows, and a +1 pops up
- And a click beside the coin earns nothing

### Scenario: Enter buys the first helper and income rises on its own
- Given a new garden with enough coins for a Sprout
- When the buy tip shows and I press Enter
- Then the Sprout is Lv 1 and the HUD shows +0.5 / s
- And the coins grow without a tap

### Scenario: Every helper in the list is bought with a click and the keys stay with the game
- Given a garden with 200,000 coins
- When I click Sprout, Bee Hive, Fountain, Windmill and Golden Tree
- Then each is Lv 1
- And the keys still belong to the game

### Scenario: Tab and the amount button cycle the buy amount
- Given a new garden
- When I press Tab, then click the amount button twice, then press Tab
- Then the amount reads ×10, then ×100 and Max, then ×1 again
- And with ×10 chosen, Enter buys ten Sprouts at once

### Scenario: The gamepad earns, chooses a helper and buys it
- Given a new garden with 200 coins and a gamepad
- When I press South, then down and up on the d-pad, then down and West
- Then one tap is counted
- And the chosen row moves to Bee Hive and back to Sprout
- And West buys a Bee Hive

### Scenario: Esc pauses and saves the garden, and Quit to Title offers Continue
- Given a garden with two Sprouts
- When I press Esc
- Then the pause menu opens, no coins come in and the garden is saved
- And Quit to Title shows the title with Continue

### Scenario: Coming back an hour later pays for the time away
- Given a saved garden with two Sprouts, saved an hour ago
- When I open the game again
- Then "While you were away (1 h 0 min)" shows before the title, with the garden restored and Collect focused
- And Collect adds half of an hour's income

### Scenario: Reaching a million coins opens the results with Keep Growing as the default
- Given a garden 3 coins short of the goal
- When I tap three times
- Then the results read "Garden in Full Bloom", with Keep Growing focused and Start Over with ×2 offered
- And Keep Growing returns to the garden

### Scenario: Starting over asks first and doubles the bonus
- Given the Garden in Full Bloom results
- When I choose Start Over with ×2
- Then a confirm dialog opens with Cancel focused
- And confirming starts a new garden with Bonus ×2, where a tap earns 2

### Scenario: Back to Title from the results keeps the garden and New Game asks before replacing it
- Given the Garden in Full Bloom results
- When I choose Back to Title
- Then the title offers Continue and New Game
- And New Game asks first, Cancel keeps the title
- And confirming New Game starts a fresh garden

### Scenario: The controls list shows every action of this game
- Given the Controls screen opened from Settings
- When I read the list
- Then it shows Earn, Buy, Buy amount and Choose a helper, then the fixed Pause and Back (menus) rows
