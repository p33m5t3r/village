
import type { State } from './state';


export const ActionType = {
    MOVE: 'move',
} as const;

type ActionType = typeof ActionType[keyof typeof ActionType];

type ActionParam = {
    name: string;
    type: 'string' | 'boolean' | 'number';
    desc: string;
    required: boolean;
    enum?: string[];
};

type ActionData = {
    genericDesc: string;
    params?: ActionParam[];

    validate: (state: State, playerId: string) => boolean;

};

type ActionInstance = {
    type: ActionType;
    params: Record<string, any>;
}

const ACTION_DATA = {
    [ActionType.MOVE]: {
        genericDesc: 'move to a tile (absolute world coordinates)',
        params: [{
            name: 'x',
            type: 'number',
            desc: 'x coordinate',
            required: true
        }, {
            name: 'y',
            type: 'number',
            desc: 'y coordinate',
            required: false
        }],
    }
} as const;

