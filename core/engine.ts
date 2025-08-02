import type { State, Effect, GameEvent, Action } from "./types";
import { loadState, saveState } from "./state";
import { ActionType, type PlayerAction } from "./types";
import { actionRegistry, createFailedActionEvent } from "../game/actions";


// Simple seeded RNG for deterministic testing
function seededRandom(seed: number) {
    let state = seed;
    return function() {
        // Linear congruential generator
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

export function assignTurnGroups(s: State): void {
    // Collect all player IDs
    const allPlayerIds = [];
    for (const [id, , ] of s.players.entries()) {
        allPlayerIds.push(id);
    }
    
    // Shuffle for random turn order using seeded RNG
    const rng = seededRandom(s.seed);
    for (let i = allPlayerIds.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [allPlayerIds[i], allPlayerIds[j]] = [allPlayerIds[j], allPlayerIds[i]];
    }
    
    // Put all into one group
    // TODO: subgraph bucketing algorithm
    s.turnQueues = [allPlayerIds];
}


// turn logic
function turnQueuesAreEmpty(s: State): boolean {
    for (const queue of s.turnQueues) {
        if (queue.length > 0) return false;
    }
    return true;
}

function removePlayerFromQueue(s: State, playerId: string): number {
    for (let i = 0; i < s.turnQueues.length; i++) {
        const queue = s.turnQueues[i];
        const index = queue.indexOf(playerId);
        if (index !== -1) {
            queue.splice(index, 1);
            return i; // return which queue they were in
        }
    }
    return -1; // player not found in any queue
}

function movePlayerToBackOfQueue(s: State, playerId: string): void {
    const queueIndex = removePlayerFromQueue(s, playerId);
    if (queueIndex !== -1) {
        s.turnQueues[queueIndex].push(playerId);
    }
}

function runGameTick(s: State): void {
    // update structures, tiles, research, etc
    // nothing here yet! (dont fill me in unuless i ask)
}

function advanceTurnIfNecessary(s: State): void {
    if (!turnQueuesAreEmpty(s)) return;

    s.turn++;
    runGameTick(s);
    assignTurnGroups(s);
}

function playerIsInAnyQueue(s: State, playerId: string): boolean {
    for (const queue of s.turnQueues) {
        if (queue.includes(playerId)) return true;
    }
    return false;
}

function playerIsAtFrontOfAnyQueue(s: State, playerId: string): boolean {
    for (const queue of s.turnQueues) {
        if (queue.length > 0 && queue[0] === playerId) return true;
    }
    return false;
}

function isPlayersTurn(s: State, playerId: string, strictOrdering=true): boolean {
    if (!strictOrdering) return playerIsInAnyQueue(s, playerId);
    return playerIsAtFrontOfAnyQueue(s, playerId);
}

function canDoMoreThisTurn(s: State, playerId: string): boolean {
    const player = s.players.get(playerId);
    if (!player) return false;
    
    const can_move = player.resources.movement.current > 0;
    const can_act = player.resources.action.current > 0;
    
    return can_move || can_act;
}

// System event helpers
function createSystemEvent(s: State, operation: string, effects: Effect[]): GameEvent {
    return {
        id: "0",
        turn: s.turn,
        timestamp: Date.now().toString(),
        type: 'SYSTEM',
        operation: operation as any, // TypeScript will validate the actual usage
        effects,
        success: true
    };
}

function createRemoveFromQueueEvent(s: State, playerId: string): GameEvent {
    const queueIndex = findPlayerQueueIndex(s, playerId);
    return createSystemEvent(s, 'REMOVE_FROM_QUEUE', [
        { type: 'UPDATE_QUEUE', queueIndex: queueIndex >= 0 ? queueIndex : 0, operation: 'remove', playerId }
    ]);
}

function createMoveToBackOfQueueEvent(s: State, playerId: string): GameEvent {
    const queueIndex = findPlayerQueueIndex(s, playerId);
    return createSystemEvent(s, 'MOVE_TO_BACK_OF_QUEUE', [
        { type: 'UPDATE_QUEUE', queueIndex: queueIndex >= 0 ? queueIndex : 0, operation: 'remove', playerId },
        { type: 'UPDATE_QUEUE', queueIndex: queueIndex >= 0 ? queueIndex : 0, operation: 'append', playerId }
    ]);
}

// Helper function to find which queue a player is in
function findPlayerQueueIndex(s: State, playerId: string): number {
    for (let i = 0; i < s.turnQueues.length; i++) {
        if (s.turnQueues[i].includes(playerId)) {
            return i;
        }
    }
    return -1;
}

function applyEffects(s: State, effects: Effect[]): void {
    for (const effect of effects) {
        switch (effect.type) {
            case 'MOVE_PLAYER':
                s.players.move(effect.playerId, effect.to);
                break;
                
            case 'ALTER_RESOURCE':
                const player = s.players.get(effect.entityId);
                if (player) {
                    player.resources[effect.resource][effect.field] += effect.delta;
                }
                break;
                
            case 'UPDATE_QUEUE':
                if (effect.operation === 'remove') {
                    removePlayerFromQueue(s, effect.playerId);
                } else if (effect.operation === 'append') {
                    // Find the queue index and append
                    if (effect.queueIndex < s.turnQueues.length) {
                        s.turnQueues[effect.queueIndex].push(effect.playerId);
                    }
                }
                break;
                
            case 'SET_TURN':
                s.turn = effect.turn;
                break;
        }
    }
}

function executePlayerAction(s: State, playerAction: PlayerAction, strictOrdering=true): GameEvent[] {
    const { playerId, ...action } = playerAction;

    // Check turn order first
    if (!isPlayersTurn(s, playerId, strictOrdering)) {
        return [createFailedActionEvent(s, playerId, action, `player ${playerId} acted out of turn!`)];
    }
    
    // Get the action event (no mutations yet)
    const actionEvent = actionRegistry[action.type].execute(s, playerId, action);
    const events: GameEvent[] = [actionEvent];
    
    // Add queue management events
    if (actionEvent.success && !canDoMoreThisTurn(s, playerId)) {
        events.push(createRemoveFromQueueEvent(s, playerId));
    } else if (actionEvent.success) {
        events.push(createMoveToBackOfQueueEvent(s, playerId));
    } else {
        // Failed action - remove from queue
        events.push(createRemoveFromQueueEvent(s, playerId));
    }
    
    return events;
}

export type ExecutionConfig = {
    atomic: boolean;                    // throw on failed actions
    strictOrdering: boolean;            // can players act 'out of turn?'
    save_name?: string;                 // if included, the save to serialize state to
}

function executePlayerActions(s: State, playerActions: PlayerAction[], cfg: ExecutionConfig): void {
    for (const playerAction of playerActions) {
        advanceTurnIfNecessary(s);
        const events = executePlayerAction(s, playerAction, cfg.strictOrdering);
        
        // Apply each event: log first, then apply effects
        for (const event of events) {
            s.eventLog.push(event);
            applyEffects(s, event.effects);
            
            // For atomic mode, throw on failed actions
            if (!event.success && cfg.atomic && event.type === 'PLAYER_ACTION') {
                throw new Error(event.error || 'Action failed');
            }
            
            console.log(event);
        }
    }
    if (cfg.save_name) saveState(s, cfg.save_name);
}


function jsonIsPlayerAction(json_data: any): boolean {
    if (!json_data || typeof json_data !== 'object') return false;
    if (!json_data.type || !Object.values(ActionType).includes(json_data.type)) return false;
    if (!json_data.params || typeof json_data.params !== 'object') return false;
    return typeof json_data.playerId === 'string' && json_data.playerId.length > 0;
}

function validateActionParamsAgainstSchema(a: PlayerAction): boolean {
    const params = a.params;
    const actionDef = actionRegistry[a.type];
    const schemas = actionDef.paramSchemas;
    for (const schema of schemas) {
        const value = params[schema.name];
        if (schema.required && value === undefined) return false;
        if (value === undefined) return true;   // not required, not given
        if (schema.type === 'number' && typeof value !== 'number') return false;
        if (schema.type === 'string' && typeof value !== 'string') return false;
        if (schema.type === 'boolean' && typeof value !== 'boolean') return false;
    }
    return true;
}

// also validates that the actions are correctly typed for further validation
function parseActionsFromText(json_string: string): PlayerAction[] {
    const data = JSON.parse(json_string);
    if (!Array.isArray(data)) {
        throw new Error('actions must be an array!');
    }
    for (const item of data) {
        if (!jsonIsPlayerAction(item)) {
            throw new Error(`json does not parse to PlayerAction:\n${JSON.stringify(item)}`);
        }
        if (!validateActionParamsAgainstSchema(item)) {
            throw new Error(`action failed schema validation:\n${JSON.stringify(item)}`);
        }
    }
    return data as PlayerAction[];
}


export function execActionAsJson(save_name: string, json_string: string, cfg: ExecutionConfig): void {
    try {
        const state = loadState(save_name);
        const playerActions = parseActionsFromText(json_string);
        console.log(`parsed ${playerActions.length} actions. executing...`);
        
        executePlayerActions(state, playerActions, cfg);
    } catch (e) {
        console.error(`Error executing actions:\n${e}`);
        process.exit(1);
    }
}


