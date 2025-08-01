import { TileType } from '../core/types';
import type { TileData } from '../core/types';

// associates tile variants with their attributes, for rendering and in-game information 
export const tileRegistry = {
    [TileType.GRASSLAND]: {
        char: '.',
        name: 'grassland',
        desc: 'can be foraged for food equal to the tile\'s richness, or turned into a farm',
        show_value: true,
        value_str: 'richness'
    },
    [TileType.FOREST]: {
        char: 'T',
        name: 'forest',
        desc: 'can be harvested for timber equal to the tile\'s richness',
        show_value: true,
        value_str: 'richness'
    },
    [TileType.NULL]: {
        char: ' ',
        name: 'null',
        desc: 'this tile exists off the edge of the earth, and is inaccessable',
        show_value: false,
        value_str: ''
    }
} as Record<TileType, TileData>;


