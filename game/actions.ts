import type { State } from '../core/types';
import type { Action, ActionDefinition } from '../core/types';
import { ActionType } from '../core/types';
import { getDistance } from '../core/distance';


export const actionRegistry: Record<ActionType, ActionDefinition> = {
    [ActionType.MOVE]: {
        genericDesc: 'move to an (unoccupied) tile in absolute world coordinates, consuming movement points',
        paramSchemas: [
            { name: 'x', desc: 'target x coordinate', type: 'number', required: true },
            { name: 'y', desc: 'target y coordinate', type: 'number', required: true }
        ],
        anticipatedEffects: (s: State, playerId: string, a: Action) => {
            const currentPos = s.players.getPosition(playerId);
            if (!currentPos) return 'crash game; invalid player id' // todo make this nicer
            const distance = getDistance(currentPos, { x: a.params.x, y: a.params.y });
            return `Move from (${currentPos.x},${currentPos.y}) to (${a.params.x},${a.params.y}) - distance: ${distance}`;
        },
        execute: (s: State, playerId: string, a: Action) => {
            const player = s.players.get(playerId);
            if (!player) return {
                ok: false,
                error: 'invalid player id'
            };

            const startPos = s.players.getPosition(playerId)!;
            const endPos = { x: a.params.x, y: a.params.y };
            const moveCost = getDistance(startPos, endPos);
            
            // validate movement points
            if (player.resources.movement.current < moveCost) return {
                ok: false,
                error: `insufficient movement points: need ${moveCost}, have ${player.resources.movement.current}`
            };

            // validate target tile
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
            
            // consume movement points
            player.resources.movement.current -= moveCost;
            
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
};
