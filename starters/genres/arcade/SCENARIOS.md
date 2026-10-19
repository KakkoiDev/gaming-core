# Scenarios: Arcade Pack (arcade)

Bricks, Snake and Paddle behind one title menu. Each scenario is one test of the same title in
`tests/e2e/genres/arcade.cjs` (a fresh game each time); the game kit's own scenarios run too
(`starters/kit/SCENARIOS.md`).

### Scenario: The title menu moves with the gamepad and shows button positions
- Given the title screen with Bricks focused
- When I plug a gamepad and press down, then up, on the d-pad
- Then focus moves to Snake and back to Bricks
- And the confirm prompt shows the south button's position, never a letter

### Scenario: The mouse paddle breaks bricks and the HUD shows the score
- Given a game of Bricks after Enter, with the serve tutorial showing
- When I serve with Space and follow the ball with the mouse
- Then bricks break and the score reaches 30
- And the HUD shows the score

### Scenario: Clearing the wall opens Next Level
- Given a game of Bricks with one brick left and the ball under it
- When the ball breaks the last brick
- Then the results read "Wall Cleared"
- And Next Level starts level 2 with a full wall

### Scenario: Losing every life with a top score asks for a name
- Given a game of Bricks with 30 points
- When the ball falls past the paddle three times
- Then the results ask for my name
- And after I type "ace" the high score table shows ACE
- And Try Again starts a new game at 0

### Scenario: Esc pauses the world and Esc resumes
- Given a ball in play in Bricks
- When I press Esc
- Then the pause menu opens and the ball stops
- And Esc again resumes the game

### Scenario: Quit from the pause menu asks first, then goes back to the title
- Given the pause menu is open during Bricks
- When I choose Quit to Title
- Then a confirm dialog opens with Cancel focused
- And Cancel keeps me in the pause menu
- And confirming Quit to Title shows the title screen

### Scenario: Snake eats, turns, and a crash records a high score
- Given a game of Snake chosen from the title with the arrow keys
- When the snake eats the food in front of it and I turn up
- Then the score is 10 and the snake is 4 long
- And crashing into the wall asks for my name and records 10
- And Back to Title returns to the title

### Scenario: Paddle scores a point and wins at 7
- Given a game of Paddle chosen with the mouse
- When I serve and the ball passes the other paddle
- Then my score is 1
- And at 7 the results read "You Win"
- And Try Again starts a new game of Paddle

### Scenario: The on-screen Serve button serves on a touch screen
- Given a game of Bricks played on a touch screen
- When I press the on-screen Serve button
- Then the ball is served

### Scenario: The controls list shows every action of this game
- Given the Controls screen opened from Settings
- When I read the list
- Then it shows Move and Serve, then the fixed Pause and Back (menus) rows
