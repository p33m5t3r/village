import path from 'path';
import fs from 'fs/promises';
import type { TileType, TileData, TileInstance } from './world/tiles';
import { TILE_DATA, serializeTiles } from './world/tiles';

const CONFIG = {
    version: '0.0',
    save_dir: 'saves',
} as const;


type State = {
    metadata: {
        version: string;
        created: string;
        worldSize: number;
    };
    turn: number,
    tiles: number[][];
}

function stateInit(): State {
    const worldSize = 100;
    return {
        metadata: {
            version: CONFIG.version,
            created: Date.now().toString(),
            worldSize: 100,
        },
        turn: 0,
        tiles: new Array(worldSize).map(() => new Array(worldSize)),
    }
}

function stateSaveAs(s: State, save_name: string): boolean {
    // todo; serializeTiles 
    return true;
}

function stateLoadFrom(save_name: string): State {
    // todo; actually load
    return stateInit();
}


type View = 'todo';

function viewStateFromSaveAs(save_name: string, playerId: string | undefined): View {
    const state = stateLoadFrom(save_name);
    return 'todo';
}

function show_info(){
    console.log(`village version: ${CONFIG.version}`);
    console.log('\nAvailable commands:');
    for (const cmd of Object.values(commands)) {
        console.log(`  ${cmd.usage}`);
        console.log(`    ${cmd.description}\n`);
    }
}

type Command = {
    name: string;
    description: string;
    usage: string;
    execute: (args: string[]) => Promise<void>;
};

const commands: Record<string, Command> = {
    new: {
        name: 'new',
        description: 'Create a new game save',
        usage: 'village new <save_name>',
        execute: async (args) => {
            const save_name = args[0];
            if (!save_name) {
                console.log('error: no save name given. exiting.');
                return;
            }
            console.log(`initializing world '${save_name}' in '${CONFIG.save_dir}'`);
            const initial_state = stateInit();
            stateSaveAs(initial_state, save_name);
        }
    },
    
    view: {
        name: 'view',
        description: 'View game state for a player',
        usage: 'village view <save_name> [player_id]',
        execute: async (args) => {
            const save_name = args[0];
            const player_id = args[1];
            if (!save_name) {
                console.log('error: no save name given. exiting.');
                return;
            }
            const view = viewStateFromSaveAs(save_name, player_id);
            console.log(view);
        }
    },
    
    exec: {
        name: 'exec',
        description: 'Execute actions from stdin',
        usage: 'village exec <save_name>',
        execute: async (args) => {
            const save_name = args[0];
            // TODO: implement
            console.log('exec not implemented yet');
        }
    },
    
    advance: {
        name: 'advance',
        description: 'Progress game until player turn',
        usage: 'village advance <save_name> <player_id>',
        execute: async (args) => {
            const save_name = args[0];
            const player_id = args[1];
            // TODO: implement
            console.log('advance not implemented yet');
        }
    },
    
    run: {
        name: 'run',
        description: 'Run game loop',
        usage: 'village run <save_name> [n_turns]',
        execute: async (args) => {
            const save_name = args[0];
            const n_turns = args[1] ? parseInt(args[1]) : undefined;
            // TODO: implement
            console.log('run not implemented yet');
        }
    }
};

async function main() {
    const args = Bun.argv;
    const userArgs = args.slice(2);
    const commandName = userArgs[0];
    const commandArgs = userArgs.slice(1);

    if (!commandName) {
        show_info();
        return;
    }

    const command = commands[commandName];
    if (!command) {
        console.log(`Unknown command: ${commandName}`);
        show_info();
        return;
    }

    await command.execute(commandArgs);
}


if (import.meta.main) {
  await main();
}

