import { tileRegistry } from '../game/tiles';
import { getTileAt, loadState } from './state';
import type { State, TileInstance, Position, PlayerView, Player } from './types';
import { isWithinRange } from './distance';
import { gameConfig } from '../config';


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

function renderMapArray(s: State, center: Position, viewDistance: number): string[][] {
    const size = viewDistance * 2 + 1;
    const map: string[][] = Array(size).fill(null).map(() => Array(size).fill(' '));
    
    // y increases up in world coords, but we render top to bottom
    for (let dy = viewDistance; dy >= -viewDistance; dy--) {
        for (let dx = -viewDistance; dx <= viewDistance; dx++) {
            const worldPos: Position = {
                x: center.x + dx,
                y: center.y + dy
            };
            
            // Only render if within view distance
            if (isWithinRange(center, worldPos, viewDistance)) {
                const row = viewDistance - dy;
                const col = dx + viewDistance;
                map[row][col] = getMapCharAt(s, worldPos);
            }
        }
    }
    
    return map;
}

function generatePlayerView(s: State, playerId: string): PlayerView {
    const player = s.players.get(playerId);
    const position = s.players.getPosition(playerId);
    
    if (!player || !position) {
        throw new Error(`Invalid player ID: ${playerId}`);
    }
    
    const playerWithPos: Player & Position = {
        ...player,
        ...position
    };
    
    return {
        gameTurn: s.turn,
        player: playerWithPos,
        map: renderMapArray(s, position, player.viewDistance)
    };
}

// human-readable version of the view for cli output
function renderViewText(v: PlayerView): string {
    let output = '';
    output += `Turn: ${v.gameTurn}\n`;
    output += `Player: ${v.player.name} (${v.player.id})\n`;
    output += `Position: (${v.player.x}, ${v.player.y})\n`;
    output += `Movement Points: ${v.player.movementPoints.current}/${v.player.movementPoints.max}\n`;
    output += `Action Points: ${v.player.actionPoints.current}/${v.player.actionPoints.max}\n`;
    output += `\n`;
    
    // Render the 2D array as ASCII art
    for (const row of v.map) {
        output += row.join('') + '\n';
    }
    
    return output.trimEnd(); // Remove trailing newline
}

export function renderView(save_name: string, playerId: string | undefined): string {
    const state = loadState(save_name);
    
    if (!playerId || playerId === 'spectator') {
        // Spectator mode: show all player views
        let output = `=== SPECTATOR VIEW ===\n`;
        output += `Turn: ${state.turn}\n\n`;
        
        for (const [id, player, pos] of state.players.entries()) {
            output += `${'='.repeat(50)}\n`;
            const view = generatePlayerView(state, id);
            output += renderViewText(view);
            output += '\n\n';
        }
        
        return output.trimEnd();
    } else {
        // Single player view
        const view = generatePlayerView(state, playerId);
        return renderViewText(view);
    }
}

