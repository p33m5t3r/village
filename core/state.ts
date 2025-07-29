import { CONFIG } from '../config';
import type { TileInstance, TileData } from '../world/tiles';
import { TileType, TILE_DATA } from '../world/tiles';
import * as fs from 'node:fs';
import * as path from 'node:path';

export type State = {
    metadata: {
        version: string;
        created: string;
        worldSize: number;
    };
    turn: number,
    tiles: TileInstance[][];
    players: SpatialIndex<Player>;
}

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

// Runtime type - no position field
export type Player = {
    id: string;
    name: string;
    char: string;
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
    };
    s.players.set(example_player.id, example_player, {x: 0, y: 0});
}

export function stateInit(): State {
    let state: State = {
        metadata: {
            version: CONFIG.version,
            worldSize: CONFIG.world_size,
            created: Date.now().toString(),
        },
        turn: 0,
        tiles: new Array(),
        players: new SpatialIndex<Player>(),
    }
    generateTiles(state);
    generatePlayers(state);

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



