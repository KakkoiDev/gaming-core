# Scenarios: Turbo Loop (racing)

A top-down racer: a 3 · 2 · 1 · GO countdown, your car against three computer cars, checkpoints that count only in
order, three laps and a results table; finishing last is Game Over, and Time Trial keeps your best lap. Each scenario
is one test of the same title in `tests/e2e/genres/racing.cjs` (a fresh game each time); the game kit's own scenarios
run too (`starters/kit/SCENARIOS.md`).

### Scenario: Race starts a countdown and the cars wait for GO
- Given the title screen with Race focused
- When I press Enter
- Then the HUD shows "3", four cars are on the grid and I start "4th / 4"
- And holding the accelerator does not move the car before GO
- And after the countdown the HUD reads "GO" and the tip shows

### Scenario: The accelerator drives to the first checkpoint and the start line is not a lap
- Given a race after GO
- When I hold the accelerator down the straight
- Then the car speeds past the first checkpoint and the HUD shows the speed
- And crossing the start line at the start counted no lap

### Scenario: Left steers and the brake slows the car
- Given my car speeding down the straight
- When I hold left with the accelerator
- Then the car turns left
- And holding the brake slows it down

### Scenario: Esc pauses the race and Esc resumes
- Given a race with my car moving
- When I press Esc
- Then the pause menu opens and no car and no clock moves for 15 ticks
- And Esc again resumes the race

### Scenario: The line without the checkpoints before it is not a lap
- Given my car just before the finish line, with no checkpoint passed
- When I drive over the line
- Then no lap is counted

### Scenario: Three laps in order finish first with the results table
- Given a race after GO
- When I drive over the line from the last checkpoint three times
- Then the HUD reads "Lap 2 / 3", then "Lap 3 / 3" with "Final Lap"
- And the results read "You finished 1st" with every racer in the table and my total time
- And Retry, focused, starts a new race from the countdown

### Scenario: The gamepad's right trigger accelerates and the stick steers
- Given a race after GO with a gamepad plugged in
- When I hold the right trigger, then push the stick right
- Then the car speeds up and turns right
- And the game reads the gamepad as the device

### Scenario: Finishing last shows Game Over
- Given every rival home and my car on its final lap at the last checkpoint
- When I drive over the line
- Then the Game Over screen reads "Last Place"
- And Back to Title returns to the title

### Scenario: Time Trial races alone and saves the best lap
- Given the title screen
- When I choose Time Trial and drive three laps
- Then only my car was on the track
- And the results read "Time Trial" and the best lap is saved
- And Back to Title returns to the title

### Scenario: The on-screen Gas, Brake and Boost buttons drive on a touch screen
- Given a race after GO played on a touch screen
- When I hold Gas, then Brake, then press Boost with the bar full
- Then the car speeds up, slows down, and boosts

### Scenario: The controls list shows every action of this game
- Given the Controls screen opened from Settings
- When I read the list
- Then it shows Steer, Accelerate, Brake / reverse and Boost, then the fixed Pause and Back (menus) rows
