#!/usr/bin/env bun
type TileType = 'grass' | 'water';
type TileData = {
    walkable: boolean;
    char: string;
    color: string;
}

type TileGrid = TileType[][];
const TILE_CONFIG: Record<TileType, TileData> = {
    grass: { walkable: true, char: '.', color: 'green' },
    water: { walkable: false, char: '~', color: 'blue' }
}

function makeTileGrid(size: number): TileGrid {
    const default_fill: TileType = 'grass';
    const grid = Array(size).fill(null).map(() => 
        Array(size).fill(default_fill)
    );
    grid[0][0] = 'water';
    return grid;
}

type EntityType = 'player' | 'ore';
type Position = { x: number, y: number };
type EntityId = number;
type EntityData = {
    name: string;
    char: string;
    color: string;
    desc: string;
}

const ENTITY_CONFIG: Record<EntityType, EntityData> = {
    player: { name: 'Player', char: '@', color: 'white', desc: 'player' },
    ore: { name: 'Ore', char: 'o', color: 'purple', desc: 'ore' }
}

interface Entity {
    type: EntityType;
    pos: Position;
    id: EntityId;
}

interface Ore extends Entity {
    quantity: number;
}

// note to self; these create fns dont attach to the world instance, have id -1!
function createOre(x: number, y: number, q: number): Ore {
    return { type: 'ore', pos: { x, y }, id: -1, quantity: q };
}

interface Player extends Entity {
    health: number;
    inventory: Record<string, number>
}


class WorldState {
    private static readonly size = 100;
    private tileGrid: TileType[][];
    private entities: Map<EntityId, Entity>;
    private nextEntityId: EntityId;


    constructor() {
        this.tileGrid = makeTileGrid(WorldState.size);
        this.entities = new Map();

        // demo
        this.spawnEntity(createOre(1,1,10));

        this.nextEntityId = 1;
    }

    private getNextId(): EntityId {
        return this.nextEntityId++;
    }

    spawnEntity(entity: Entity): void {
        entity.id = this.getNextId();
        this.entities.set(entity.id, entity);
    }

    removeEntity(entity: Entity): boolean {
        return this.entities.delete(entity.id);
    }

    removeEntityById(id: EntityId): boolean {
        return this.entities.delete(id);
    }
    
    // Public method to access the tile grid
    getTile(x: number, y: number): TileType | null {
        if (x < 0 || x >= WorldState.size || y < 0 || y >= WorldState.size) {
            return null;
        }
        return this.tileGrid[y][x];
    }

    getEntity(id: EntityId): Entity | undefined {
        return this.entities.get(id);
    }
    
    getEntitiesAt(x: number, y: number): Entity[] {
        return Array.from(this.entities.values()).filter(e => e.pos.x === x && e.pos.y === y);
    }

    // todo; update me eventually, i will be slow
    getNearbyEntities(x: number, y: number, xrange: number, yrange: number): Entity[] {
        return Array.from(this.entities.values()).filter(e => 
            e.pos.x >= x && e.pos.x < x + xrange &&
            e.pos.y >= y && e.pos.y < y + yrange
        );
    }
    
    
    getAllEntities(): Entity[] {
        return Array.from(this.entities.values());
    }
    
    getSize(): number {
        return WorldState.size;
    }
}

function renderAsciiWorldState(ws: WorldState, startX: number, startY: number, w: number, h: number): string[] {
    // return a string array ready for console output with coordinate headers
    const lines: string[] = [];
    
    // Get all entities in the view area
    const nearbyEntities = ws.getNearbyEntities(startX, startY, w, h);
    
    // Create a map for quick entity lookup by position
    const entityMap = new Map<string, Entity>();
    for (const entity of nearbyEntities) {
        const key = `${entity.pos.x},${entity.pos.y}`;
        entityMap.set(key, entity);
    }
    
    // Create column headers (tens place)
    let tensLine = "    "; // 4 spaces for row labels
    for (let col = 0; col < w; col++) {
        const x = startX + col;
        tensLine += Math.floor(x / 10) % 10;
    }
    lines.push(tensLine);
    
    // Create column headers (ones place) 
    let onesLine = "    "; // 4 spaces for row labels
    for (let col = 0; col < w; col++) {
        const x = startX + col;
        onesLine += x % 10;
    }
    lines.push(onesLine);
    
    // Create each row with row labels and tile data
    for (let row = 0; row < h; row++) {
        const y = startY + row;
        
        // Row label (2 digits, right aligned)
        const rowLabel = y.toString().padStart(2, ' ') + "  ";
        
        let rowData = "";
        for (let col = 0; col < w; col++) {
            const x = startX + col;
            const key = `${x},${y}`;
            
            // Check for entity first (render on top)
            if (entityMap.has(key)) {
                const entity = entityMap.get(key)!;
                rowData += ENTITY_CONFIG[entity.type].char;
            } else {
                // Render underlying tile
                const tile = ws.getTile(x, y);
                if (tile === null) {
                    rowData += " "; // Out of bounds
                } else {
                    rowData += TILE_CONFIG[tile].char;
                }
            }
        }
        
        lines.push(rowLabel + rowData);
    }
    
    return lines;
}

async function main() {
    console.log("Starting ASCII LLM Game! (Press Ctrl+C to quit)");
    let state = new WorldState();
    let view = renderAsciiWorldState(state, 0, 0, 50, 30);
    
    // print the view to the console
    for (let line of view) {
        console.log(line);
    }
}

// Run the game
if (import.meta.main) {
  main();
}
