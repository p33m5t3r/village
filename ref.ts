#!/usr/bin/env bun

// Components are just data
interface Component {
  type: string;
}

interface Position extends Component {
  type: 'position';
  x: number;
  y: number;
}

interface Renderable extends Component {
  type: 'renderable';
  char: string;
  color?: string;
}

interface AI extends Component {
  type: 'ai';
  personality: string;
  memory: string[];
  needsDecision: boolean;
}

interface Solid extends Component {
  type: 'solid';
}

// Entity is just an ID + components
class Entity {
  private static nextId = 0;
  public readonly id: number;
  private components = new Map<string, Component>();

  constructor() {
    this.id = Entity.nextId++;
  }

  addComponent<T extends Component>(component: T): void {
    this.components.set(component.type, component);
  }

  getComponent<T extends Component>(type: string): T | undefined {
    return this.components.get(type) as T;
  }

  hasComponent(type: string): boolean {
    return this.components.has(type);
  }

  getAllComponents(): Component[] {
    return Array.from(this.components.values());
  }
}

// World manages entities and provides queries
class World {
  private entities = new Map<number, Entity>();
  public tick = 0;

  addEntity(entity: Entity): void {
    this.entities.set(entity.id, entity);
  }

  removeEntity(entityId: number): void {
    this.entities.delete(entityId);
  }

  query(...componentTypes: string[]): Entity[] {
    return Array.from(this.entities.values()).filter(entity =>
      componentTypes.every(type => entity.hasComponent(type))
    );
  }

  getEntity(id: number): Entity | undefined {
    return this.entities.get(id);
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  update(): void {
    this.tick++;
  }
}

// Systems operate on entities with specific components
abstract class System {
  abstract update(world: World): void;
}

class RenderSystem extends System {
  update(world: World): void {
    // Clear screen
    console.clear();
    console.log(`=== Game Tick: ${world.tick} ===`);
    
    // Create a simple 20x10 grid
    const grid: string[][] = Array(10).fill(null).map(() => Array(20).fill('.'));
    
    const renderables = world.query('position', 'renderable');
    
    for (const entity of renderables) {
      const pos = entity.getComponent<Position>('position')!;
      const render = entity.getComponent<Renderable>('renderable')!;
      
      if (pos.x >= 0 && pos.x < 20 && pos.y >= 0 && pos.y < 10) {
        grid[pos.y][pos.x] = render.char;
      }
    }
    
    // Print the grid
    for (const row of grid) {
      console.log(row.join(' '));
    }
  }
}

class AISystem extends System {
  update(world: World): void {
    const aiEntities = world.query('ai', 'position');
    
    for (const entity of aiEntities) {
      const ai = entity.getComponent<AI>('ai')!;
      const pos = entity.getComponent<Position>('position')!;
      
      if (ai.needsDecision) {
        // Simple AI: move randomly
        const moves = [
          { x: 0, y: -1 }, // up
          { x: 0, y: 1 },  // down
          { x: -1, y: 0 }, // left
          { x: 1, y: 0 }   // right
        ];
        
        const move = moves[Math.floor(Math.random() * moves.length)];
        pos.x = Math.max(0, Math.min(19, pos.x + move.x));
        pos.y = Math.max(0, Math.min(9, pos.y + move.y));
        
        ai.needsDecision = false;
        console.log(`NPC ${entity.id} moved to (${pos.x}, ${pos.y})`);
      }
      
      // Set need decision every few ticks
      if (world.tick % 3 === 0) {
        ai.needsDecision = true;
      }
    }
  }
}

// Game setup
function createWorld(): World {
  const world = new World();

  // Create player
  const player = new Entity();
  player.addComponent<Position>({ type: 'position', x: 5, y: 5 });
  player.addComponent<Renderable>({ type: 'renderable', char: '@' });
  player.addComponent<Solid>({ type: 'solid' });

  // Create NPC
  const npc = new Entity();
  npc.addComponent<Position>({ type: 'position', x: 10, y: 3 });
  npc.addComponent<Renderable>({ type: 'renderable', char: 'N' });
  npc.addComponent<AI>({ type: 'ai', personality: 'friendly', memory: [], needsDecision: true });

  // Create some trees
  for (let i = 0; i < 5; i++) {
    const tree = new Entity();
    tree.addComponent<Position>({ 
      type: 'position', 
      x: Math.floor(Math.random() * 20), 
      y: Math.floor(Math.random() * 10) 
    });
    tree.addComponent<Renderable>({ type: 'renderable', char: 'T' });
    tree.addComponent<Solid>({ type: 'solid' });
    world.addEntity(tree);
  }

  world.addEntity(player);
  world.addEntity(npc);
  
  return world;
}

// Main game loop
async function main() {
  const world = createWorld();
  const renderSystem = new RenderSystem();
  const aiSystem = new AISystem();

  console.log("Starting ASCII LLM Game! (Press Ctrl+C to quit)");
  
  // Simple game loop
  const gameLoop = setInterval(() => {
    aiSystem.update(world);
    renderSystem.update(world);
    world.update();
  }, 1000); // Update every second

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    clearInterval(gameLoop);
    console.log('\nGame ended!');
    process.exit(0);
  });
}

// Run the game
if (import.meta.main) {
  main();
}
