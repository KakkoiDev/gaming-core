# Scenarios: pong (a two-paddle LittleJS game on gaming-core input)

Canvas only, no menus. Each scenario is one test of the same title in `tests/e2e/pong.cjs`, played on a fresh copy by
`node tests/e2e.cjs pong`.

### Scenario: The whole field fits a 1000 by 700 window and a phone view
- Given pong in a 1000 by 700 window
- When I look at the field
- Then both paddles and the field are inside the view
- And after resizing to a 390 by 844 phone view they still are

### Scenario: The mouse moves the left paddle and a click serves
- Given pong waiting for a serve
- When I move the mouse down and click
- Then the left paddle follows the mouse
- And the ball is served

### Scenario: A ball past the right edge scores and waits for the next serve
- Given a ball in play
- When it passes the right edge
- Then the left score goes up by one and pong waits to serve
- And a click serves again

### Scenario: Esc pauses the ball and P resumes
- Given a ball in play
- When I press Esc
- Then the game pauses, the ball stops, and the debug overlay stays closed
- And P resumes the game

### Scenario: W moves the paddle and Enter serves
- Given pong waiting for a serve, the paddle moved down with S
- When I hold W, then press Enter
- Then the left paddle moves up and the confirm prompt reads "Enter"
- And the ball is served

### Scenario: The gamepad stick moves the paddle, South serves and Start pauses
- Given pong waiting for a serve and a gamepad plugged in
- When I push the stick down, press South, then press Start twice
- Then the paddle moves down and the confirm prompt reads "South"
- And the ball is served, the game pauses, and resumes

### Scenario: An unplugged stick stops the paddle
- Given a gamepad holding the stick up
- When I unplug it
- Then the paddle stays still
