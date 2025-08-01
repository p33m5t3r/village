import * as fs from 'node:fs';
import * as path from 'node:path';
import { gameConfig } from '../config';
import type { State, Position, TileInstance, Player, SerializedPlayer } from './types';
import { SpatialIndex } from './types';
import { assignTurnGroups } from './engine';
import { generateTiles, generatePlayers } from '../game/setup';

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

export function setTileAt(s: State, p: Position, t: TileInstance): boolean {
    const arrayPos = toArrayIndex(p, s.metadata.worldSize);
    if (!arrayPos) {
        return false;
    }
    
    // tiles is row-major: tiles[row][col]
    s.tiles[arrayPos.y][arrayPos.x] = t;
    return true;
}

export function getTileAt(s: State, p: Position): TileInstance | undefined {
    const arrayPos = toArrayIndex(p, s.metadata.worldSize);
    if (!arrayPos) {
        return undefined;
    }
    return s.tiles[arrayPos.y][arrayPos.x];
}

export function initState(): State {
    let state: State = {
        metadata: {
            version: gameConfig.version,
            worldSize: gameConfig.world_size,
            created: Date.now().toString(),
        },
        turn: 0,
        turnQueues: new Array(),
        tiles: new Array(),
        players: new SpatialIndex<Player>(),
    }
    generateTiles(state);
    generatePlayers(state);
    assignTurnGroups(state);

    return state;
}

export function saveState(s: State, save_name: string): boolean {
    try {
        // ensure save directory exists
        if (!fs.existsSync(gameConfig.save_dir)) {
            fs.mkdirSync(gameConfig.save_dir, { recursive: true });
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
        
        const savePath = path.join(gameConfig.save_dir, `${save_name}.json`);
        const json = JSON.stringify(serializable, null, 2);
        fs.writeFileSync(savePath, json);
        return true;
    } catch (e) {
        console.error(`Failed to save state: ${e}`);
        return false;
    }
}

export function loadState(save_name: string): State {
    // todo: do some version checks probably
    try {
        const savePath = path.join(gameConfig.save_dir, `${save_name}.json`);
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

