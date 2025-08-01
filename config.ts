
export const gameConfig = {
    version: '0.0.0',
    save_dir: 'saves',
    world_size: 100,

    // player defaults
    default_action_points: 1.0,
    default_movement_points: 10,
    default_view_distance: 10,

    // distance settings
    distance_function: 'manhattan' as const,    // or 'euclidean'

    // turn settings
    max_turn_retries: 2,

} as const;


