
// ================= config ======================
export type GameConfig = {
    seed?: number;
    version: string;
    save_dir: string;
    world_size: number;
    default_action_points: number;
    default_movement_points: number;
    default_view_distance: number;
    distance_function: 'manhattan' | 'euclidean';
    max_turn_retries: number;
};


// ================= generic ======================
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };


// ================= state ======================
export type TurnQueue = string[];  // player ids
export type State = {
    config: GameConfig;
    seed: number;
    created: string;
    worldSize: number;

    turn: number,
    turnQueues: TurnQueue[]

    tiles: TileInstance[][];
    players: SpatialIndex<Player>;
    eventLog: GameEvent[];
};

export type Position = {
    x: number;
    y: number;
};


// ================= players ======================
export enum ResourceType {
    MOVEMENT = 'movement',
    ACTION = 'action',
}

export type Stat = { current: number; max: number; };
export type Player = {
    id: string;
    name: string;
    char: string;
    viewDistance: number;
    resources: Record<ResourceType, Stat>;
};

// Serialization-only type
export type SerializedPlayer = Player & {
    position: Position;
};

export type PlayerView = {
    gameTurn: number;
    player: Player & Position;
    map: string[][];
}

// ================= effects ======================
export type Effect = 
  | { type: 'MOVE_PLAYER'; playerId: string; from: Position; to: Position }
  | { type: 'ALTER_RESOURCE'; entityId: string; resource: ResourceType; field: 'current' | 'max'; delta: number }
  | { type: 'UPDATE_QUEUE'; queueIndex: number; operation: 'remove' | 'append'; playerId: string }
  | { type: 'SET_TURN'; turn: number };

// ================= events ======================
export type GameEvent = {
    id: string;
    turn: number;
    timestamp: string;
    effects: Effect[];
    success: boolean;
    error?: string;
} & (
    | { type: 'PLAYER_ACTION'; playerId: string; action: Action }
    | { type: 'SYSTEM'; operation: 'ADVANCE_TURN' | 'ASSIGN_TURN_GROUPS' | 'REMOVE_FROM_QUEUE' | 'MOVE_TO_BACK_OF_QUEUE'; details?: any }
);

// ================= actions ======================
export enum ActionType {
    MOVE = 'move',
};

export type Action = {
    type: ActionType;
    params: Record<string, any>;
};

export type PlayerAction = Action & { playerId: string; };

export type ParamSchema = {
    name: string;
    desc: string;
    type: 'string' | 'number' | 'boolean';
    required: boolean;
};

export type ActionEvent = {        
    action: Action;         // action taken
    playerId: string;       // who took the action
    startPos: Position;     // world location where the action started
    endPos?: Position;      // world location where the action ended (for movement)
    summary: string;        // summary of the effects or reason for error
};

export type ActionResult = Result<ActionEvent, string>;

export type ActionDefinition = {
    genericDesc: string;
    paramSchemas: ParamSchema[];

    // what to expect from exec'ing an action with given params for a player at state `s`
    anticipatedEffects: (s: State, playerId: string, a: Action) => string;

    // validate action and return complete GameEvent with effects
    execute: (s: State, playerId: string, a: Action) => GameEvent;
};


// ================= tiles ======================
// tile variants
export enum TileType {
    GRASSLAND = 0,
    DESERT = 1,
    MOUNTAIN = 2,
    WATER = 3,
    FOREST = 4,
    ORE = 5,
    NULL = 6
};

// tile attributes which are common across all instances
export type TileData = {
    char: string;
    name: string;
    desc: string;
    show_value: boolean;     // is the associated 'value' meaningful for this type?
    value_str: string;       // if so, what does it mean? (e.g. speed, richness, etc)
};

// uniquely identifies a single tile's variant and attributes
export interface TileInstance {
    type: TileType;
    value: number;
};


// ================= execution ======================
export type ExecutionConfig = {
    atomic: boolean;                    // throw on failed actions
    strictOrdering: boolean;            // can players act 'out of turn?'
    save_name?: string;                 // if included, the save to serialize state to
};


// ================= spatial index =================
export class SpatialIndex<T> {
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
    
    // Helper for serialization - get all entries as array
    getAllEntries(): Array<{id: string, entity: T, position: Position}> {
        const result = [];
        for (const [id, entity, position] of this.entries()) {
            result.push({id, entity, position});
        }
        return result;
    }
};

