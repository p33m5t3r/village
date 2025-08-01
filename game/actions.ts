import type { State } from '../core/types';
import type { Action, ActionDefinition } from '../core/types';
import { ActionType } from '../core/types';


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
};
