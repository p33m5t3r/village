import type { GameConfig } from './core/types';

export const gameConfig: GameConfig = {
    version: '0.0.0',
    save_dir: 'saves',
    world_size: 100,

    // player defaults
    default_action_points: 1.0,
    default_movement_points: 10,
    default_view_distance: 10,

    // distance settings
    distance_function: 'manhattan' as const,

    // turn settings
    max_turn_retries: 2,
};

