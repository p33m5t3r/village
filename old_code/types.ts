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
    sprite: Sprite;
    name: string;
    desc: string;
    show_value: boolean;     // is the associated 'value' meaningful for this type?
    value_str: string;       // if so, what does it mean? (e.g. speed, richness, etc)
}

// todo move to structures.ts
// associates tile variants with their attributes, for rendering and in-game information 
export const TILE_DATA = {
    [TileType.GRASSLAND]: {
        sprite: { char: '.', color: 'green' },
        name: 'grassland',
        desc: 'can be foraged for food equal to the tile\'s richness, or turned into a farm',
        show_value: true,
        value_str: 'richness'
    },
    [TileType.FOREST]: {
        sprite: { char: 'T', color: 'green' },
        name: 'forest',
        desc: 'can be harvested for timber equal to the tile\'s richness',
        show_value: true,
        value_str: 'richness'
    },
    [TileType.NULL]: {
        sprite: { char: ' ', color: 'white' },
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

export enum StructureType {
    FARM = 0,
    MINE = 1,
    WAREHOUSE = 2,
    ROAD = 3,
    FACTORY = 4,
    ARMORY = 5,
    HOUSE = 6,
    LIBRARY = 7,
}

export enum TierType {
    PRIMITIVE = 0,
    INDUSTRIAL = 1,
    ADVANCED = 2
}

export type StructureData = {
    sprite: Sprite;
    name: string;
    desc: string;
}

export const STRUCTURE_DATA: Partial<Record<StructureType, Partial<Record<TierType, StructureData>>>>  = {
    [StructureType.FARM]: {
        [TierType.PRIMITIVE]: {
            sprite: {char: 'f', color: 'brown'},
            name: 'primitive farm',
            desc: 'produces a small amount of food at harvest time. must be tended frequently'
        },
    }
};

export interface StructureInstance {
    type: StructureType;
    tier: TierType;
}

export interface FarmInstance extends StructureInstance {
    health: number;
    lastTilled: number;
    growth: number;
    yield: number;
}

export enum ItemType {
    food = 0,
    metal = 1,
    timber = 2,
    material = 3,
    weaponry = 4,
}

export interface ItemData {
    type: ItemType;
    tier: TierType;
    name: string;
    desc: string;
    weight: number;
}

export interface ItemInstance {
    type: ItemType;
    tier: TierType;
}

export interface ItemStack {
    instance: ItemInstance;
    qty: number;
}

export type Sprite = {
    char: string;
    color: string;
}

export type Position = {
    x: number;
    y: number;
}

export type Player = {
    name: string;
    sprite: Sprite;
    viewport_size: number;
}


