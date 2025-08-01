import { test, expect, afterEach } from "bun:test";
import { initState, saveState, loadState } from "../core/state";
import { execActionAsJson } from "../core/engine";
import { renderView } from "../core/views";
import type { ExecutionConfig } from "../core/types";
import { $ } from "bun";

const TEST_SAVE = "test-integration";

afterEach(async () => {
  // Clean up test save
  try {
    await $`rm -f saves/${TEST_SAVE}.json`;
  } catch {
    // Ignore cleanup errors
  }
});

test("player can move and view updates", () => {
    const p0 = 'player-0';

    // Create game
    const state = initState();
    saveState(state, TEST_SAVE);

    // Get initial view
    const view1 = renderView(TEST_SAVE, p0);

    // Move player
    const moveAction = JSON.stringify([{
    type: "move",
    playerId: p0,
    params: { x: 1, y: 0 }
    }]);

    const config: ExecutionConfig = {
    atomic: true,
    strictOrdering: true,
    save_name: TEST_SAVE
    };

    execActionAsJson(TEST_SAVE, moveAction, config);

    // Check view changed
    const view2 = renderView(TEST_SAVE, p0);
    expect(view1).not.toBe(view2);

    // Verify player is at new position
    const reloadedState = loadState(TEST_SAVE);
    const playerPos = reloadedState.players.getPosition(p0);
    expect(playerPos).toEqual({ x: 1, y: 0 });
});
