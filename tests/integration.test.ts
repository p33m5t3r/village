import { test, expect, afterEach } from "bun:test";
import { initState, saveState, loadState } from "../core/state";
import { execActionAsJson } from "../core/engine";
import { renderView } from "../core/views";
import type { ExecutionConfig, GameConfig, State } from "../core/types";
import { generateTiles, defaultPlayer } from "../game/setup";
import { gameConfig } from "../config";
import { $ } from "bun";

const TEST_SAVE = "test-integration";
const PLAYER_1 = "test-player-1";
const PLAYER_2 = "test-player-2";

// Test setup function: two players with known positions
function testWorldSetup(state: State): void {
    generateTiles(state);
    
    const player1 = defaultPlayer(state.config);
    player1.id = PLAYER_1;
    player1.name = "Test Player 1";
    state.players.set(player1.id, player1, { x: 0, y: 0 });
    
    const player2 = defaultPlayer(state.config);
    player2.id = PLAYER_2;
    player2.name = "Test Player 2";
    state.players.set(player2.id, player2, { x: 5, y: 0 });
}

const testConfig: GameConfig = {
    ...gameConfig,
    default_movement_points: 5,
    seed: 12345
};

afterEach(async () => {
    // Clean up test save
    try {
        await $`rm -f saves/${TEST_SAVE}.json`;
    } catch {
        // Ignore cleanup errors
    }
});

test("player can move and view updates", () => {
    // Create game with test setup
    const state = initState(testConfig, testWorldSetup);
    saveState(state, TEST_SAVE);
    
    // Use whoever is first in the turn queue
    const firstPlayer = state.turnQueues[0]?.[0] || PLAYER_1;
    
    // Get the player's starting position to calculate expected movement cost
    const startingPos = state.players.getPosition(firstPlayer)!;
    const targetPos = { x: 1, y: 0 };
    const expectedMoveCost = Math.abs(targetPos.x - startingPos.x) + Math.abs(targetPos.y - startingPos.y);
    
    // Get initial view
    const view1 = renderView(TEST_SAVE, firstPlayer);
    
    // Move the first player in queue
    const moveAction = JSON.stringify([{
        type: "move",
        playerId: firstPlayer,
        params: targetPos
    }]);
    
    const config: ExecutionConfig = {
        atomic: true,
        strictOrdering: true,
        save_name: TEST_SAVE
    };
    
    execActionAsJson(TEST_SAVE, moveAction, config);
    
    // Check view changed
    const view2 = renderView(TEST_SAVE, firstPlayer);
    expect(view1).not.toBe(view2);
    
    // Verify player is at new position
    const reloadedState = loadState(TEST_SAVE);
    const playerPos = reloadedState.players.getPosition(firstPlayer);
    expect(playerPos).toEqual(targetPos);
    
    // Verify movement points were consumed correctly
    const player = reloadedState.players.get(firstPlayer);
    const expectedRemainingPoints = testConfig.default_movement_points - expectedMoveCost;
    expect(player?.movementPoints.current).toBe(expectedRemainingPoints);
});