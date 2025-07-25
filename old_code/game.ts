import type { 
    TileData,
    TileInstance,
    StructureData,
    StructureInstance,
    ItemType,
    ItemData,
    ItemStack,
    ItemInstance,
    Sprite,
    Position,
    Player,
    FarmInstance,
} from './types';

import {
    StructureType,
    TierType,
    TileType,
    TILE_DATA,
    STRUCTURE_DATA
} from './types';


function generateStructures(state: WorldState): void {
    const example_structure: FarmInstance = {
        type: StructureType.FARM,
        tier: TierType.PRIMITIVE,
        health: 100,
        lastTilled: 0,
        growth: 0,
        yield: 10,
    }
    state.spawnStructure(example_structure, {x: 0, y: -1});
    state.spawnStructure(example_structure, {x: -1, y: 0});
}

function generatePlayers(state: WorldState): void {
    const example_player: Player = {
        name: 'dev',
        sprite: { char: '@', color: 'orange' },
        viewport_size: 100
    }
    state.spawnPlayer(example_player, {x: 0, y: 0});
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

function getAsciiCharAt(state: WorldState, pos: Position): string {
    let cellChar = ' ';
    const maybeTile = state.getTileAt(pos.x, pos.y);
    cellChar = maybeTileToAscii(maybeTile);

    const maybeStructure = state.structures.getAt(pos);
    if (maybeStructure !== undefined) {
        cellChar = maybeStructureToAscii(maybeStructure);
    }

    const maybePlayer = state.players.getAt(pos);
    if (maybePlayer !== undefined) {
        cellChar = maybePlayerToAscii(maybePlayer)
    }
    return cellChar;
}

function renderMap(state: WorldState, center: Position, width: number, height: number): string[] {
    const lines: string[] = [];
    const halfWidth = Math.floor(width / 2);
    const halfHeight = Math.floor(height / 2);
    
    for (let row = 0; row < height; row++) {
        const y = center.y + halfHeight - row; // Start from top of view area
        let rowData = '';
        for (let col = 0; col < width; col++) {
            const x = center.x - halfWidth + col; // Start from left of view area
            rowData += getAsciiCharAt(state, {x: x, y: y});
        }
        lines.push(rowData);
    }
    return lines;
}

//function getAvailableActions(state: WorldState, player: Player): void {
//    let structure_actions = [];
//    const structures_in_view = state.getStructuresInViewOf(player);
//    for (let structure in structures_in_view) {
//        const actions = get
//    }
//}

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

export class WorldState {
    static readonly size = 100;
    static readonly size_half = Math.floor(this.size / 2);
    readonly tiles: TileInstance[][];
    readonly structures = new SpatialIndex<StructureInstance>();
    readonly players = new SpatialIndex<Player>();
    private idGen = new IdGenerator();

    constructor() {
        const default_fill: TileInstance = {
            type: TileType.GRASSLAND,
            value: 1
        };
        this.tiles = Array(WorldState.size).fill(null).map(() => 
            Array(WorldState.size).fill(default_fill)
        );

        this.generateTiles(); 
        generateStructures(this);
        generatePlayers(this);
    }

    private generateTiles(): void {
        const ex_tree: TileInstance = {
            type: TileType.FOREST,
            value: 1
        }
        this.setTileAt(2,2, ex_tree);
    }

    private toArrayIndex(worldX: number, worldY: number): {row: number, col: number} | null {
        const col = worldX + WorldState.size_half;
        const row = -worldY + WorldState.size_half;
        
        if (col < 0 || col >= WorldState.size || row < 0 || row >= WorldState.size) {
            return null;
        }
        
        return { row, col };
    }
    
    getWorldBounds() {
        const half = WorldState.size_half;
        return {
            minX: -half,
            maxX: half - 1,  // -50 to 49 for size 100
            minY: -half,
            maxY: half - 1
        };
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
        const indices = this.toArrayIndex(x,y);
        if (!indices) return null;
        return this.tiles[indices.row][indices.col];
    }

    setTileAt(x: number, y: number, t: TileInstance): boolean {
        const indices = this.toArrayIndex(x,y);
        if (!indices) return false;
        
        this.tiles[indices.row][indices.col] = t;
        return true;
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





