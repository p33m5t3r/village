
// tile variants
export enum TileType {
    GRASSLAND = 0,
    DESERT = 1,
    MOUNTAIN = 2,
    WATER = 3,
    FOREST = 4,
    ORE = 5,
    NULL = 6
}

// tile attributes which are common across all instances
export type TileData = {
    char: string;
    name: string;
    desc: string;
    show_value: boolean;     // is the associated 'value' meaningful for this type?
    value_str: string;       // if so, what does it mean? (e.g. speed, richness, etc)
}

// associates tile variants with their attributes, for rendering and in-game information 
export const TILE_DATA = {
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

// uniquely identifies a single tile's variant and attributes
export interface TileInstance {
    type: TileType;
    value: number;
}

export function serializeTiles(tiles: TileInstance[][]): Buffer {
    // todo
    return Buffer.alloc(0);
}


