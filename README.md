# village

village/
    main.ts
    core/
        state.ts
    world/
        tiles.ts
        structures.ts

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
    [ ] consider renaming some stuff
    [ ] fix gigantic state file, break things out
    [ ] make view fns cleaner, spectator friendly
    [ ] write basic tests
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



turn logic:

bucketing logic:
    bucket all players into groups based on distance
    p1, p2 in diff buckets mean p1 and p2 cannot influence each other's view of the world, because they're too far away. thus, we can send LLMs their view of the world at the same time. 
    we're running single threaded, so the turns will happen sequentially no matter what. but llm inference takes a while so having more of this happening async is better.
    the potential problem would be if two players were near one another, and we tried getting llms to choose actions simultaneously. maybe P1 decides to tend a farm, but p2 tries to kill p1. if p1 gets processed first, p2 will have a stale state and the attack action would fail, as p2 may have since moved away. if p2 gets processed first, p1's view is stale; they likely would not have chosen to tend a farm had they known they were under attack from p2. 
    so we can bucket players by checking connected subgraphs where nodes are players and an edge exists between p1 and p2 if there exists a tile in N(p1) and N(p2) where N is some neighborhood given by their max movement/view ranges and a chosen distance funciton (manhattan or rounded euclidean etc)
    this is an optimization and can be impl'd later, so we should start with a trivial grouping where all players are in a single bucket but the code is laid out as if there could be multiple buckets.




updated game logic pseudocode:


advanceTurnIfNeeded(S):
    if(all turn group queues are empty):
        run game tick logic
        re-bucket, re-queue the players
        advance the turn count


canAct(S, playerId, debug=false):       // solve non-reproduceability
    if debug:
        if player *in* any bucket's queue (i.e. still needs to act):
            return true
        otherwise false
    if not debug:
        if player at *front of any bucket's queue*
            return true
        otherwise false

// events known in advance, i.e. from json file
Exec(S, Actions) -> Result:
    for actionWithPlayer in actions:
        action, player <- destructure ...
        advanceTurnIfNeeded(S)
        if not canAct(player):
           return error 
        event = exec(action)
        log_in_state(event)
        if not canAct(player):
            remove player from queue
        otherwise:
            put player at back of queue
    save_game_file(S) 
        

// async fetching events as we go, maybe also running browser or cli visualization 
async Run(S, n_turns=infty) -> Result:
    for n_turns do:
        advanceTurnIfNeeded(S)
        players = [group.queue.pop for group in S.turn_groups]
        tasks = [get_action_for(p) for p in players]
        actions = await tasks.gather()
        exec(actions)
