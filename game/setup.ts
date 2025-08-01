import { TileType, type State, type TileInstance, type Player } from '../core/types';
import { gameConfig } from '../config';
import { setTileAt } from '../core/state';

export function generateTiles(s: State): void {
    const worldSize = s.worldSize;
    const default_fill: TileInstance = {
        type: TileType.GRASSLAND,
        value: 1
    };
    const tiles = Array(worldSize).fill(null).map(() => 
        Array(worldSize).fill(default_fill)
    );
    s.tiles = tiles;

    const ex_tree: TileInstance = {
        type: TileType.FOREST,
        value: 1
    }
    setTileAt(s, {x: 2, y: 2}, ex_tree);
}

export function defaultPlayer(config = gameConfig): Player {
    return {
        id: 'new-player',
        name: 'new-player',
        char: '@',
        viewDistance: config.default_view_distance,
        actionPoints: {
            current: config.default_action_points,
            max: config.default_action_points,
        },
        movementPoints: {
            current: config.default_movement_points,
            max: config.default_movement_points,
        },
    }
}


export function generatePlayers(s: State): void {
    let example_player = defaultPlayer(s.config);
    example_player.id = 'player-0';
    example_player.name = 'player 0'
    s.players.set(
        example_player.id, example_player, {x: 0, y: 0}
    );
}

