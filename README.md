# village

village/
    main.ts
    tests.ts
    core/
        state.ts        # state management, spatial index
        engine.ts       # turn logic, execution
        player.ts       # state projection
    game/
        actions.ts
        tiles.ts
        structures.ts   # not impl yet
    llms/               # not impl yet
        llms.ts         # not impl yet

todo:
basic world:
    [x] basic world generation; tiles
    [x] basic save/load
    [x] basic view
singleplayer:
    [x] add a player
    [x] add movement action
    [x] impl exec cmd
multiplayer:
    [x] add turn logic
testing/cleanup:
    [x] consider renaming some stuff
    [x] fix gigantic state file, break things out
    [x] make view fns cleaner, spectator friendly
    [x] write basic tests
puritan refactor:
    [ ] actions as effects
    [ ] game effects
logging:
    [ ] add basic system logging
    [ ] add basic event logging
    [ ] add event log to player views
resources:
    [ ] add player inventory
    [ ] add foraging action
building:
    [ ] add structures to state
    [ ] impl basic farm, actions
testing:
    [ ] add tests
game logic:
    [ ] add more tiles, structures, etc


