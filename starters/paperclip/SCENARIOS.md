# Paperclip Factory

## Scenarios

### PC-01 Make clips and buy a machine without starting automation
- Given a new factory with zero clips
- When I make ten clips and buy a machine
- Then I have one machine, zero clips, and automation stays off.

### PC-02 Toggle automatic production and restart
- Given a factory with one machine
- When I turn automation on, turn it off, then turn it on and restart
- Then clips accrue only while automation is on, and restart clears clips, machines and the timer.

### PC-03 Reach the goal with manual clicks
- Given a new factory
- When I make 100 clips by hand
- Then the factory announces that I reached the goal.
