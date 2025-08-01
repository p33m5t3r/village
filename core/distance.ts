import type { Position } from './types';
import { gameConfig } from '../config';

export const distanceFunctions = {
    manhattan: (a: Position, b: Position): number => {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    },
    
    euclidean: (a: Position, b: Position): number => {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
} as const;

export function getDistance(a: Position, b: Position): number {
    const fn = distanceFunctions[gameConfig.distance_function];
    return fn(a, b);
}

export function isWithinRange(a: Position, b: Position, range: number): boolean {
    return getDistance(a, b) <= range;
}