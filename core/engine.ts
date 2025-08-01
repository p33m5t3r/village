import type { State } from "./types";
import { loadState, saveState } from "./state";
import { ActionType, type ActionResult, type PlayerAction } from "./types";
import { actionRegistry } from "../game/actions";


export function assignTurnGroups(s: State): void {
    // Collect all player IDs
    const allPlayerIds = [];
    for (const [id, , ] of s.players.entries()) {
        allPlayerIds.push(id);
    }
    
    // Shuffle for random turn order
    for (let i = allPlayerIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
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
    
    const can_move = player.movementPoints.current > 0;
    const can_act = player.actionPoints.current > 0;
    
    return can_move || can_act;
}

function executePlayerAction(s: State, playerAction: PlayerAction, strictOrdering=true): ActionResult {
    const { playerId, ...action } = playerAction;

    if (!isPlayersTurn(s, playerId, strictOrdering)) {
        return { ok: false, error: `player ${playerId} acted out of turn!` }
    }
    
    const result = actionRegistry[action.type].execute(s, playerId, action);
    if (result.ok) {
        if (!canDoMoreThisTurn(s, playerId)) {
            removePlayerFromQueue(s, playerId); 
        } else {
            movePlayerToBackOfQueue(s, playerId);
        }
    } else {
        // todo: allow retries?
        removePlayerFromQueue(s, playerId);
    }
    return result;
}

export type ExecutionConfig = {
    atomic: boolean;                    // throw on failed actions
    strictOrdering: boolean;            // can players act 'out of turn?'
    save_name?: string;                 // if included, the save to serialize state to
}

function executePlayerActions(s: State, playerActions: PlayerAction[], cfg: ExecutionConfig): void {
    for (const playerAction of playerActions) {
        advanceTurnIfNecessary(s);
        const result = executePlayerAction(s, playerAction, cfg.strictOrdering);
        if (!result.ok && cfg.atomic) throw new Error(result.error);
        console.log(result);
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


