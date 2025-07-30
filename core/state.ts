import { CONFIG } from '../config';
import type { TileInstance, TileData } from '../world/tiles';
import { TileType, TILE_DATA } from '../world/tiles';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ====== distance =====

// todo



// ====== state =======
type TurnGroup = { queue: string[]; };  // player ids
export type State = {
    metadata: {
        version: string;
        created: string;
        worldSize: number;
    };
    turn: number,
    turnGroups: TurnGroup[]

    tiles: TileInstance[][];
    players: SpatialIndex<Player>;
};

export type Position = {
    x: number;
    y: number;
};

class SpatialIndex<T> {
    private entities: Map<string, T> = new Map();
    private positions: Map<string, Position> = new Map();
    private positionToId: Map<string, string> = new Map();
    
    private posKey(pos: Position): string {
        return `${pos.x},${pos.y}`;
    }
    
    // Add or update an entity
    set(id: string, entity: T, pos: Position): void {
        // Remove from old position if exists
        const oldPos = this.positions.get(id);
        if (oldPos) {
            this.positionToId.delete(this.posKey(oldPos));
        }
        
        // Add to new position
        this.entities.set(id, entity);
        this.positions.set(id, pos);
        this.positionToId.set(this.posKey(pos), id);
    }
    
    // Move an entity (more efficient than set when entity unchanged)
    move(id: string, newPos: Position): boolean {
        const entity = this.entities.get(id);
        const oldPos = this.positions.get(id);
        
        if (!entity || !oldPos) return false;
        
        // Check if position is occupied
        if (this.positionToId.has(this.posKey(newPos))) {
            return false; // Position occupied
        }
        
        // Update position
        this.positionToId.delete(this.posKey(oldPos));
        this.positions.set(id, newPos);
        this.positionToId.set(this.posKey(newPos), id);
        
        return true;
    }
    
    // Get entity at position
    getAt(pos: Position): T | undefined {
        const id = this.positionToId.get(this.posKey(pos));
        return id ? this.entities.get(id) : undefined;
    }
    
    // Get entity by ID
    get(id: string): T | undefined {
        return this.entities.get(id);
    }
    
    // Get position of entity
    getPosition(id: string): Position | undefined {
        return this.positions.get(id);
    }
    
    // Remove entity
    remove(id: string): boolean {
        const pos = this.positions.get(id);
        if (!pos) return false;
        
        this.entities.delete(id);
        this.positions.delete(id);
        this.positionToId.delete(this.posKey(pos));
        
        return true;
    }
    
    // Check if position is occupied
    isOccupied(pos: Position): boolean {
        return this.positionToId.has(this.posKey(pos));
    }
    
    // Get all entities (for iteration)
    *entries(): IterableIterator<[string, T, Position]> {
        for (const [id, entity] of this.entities) {
            const pos = this.positions.get(id)!;
            yield [id, entity, pos];
        }
    }
    
    // Helper for serialization - get all entries as array
    getAllEntries(): Array<{id: string, entity: T, position: Position}> {
        const result = [];
        for (const [id, entity, position] of this.entries()) {
            result.push({id, entity, position});
        }
        return result;
    }
}


type Stat = { current: number; max: number; };

export type Player = {
    id: string;
    name: string;
    char: string;
    viewDistance: number;
    actionPoints: Stat;
    movementPoints: Stat;
    // later: skills: { farming: Stat; ...
}

// Serialization-only type
type SerializedPlayer = Player & {
    position: Position;
}

function toArrayIndex(worldPos: Position, worldSize: number): Position | null {
    // convert from [0,0] = center to array indices where [0][0] = topleft
    const halfSize = Math.floor(worldSize / 2);
    const row = halfSize - worldPos.y;  // Y increases up in world, row increases down
    const col = worldPos.x + halfSize;   // X offset by half to center
    
    // bounds check
    if (row < 0 || row >= worldSize || col < 0 || col >= worldSize) {
        return null;
    }
    
    return { x: col, y: row };
}

function setTileAt(s: State, p: Position, t: TileInstance): boolean {
    const arrayPos = toArrayIndex(p, s.metadata.worldSize);
    if (!arrayPos) {
        return false;
    }
    
    // tiles is row-major: tiles[row][col]
    s.tiles[arrayPos.y][arrayPos.x] = t;
    return true;
}

function getTileAt(s: State, p: Position): TileInstance | undefined {
    const arrayPos = toArrayIndex(p, s.metadata.worldSize);
    if (!arrayPos) {
        return undefined;
    }
    return s.tiles[arrayPos.y][arrayPos.x];
}

function generateTiles(s: State): void {
    const worldSize = s.metadata.worldSize;
    const default_fill: TileInstance = {
        type: TileType.GRASSLAND,
        value: 1
    };
    const tiles = Array(worldSize).fill(null).map(() => 
        Array(worldSize).fill(default_fill)
    );
    s.tiles = tiles;

    const ex_tree: TileInstance = {
        type: TileType.FOREST,
        value: 1
    }
    setTileAt(s, {x: 2, y: 2}, ex_tree);
}


