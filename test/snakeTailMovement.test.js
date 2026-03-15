import test from "node:test";
import assert from "node:assert/strict";

import { advanceGame } from "../src/snakeLogic.js";

test("moving into the previous tail cell is allowed when not eating", () => {
  const initial = {
    snake: [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 1 }
    ],
    direction: "up",
    queuedDirection: "left",
    food: { x: 0, y: 0 },
    score: 3,
    status: "running"
  };

  const next = advanceGame(initial, () => 0);

  assert.equal(next.status, "running");
  assert.deepEqual(next.snake, [
    { x: 1, y: 1 },
    { x: 2, y: 1 },
    { x: 2, y: 2 },
    { x: 1, y: 2 }
  ]);
});
