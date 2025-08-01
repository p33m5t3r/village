import { TileType, type State, type TileInstance, type Player } from '../core/types';
import { gameConfig } from '../config';
import { setTileAt } from '../core/state';

export function generateTiles(s: State): void {
    const worldSize = s.metadata.worldSize;
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


export function generatePlayers(s: State): void {
    const example_player: Player = {
        id: 'player-0',
        name: 'player 0',
        char: '@',
        viewDistance: gameConfig.default_view_distance,
        actionPoints: {
            current: gameConfig.default_action_points,
            max: gameConfig.default_action_points,
        },
        movementPoints: {
            current: gameConfig.default_movement_points,
            max: gameConfig.default_movement_points,
        },
    };
    s.players.set(example_player.id, example_player, {x: 0, y: 0});
}