function generatePlayers(s: State): void {
    const example_player: Player = {
        id: 'player-0',
        name: 'player 0',
        char: '@',
        viewDistance: CONFIG.default_view_distance,
        actionPoints: {
            current: CONFIG.default_action_points,
            max: CONFIG.default_action_points,
        },
        movementPoints: {
            current: CONFIG.default_movement_points,
            max: CONFIG.default_movement_points,
        },
    };
    s.players.set(example_player.id, example_player, {x: 0, y: 0});
}

function assignTurnGroups(s: State): void {
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
    s.turnGroups = [{ queue: allPlayerIds }];
}

export function stateInit(): State {
    let state: State = {
        metadata: {
            version: CONFIG.version,
            worldSize: CONFIG.world_size,
            created: Date.now().toString(),
        },
        turn: 0,
        turnGroups: new Array(),
        tiles: new Array(),
        players: new SpatialIndex<Player>(),
    }
    generateTiles(state);
    generatePlayers(state);
    assignTurnGroups(state);

    return state;
}

export function stateSaveAs(s: State, save_name: string): boolean {
    try {
        // ensure save directory exists
        if (!fs.existsSync(CONFIG.save_dir)) {
            fs.mkdirSync(CONFIG.save_dir, { recursive: true });
        }
        
        // Extract players from SpatialIndex with their positions
        const serializedPlayers: SerializedPlayer[] = s.players.getAllEntries().map(entry => ({
            ...entry.entity,
            position: entry.position
        }));

        // Create serializable version of state
        const serializable = {
            ...s,
            players: serializedPlayers  // replace SpatialIndex with array
        };
        
        const savePath = path.join(CONFIG.save_dir, `${save_name}.json`);
        const json = JSON.stringify(serializable, null, 2);
        fs.writeFileSync(savePath, json);
        return true;
    } catch (e) {
        console.error(`Failed to save state: ${e}`);
        return false;
    }
}

export function stateLoadFrom(save_name: string): State {
    // todo: do some version checks probably
    try {
        const savePath = path.join(CONFIG.save_dir, `${save_name}.json`);
        const json = fs.readFileSync(savePath, 'utf-8');
        const data = JSON.parse(json);
        
        // Rebuild SpatialIndex from serialized data
        const players = new SpatialIndex<Player>();
        for (const serializedPlayer of data.players) {
            const { position, ...player } = serializedPlayer;  // destructure to separate position
            players.set(player.id, player, position);
        }

        return {
            ...data,
            players: players  // replace array with rebuilt SpatialIndex
        };
    } catch (e) {
        console.error(`Failed to load state: ${e}`);
        throw e;
    }
}

// the view type is what players will have access to when choosing actions
// since the average 'player' is assumed to be an LLM, this is what the tools/context will be built from
export type View = {
    playerInfo: {
        playerId: string;
    }
    map: string;
}

function renderTileAscii(t: TileInstance): string {
    return TILE_DATA[t.type].char;
}

function getMapCharAt(s: State, p: Position): string {
    let cellChar = ' ';
    
    // Start with tile
    const maybeTile = getTileAt(s, p);
    if (maybeTile) {
        cellChar = renderTileAscii(maybeTile);
    }
    
    // todo: overwrite w/ structure if exists
    
    // Overwrite with player if exists (highest priority)
    const maybePlayer = s.players.getAt(p);
    if (maybePlayer) {
        cellChar = maybePlayer.char;
    }
    
    return cellChar;
}

function renderMapText(s: State, playerId: string): string {
    const center: Position = {x: 0, y: 0};          // todo; center = player location
    const viewDistance: number = 10;                // todo; viewDistance = player view distance
    
    let mapText = '';
    // y increases up in world coords, but we render top to bottom
    for (let dy = viewDistance; dy >= -viewDistance; dy--) {
        for (let dx = -viewDistance; dx <= viewDistance; dx++) {
            const worldPos: Position = {
                x: center.x + dx,
                y: center.y + dy
            };
            mapText += getMapCharAt(s, worldPos);
        }
        if (dy > -viewDistance) mapText += '\n';
    }
    return mapText;
}

function generateView(s: State, playerId: string): View {
    return {
        playerInfo: {
            playerId: playerId,
        },
        map: renderMapText(s, playerId),
    }
}

// human-readable version of the view for cli output
function renderViewText(v: View): string {
    let output = '';
    output += `Player: ${v.playerInfo.playerId}\n`;
    output += `\n`;
    output += v.map;
    return output;
}

export function viewStateFromSaveAs(save_name: string, playerId: string | undefined): string {
    const state = stateLoadFrom(save_name);
    const effectivePlayerId = playerId || 'spectator';
    const view = generateView(state, effectivePlayerId);
    return renderViewText(view);
}

