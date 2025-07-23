
// tile variants
enum TileType {
    GRASSLAND = 0,
    DESERT = 1,
    MOUNTAIN = 2,
    WATER = 3,
    FOREST = 4,
    ORE = 5,
    NULL = 6
}

// tile attributes which are common across all instances
type TileData = {
    sprite: Sprite;
    name: string;
    desc: string;
    show_value: boolean;     // is the associated 'value' meaningful for this type?
    value_str: string;       // if so, what does it mean? (e.g. speed, richness, etc)
}

// associates tile variants with their attributes, for rendering and in-game information 
const TILE_DATA = {
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
interface TileInstance {
    type: TileType;
    value: number;
}

enum StructureType {
    FARM = 0,
    MINE = 1,
    WAREHOUSE = 2,
    ROAD = 3,
    FACTORY = 4,
    ARMORY = 5,
    HOUSE = 6,
    LIBRARY = 7,
}

enum TierType {
    PRIMITIVE = 0,
    INDUSTRIAL = 1,
    ADVANCED = 2
}

type StructureData = {
    sprite: Sprite;
    name: string;
    desc: string;
}

const STRUCTURE_DATA: Partial<Record<StructureType, Partial<Record<TierType, StructureData>>>>  = {
    [StructureType.FARM]: {
        [TierType.PRIMITIVE]: {
            sprite: {char: 'f', color: 'brown'},
            name: 'primitive farm',
            desc: 'produces a small amount of food at harvest time. must be tended frequently'
        },
    }
};

interface StructureInstance {
    type: StructureType;
    tier: TierType;
}

interface FarmInstance extends StructureInstance {
    health: number;
    lastTilled: number;
    growth: number;
    yield: number;
}

enum ItemType {
    food = 0,
    metal = 1,
    timber = 2,
    material = 3,
    weaponry = 4,
}

interface ItemData {
    type: ItemType;
    tier: TierType;
    name: string;
    desc: string;
    weight: number;
}

interface ItemInstance {
    type: ItemType;
    tier: TierType;
}

interface ItemStack {
    instance: ItemInstance;
    qty: number;
}

type Sprite = {
    char: string;
    color: string;
}

type Position = {
    x: number;
    y: number;
}

type Player = {
    name: string;
    sprite: Sprite;
}

interface ActionData {
    name: string;
    duration: number;
    desc: string;
    inputs: ItemInstance[];
    outputs: ItemInstance[];
}

function generateTiles(size: number): TileInstance[][] {
    const default_fill: TileInstance = {
        type: TileType.GRASSLAND,
        value: 1
    };

    const forest_tile: TileInstance = {
        type: TileType.FOREST,
        value: 99
    }

    const grid: TileInstance[][] = Array(size).fill(null).map(() => 
        Array(size).fill(default_fill)
    );
    grid[0][0] = forest_tile;
    return grid;
}

function generateStructures(state: WorldState): void {
    const example_structure: FarmInstance = {
        type: StructureType.FARM,
        tier: TierType.PRIMITIVE,
        health: 100,
        lastTilled: 0,
        growth: 0,
        yield: 10,
    }
    state.spawnStructure(example_structure, {x: 2, y: 2});
}

function generatePlayers(state: WorldState): void {
    const example_player: Player = {
        name: 'dev',
        sprite: { char: '@', color: 'orange' }
    }
    state.spawnPlayer(example_player, {x: 10, y: 10});
}

function maybeStructureToAscii(mt: StructureInstance | undefined): string {
    const undefined_char = '?';
    if (!mt) return undefined_char;
    
    const typeData = STRUCTURE_DATA[mt.type];
    if (!typeData) return undefined_char; 

    const data = typeData[mt.tier];
    if (!data) return undefined_char;
    return data.sprite.char;
}

function maybeTileToAscii(t: TileInstance | null): string {
    const tileType = t === null ? TileType.NULL : t.type
    return TILE_DATA[tileType]['sprite'].char
}

function maybePlayerToAscii(p: Player | undefined): string {
    if (!p) return '?';
    return p.sprite.char;
}

function renderMap(state: WorldState, pos: Position, width: number, height: number): string[] {
    const lines: string[] = [];
    for (let row = 0; row < height; row++) {
        const y = pos.y + row;
        let rowData = '';
        for (let col = 0; col < width; col++) {
            let cellChar = '?';
            const x = pos.x + col;
            const maybeTile = state.getTileAt(x,y);
            cellChar = maybeTileToAscii(maybeTile);

            const maybeStructure = state.structures.getAt({x: x, y: y});
            if (maybeStructure !== undefined) {
                cellChar = maybeStructureToAscii(maybeStructure);
            }

            const maybePlayer = state.players.getAt({x: x, y: y});
            if (maybePlayer !== undefined) {
                cellChar = maybePlayerToAscii(maybePlayer)
            }
            rowData += cellChar;
        }
        lines.push(rowData);
    }
    return lines;
}

function renderView(state: WorldState, pos: Position, width: number, height: number): string[] {
    const map = renderMap(state, pos, width, height);
    return map;
}

class IdGenerator {
  private counters: Map<string, number> = new Map();
  
  next(prefix: string): string {
    const current = this.counters.get(prefix) ?? 0;
    this.counters.set(prefix, current + 1);
    return `${prefix}-${current}`;
  }
}

class WorldState {
    private static readonly size = 100;
    readonly tiles: TileInstance[][];
    readonly structures = new SpatialIndex<StructureInstance>();
    readonly players = new SpatialIndex<Player>();
    private idGen = new IdGenerator();

    constructor() {
        this.tiles = generateTiles(WorldState.size);
        generateStructures(this);
        generatePlayers(this);
    }

    spawnStructure(s: StructureInstance, pos: Position) {
        const id = this.idGen.next('structure');
        this.structures.set(id, s, pos);
    }

    spawnPlayer(p: Player, pos: Position) {
        const id = this.idGen.next('player');
        this.players.set(id, p, pos);
    }

    getTileAt(x: number, y: number): TileInstance | null {
        if (x < 0 || x >= WorldState.size || y < 0 || y >= WorldState.size) {
            return null;
        }
        return this.tiles[y][x];
    }

    debug() {
        console.log('all structures:')
        for (const [id, structure, pos] of this.structures.entries()) {
            console.log(`${id} at (${pos.x}, ${pos.y}):`, structure);
        }
    }
}

// TODO: add players, 
async function main() {
    let state = new WorldState();
    const camera_pos: Position = {x: 0, y: 0}
    const view_width = 50;
    const view_height = 20;
    let view = renderView(state, camera_pos, view_width, view_height);
    
    for (let line of view) {
        console.log(line);
    }
}

// Run the game
if (import.meta.main) {
  main();
}

class SpatialIndex<T> {
  private entities: Map<string, T> = new Map();
  private positions: Map<string, Position> = new Map();
  private positionToId: Map<string, string> = new Map();
  
  private posKey(pos: Position): string {
    return `${pos.x},${pos.y}`;
  }
  
  // Add or update an entity
  set(id: string, entity: T, pos: Position): void {
    // Remove from old position if exists
    const oldPos = this.positions.get(id);
    if (oldPos) {
      this.positionToId.delete(this.posKey(oldPos));
    }
    
    // Add to new position
    this.entities.set(id, entity);
    this.positions.set(id, pos);
    this.positionToId.set(this.posKey(pos), id);
  }
  
  // Move an entity (more efficient than set when entity unchanged)
  move(id: string, newPos: Position): boolean {
    const entity = this.entities.get(id);
    const oldPos = this.positions.get(id);
    
    if (!entity || !oldPos) return false;
    
    // Check if position is occupied
    if (this.positionToId.has(this.posKey(newPos))) {
      return false; // Position occupied
    }
    
    // Update position
    this.positionToId.delete(this.posKey(oldPos));
    this.positions.set(id, newPos);
    this.positionToId.set(this.posKey(newPos), id);
    
    return true;
  }
  
  // Get entity at position
  getAt(pos: Position): T | undefined {
    const id = this.positionToId.get(this.posKey(pos));
    return id ? this.entities.get(id) : undefined;
  }
  
  // Get entity by ID
  get(id: string): T | undefined {
    return this.entities.get(id);
  }
  
  // Get position of entity
  getPosition(id: string): Position | undefined {
    return this.positions.get(id);
  }
  
  // Remove entity
  remove(id: string): boolean {
    const pos = this.positions.get(id);
    if (!pos) return false;
    
    this.entities.delete(id);
    this.positions.delete(id);
    this.positionToId.delete(this.posKey(pos));
    
    return true;
  }
  
  // Check if position is occupied
  isOccupied(pos: Position): boolean {
    return this.positionToId.has(this.posKey(pos));
  }
  
  // Get all entities (for iteration)
  *entries(): IterableIterator<[string, T, Position]> {
    for (const [id, entity] of this.entities) {
      const pos = this.positions.get(id)!;
      yield [id, entity, pos];
    }
  }
  
  // Get all entities in a region
  *getInRegion(topLeft: Position, bottomRight: Position): IterableIterator<[string, T, Position]> {
    // Naive implementation - for large worlds, consider quadtree
    for (const [id, entity, pos] of this.entries()) {
      if (pos.x >= topLeft.x && pos.x <= bottomRight.x &&
          pos.y >= topLeft.y && pos.y <= bottomRight.y) {
        yield [id, entity, pos];
      }
    }
  }
  
  // Get count
  get size(): number {
    return this.entities.size;
  }
  
  // Clear all
  clear(): void {
    this.entities.clear();
    this.positions.clear();
    this.positionToId.clear();
  }
}





