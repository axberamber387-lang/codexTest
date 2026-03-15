import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceGame,
  createInitialState,
  hitsSnake,
  isOutOfBounds,
  placeFood,
  queueDirection,
  wrapPosition
} from "../src/snakeLogic.js";

test("queueDirection ignores direct reversals", () => {
  assert.equal(queueDirection("right", "left"), "right");
  assert.equal(queueDirection("up", "left"), "left");
});

test("advanceGame moves the snake in the queued direction", () => {
  const initial = {
    ...createInitialState(() => 0),
    status: "running",
    queuedDirection: "down"
  };

  const next = advanceGame(initial, () => 0);

  assert.deepEqual(next.snake[0], { x: 7, y: 9 });
  assert.equal(next.score, 0);
  assert.equal(next.status, "running");
});

test("advanceGame grows the snake and increments score when food is eaten", () => {
  const initial = {
    snake: [
      { x: 4, y: 4 },
      { x: 3, y: 4 },
      { x: 2, y: 4 }
    ],
    direction: "right",
    queuedDirection: "right",
    food: { x: 5, y: 4 },
    score: 0,
    status: "running"
  };

  const next = advanceGame(initial, () => 0);

  assert.equal(next.snake.length, 4);
  assert.equal(next.score, 1);
  assert.deepEqual(next.snake[0], { x: 5, y: 4 });
  assert.notDeepEqual(next.food, { x: 5, y: 4 });
});

test("advanceGame wraps the snake around board edges", () => {
  const initial = {
    snake: [
      { x: 15, y: 5 },
      { x: 14, y: 5 },
      { x: 13, y: 5 }
    ],
    direction: "right",
    queuedDirection: "right",
    food: { x: 0, y: 0 },
    score: 2,
    status: "running"
  };

  const next = advanceGame(initial, () => 0);

  assert.equal(next.status, "running");
  assert.equal(next.score, 2);
  assert.deepEqual(next.snake[0], { x: 0, y: 5 });
});

test("placeFood returns an unoccupied cell", () => {
  const snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 }
  ];

  const food = placeFood(snake, 2, () => 0.9);

  assert.deepEqual(food, { x: 1, y: 1 });
});

test("collision helpers identify bounds and self overlap", () => {
  assert.equal(isOutOfBounds({ x: -1, y: 0 }, 16), true);
  assert.equal(isOutOfBounds({ x: 8, y: 8 }, 16), false);
  assert.equal(hitsSnake({ x: 2, y: 2 }, [{ x: 2, y: 2 }]), true);
  assert.equal(hitsSnake({ x: 1, y: 2 }, [{ x: 2, y: 2 }]), false);
  assert.deepEqual(wrapPosition({ x: -1, y: 16 }, 16), { x: 15, y: 0 });
});
