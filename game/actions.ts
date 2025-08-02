import type { State, GameEvent, Effect } from '../core/types';
import type { Action, ActionDefinition } from '../core/types';
import { ActionType, ResourceType } from '../core/types';
import { getDistance } from '../core/distance';

// Helper functions for creating events
export function createFailedActionEvent(
    s: State, playerId: string, action: Action, error: string
): GameEvent {
    return {
        id: "0",
        turn: s.turn,
        timestamp: Date.now().toString(),
        type: 'PLAYER_ACTION',
        playerId,
        action,
        effects: [],
        success: false,
        error
    };
}

function createSuccessfulActionEvent(
    s: State, playerId: string, action: Action, effects: Effect[]
): GameEvent {
    return {
        id: "0",
        turn: s.turn,
        timestamp: Date.now().toString(),
        type: 'PLAYER_ACTION',
        playerId,
        action,
        effects,
        success: true
    };
}

const moveData: ActionDefinition = {
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

        // Validation
        if (!player || !startPos) {
            return createFailedActionEvent(s, playerId, a, 'invalid player id');
        }

        const moveCost = getDistance(startPos, endPos);
        if (player.resources.movement.current < moveCost) {
            return createFailedActionEvent(s, playerId, a, 
                `insufficient movement points: need ${moveCost}, have ${player.resources.movement.current}`);
        }

        if (s.players.isOccupied(endPos)) {
            return createFailedActionEvent(s, playerId, a, 'target tile is occupied by another player');
        }

        // Success - create effects and return event
        const effects: Effect[] = [
            { type: 'MOVE_PLAYER', playerId, from: startPos, to: endPos },
            { type: 'ALTER_RESOURCE', entityId: playerId, resource: ResourceType.MOVEMENT, field: 'current', delta: -moveCost }
        ];
        
        return createSuccessfulActionEvent(s, playerId, a, effects);
    }
};

export const actionRegistry: Record<ActionType, ActionDefinition> = {
    [ActionType.MOVE]: moveData,
};
