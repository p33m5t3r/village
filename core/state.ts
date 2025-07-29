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
}

export type Position = {
    x: number;
    y: number;
};

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

export function stateInit(): State {
    let state: State = {
        metadata: {
            version: CONFIG.version,
            worldSize: CONFIG.world_size,
            created: Date.now().toString(),
        },
        turn: 0,
        tiles: new Array(),
    }
    generateTiles(state);

    return state;
}

export function stateSaveAs(s: State, save_name: string): boolean {
    try {
        // ensure save directory exists
        if (!fs.existsSync(CONFIG.save_dir)) {
            fs.mkdirSync(CONFIG.save_dir, { recursive: true });
        }
        
        const savePath = path.join(CONFIG.save_dir, `${save_name}.json`);
        const json = JSON.stringify(s, null, 2);
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
        return JSON.parse(json) as State;
    } catch (e) {
        console.error(`Failed to load state: ${e}`);
        throw e;
    }
}


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
    // todo: overwrite w/ structure if exists
    // todo: overwrite with player if it exists
    let cellChar = ' ';
    const maybeTile = getTileAt(s, p);
    if (maybeTile) {
        cellChar = renderTileAscii(maybeTile);
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



