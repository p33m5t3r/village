import type { State } from '../core/types';
import type { Action, ActionDefinition } from '../core/types';
import { ActionType, ResourceType } from '../core/types';
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
            const startPos = s.players.getPosition(playerId);
            const endPos = { x: a.params.x, y: a.params.y };
            const moveCost = getDistance(startPos || { x: 0, y: 0 }, endPos);

            // Validation - if any fails, return failed event
            if (!player || !startPos) {
                return {
                    id: "0",
                    turn: s.turn,
                    timestamp: Date.now().toString(),
                    type: 'PLAYER_ACTION',
                    playerId,
                    action: a,
                    effects: [],
                    success: false,
                    error: 'invalid player id'
                };
            }

            if (player.resources.movement.current < moveCost) {
                return {
                    id: "0",
                    turn: s.turn,
                    timestamp: Date.now().toString(),
                    type: 'PLAYER_ACTION',
                    playerId,
                    action: a,
                    effects: [],
                    success: false,
                    error: `insufficient movement points: need ${moveCost}, have ${player.resources.movement.current}`
                };
            }

            if (s.players.isOccupied(endPos)) {
                return {
                    id: "0",
                    turn: s.turn,
                    timestamp: Date.now().toString(),
                    type: 'PLAYER_ACTION',
                    playerId,
                    action: a,
                    effects: [],
                    success: false,
                    error: 'target tile is occupied by another player'
                };
            }

            // Success - return event with effects
            return {
                id: "0",
                turn: s.turn,
                timestamp: Date.now().toString(),
                type: 'PLAYER_ACTION',
                playerId,
                action: a,
                effects: [
                    { type: 'MOVE_PLAYER', playerId, from: startPos, to: endPos },
                    { type: 'ALTER_RESOURCE', entityId: playerId, resource: ResourceType.MOVEMENT, field: 'current', delta: -moveCost }
                ],
                success: true
            };
        }
    }
};
