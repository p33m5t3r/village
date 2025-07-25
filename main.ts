import path from 'path';
import fs from 'fs/promises';

const CONFIG = {
    version: '0.0',
    save_dir: 'saves',
} as const;


function init_game(save_name: string) {
    // if path exists, print 
    // make a directory at the game 
}


async function main() {
    const args = Bun.argv;
    const userArgs = args.slice(2);
    const command = userArgs[0];
    const cli_opts = userArgs.slice(1);

    switch (command) {
        case 'new':
            const save_name = cli_opts[0];
            init_game(save_name);
    };
}


if (import.meta.main) {
  await main();
}