// ACTIONS

const ActionType = {
    MOVE: 'move',
} as const;
type ActionType = typeof ActionType[keyof typeof ActionType];

type Action = {
    type: ActionType;
    params: Record<string, any>;
};

type PlayerAction = Action & { playerId: string; };

type ParamSchema = {
    name: string;
    desc: string;
    type: 'string' | 'number' | 'boolean';
    required: boolean;
};

type ActionEvent = {        
    action: Action;         // action taken
    playerId: string;       // who took the action
    startPos: Position;     // world location where the action started
    endPos?: Position;      // world location where the action ended (for movement)
    summary: string;        // summary of the effects or reason for error
};

type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
type ActionResult = Result<ActionEvent, string>;

type ActionData = {
    genericDesc: string;
    paramSchemas: ParamSchema[];

    // what to expect from exec'ing an action with given params for a player at state `s`
    anticipatedEffects: (s: State, playerId: string, a: Action) => string;

    // validate action and, if successful, actually change the game state 
    execute: (s: State, playerId: string, a: Action) => ActionResult;
};

const ACTION_DATA: Record<ActionType, ActionData> = {
    [ActionType.MOVE]: {
        genericDesc: 'move to an (unoccupied) tile in absolute world coordinates, consuming movement points',
        paramSchemas: [
            { name: 'x', desc: 'target x coordinate', type: 'number', required: true },
            { name: 'y', desc: 'target y coordinate', type: 'number', required: true }
        ],
        anticipatedEffects: (s: State, playerId: string, a: Action) => {
            const currentPos = s.players.getPosition(playerId);
            if (!currentPos) return 'crash game; invalid player id' // todo make this nicer
            const distance = Math.abs(a.params.x - currentPos.x) + Math.abs(a.params.y - currentPos.y);
            return `Move from (${currentPos.x},${currentPos.y}) to (${a.params.x},${a.params.y}) - distance: ${distance}`;
        },
        execute: (s: State, playerId: string, a: Action) => {
            const startPos = s.players.getPosition(playerId)!;
            const endPos = { x: a.params.x, y: a.params.y };
            
            // validate
            // TODO: check movement points when implemented
            if (s.players.isOccupied(endPos)) return {
                ok: false,
                error: 'target tile is occupied by another player'
            };

            // execute
            const move_ok = s.players.move(playerId, endPos);
            if (!move_ok) return {
                ok: false,
                error: 'failed to move player (likely invalid playerId)'
            }
            // TODO: consume movement points when implemented
            return {
                ok: true,
                value: {
                    action: a,
                    playerId: playerId,
                    startPos: startPos,
                    endPos: endPos,
                    summary: `${playerId} moved to (${endPos.x},${endPos.y})`
                }
            };
        }
    }
}


// turn logic
function turnQueuesAreEmpty(s: State): boolean {
    for (const group of s.turnGroups) {
        if (group.queue.length > 0) return false;
    }
    return true;
}

function removePlayerFromQueue(s: State, playerId: string): number {
    for (let i = 0; i < s.turnGroups.length; i++) {
        const group = s.turnGroups[i];
        const index = group.queue.indexOf(playerId);
        if (index !== -1) {
            group.queue.splice(index, 1);
            return i; // return which group they were in
        }
    }
    return -1; // player not found in any queue
}

function movePlayerToBackOfQueue(s: State, playerId: string): void {
    const groupIndex = removePlayerFromQueue(s, playerId);
    if (groupIndex !== -1) {
        s.turnGroups[groupIndex].queue.push(playerId);
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
    for (const group of s.turnGroups) {
        if (group.queue.includes(playerId)) return true;
    }
    return false;
}

function playerIsAtFrontOfAnyQueue(s: State, playerId: string): boolean {
    for (const group of s.turnGroups) {
        if (group.queue.length > 0 && group.queue[0] === playerId) return true;
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
    
    const result = ACTION_DATA[action.type].execute(s, playerId, action);
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
    if (cfg.save_name) stateSaveAs(s, cfg.save_name);
}


function jsonIsPlayerAction(json_data: any): boolean {
    if (!json_data || typeof json_data !== 'object') return false;
    if (!json_data.type || !Object.values(ActionType).includes(json_data.type)) return false;
    if (!json_data.params || typeof json_data.params !== 'object') return false;
    return typeof json_data.playerId === 'string' && json_data.playerId.length > 0;
}

function validateActionParamsAgainstSchema(a: PlayerAction): boolean {
    const params = a.params;
    const actionData = ACTION_DATA[a.type];
    const schemas = actionData.paramSchemas;
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
        const state = stateLoadFrom(save_name);
        const playerActions = parseActionsFromText(json_string);
        console.log(`parsed ${playerActions.length} actions. executing...`);
        
        executePlayerActions(state, playerActions, cfg);
    } catch (e) {
        console.error(`Error executing actions:\n${e}`);
        process.exit(1);
    }
}



