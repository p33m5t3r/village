import { tileRegistry } from '../game/tiles';
import { getTileAt, loadState } from './state';
import type { State, TileInstance, Position, PlayerView } from './types';


function renderTileAscii(t: TileInstance): string {
    return tileRegistry[t.type].char;
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

function generateView(s: State, playerId: string): PlayerView {
    return {
        playerInfo: {
            playerId: playerId,
        },
        map: renderMapText(s, playerId),
    }
}

// human-readable version of the view for cli output
function renderViewText(v: PlayerView): string {
    let output = '';
    output += `Player: ${v.playerInfo.playerId}\n`;
    output += `\n`;
    output += v.map;
    return output;
}

export function loadPlayerView(save_name: string, playerId: string | undefined): string {
    const state = loadState(save_name);
    const effectivePlayerId = playerId || 'spectator';
    const view = generateView(state, effectivePlayerId);
    return renderViewText(view);
}

