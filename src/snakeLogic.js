export const GRID_SIZE = 16;
export const INITIAL_DIRECTION = "right";
export const INITIAL_SNAKE = [
  { x: 7, y: 8 },
  { x: 6, y: 8 },
  { x: 5, y: 8 }
];

const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const OPPOSITE_DIRECTIONS = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

function positionsMatch(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function wrapPosition(position, gridSize) {
  return {
    x: (position.x + gridSize) % gridSize,
    y: (position.y + gridSize) % gridSize
  };
}

export function createInitialState(random = Math.random) {
  const snake = INITIAL_SNAKE.map((segment) => ({ ...segment }));

  return {
    snake,
    direction: INITIAL_DIRECTION,
    queuedDirection: INITIAL_DIRECTION,
    food: placeFood(snake, GRID_SIZE, random),
    score: 0,
    status: "idle"
  };
}

export function queueDirection(currentDirection, nextDirection) {
  if (!DIRECTION_VECTORS[nextDirection]) {
    return currentDirection;
  }

  return OPPOSITE_DIRECTIONS[currentDirection] === nextDirection
    ? currentDirection
    : nextDirection;
}

export function advanceGame(state, random = Math.random) {
  if (state.status === "game-over") {
    return state;
  }

  const direction = queueDirection(state.direction, state.queuedDirection);
  const head = state.snake[0];
  const vector = DIRECTION_VECTORS[direction];
  const nextHead = wrapPosition(
    { x: head.x + vector.x, y: head.y + vector.y },
    GRID_SIZE
  );
  const ateFood = positionsMatch(nextHead, state.food);
  const collisionBody = ateFood ? state.snake : state.snake.slice(0, -1);

  if (hitsSnake(nextHead, collisionBody)) {
    return {
      ...state,
      direction,
      queuedDirection: direction,
      status: "game-over"
    };
  }

  const nextSnake = [nextHead, ...state.snake];

  if (!ateFood) {
    nextSnake.pop();
  }

  return {
    snake: nextSnake,
    direction,
    queuedDirection: direction,
    food: ateFood ? placeFood(nextSnake, GRID_SIZE, random) : state.food,
    score: ateFood ? state.score + 1 : state.score,
    status: "running"
  };
}

export function placeFood(snake, gridSize, random = Math.random) {
  const openCells = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const occupied = snake.some((segment) => segment.x === x && segment.y === y);
      if (!occupied) {
        openCells.push({ x, y });
      }
    }
  }

  if (openCells.length === 0) {
    return null;
  }

  const index = Math.min(
    openCells.length - 1,
    Math.floor(random() * openCells.length)
  );

  return openCells[index];
}

export function isOutOfBounds(position, gridSize) {
  return (
    position.x < 0 ||
    position.y < 0 ||
    position.x >= gridSize ||
    position.y >= gridSize
  );
}

export function hitsSnake(position, snake) {
  return snake.some((segment) => positionsMatch(segment, position));
}
