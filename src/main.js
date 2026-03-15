import { advanceGame, createInitialState, GRID_SIZE, queueDirection } from "./snakeLogic.js";

const TICK_MS = 140;

const state = {
  game: createInitialState(),
  timerId: null
};

const board = document.querySelector("[data-board]");
const scoreValue = document.querySelector("[data-score]");
const statusValue = document.querySelector("[data-status]");
const restartButton = document.querySelector("[data-restart]");
const controlButtons = document.querySelectorAll("[data-direction]");

function startLoop() {
  stopLoop();
  state.timerId = window.setInterval(() => {
    state.game = advanceGame(state.game);
    render();

    if (state.game.status === "game-over") {
      stopLoop();
    }
  }, TICK_MS);
}

function stopLoop() {
  if (state.timerId !== null) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function restartGame() {
  state.game = {
    ...createInitialState(),
    status: "running"
  };
  render();
  startLoop();
}

function setDirection(direction) {
  state.game = {
    ...state.game,
    queuedDirection: queueDirection(state.game.direction, direction),
    status: state.game.status === "idle" ? "running" : state.game.status
  };

  if (state.timerId === null && state.game.status === "running") {
    startLoop();
  }

  render();
}

function render() {
  board.style.setProperty("--grid-size", String(GRID_SIZE));
  board.replaceChildren();

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";

      if (state.game.food && state.game.food.x === x && state.game.food.y === y) {
        cell.classList.add("cell-food");
      }

      if (state.game.snake.some((segment) => segment.x === x && segment.y === y)) {
        cell.classList.add("cell-snake");
      }

      if (state.game.snake[0].x === x && state.game.snake[0].y === y) {
        cell.classList.add("cell-head");
      }

      board.append(cell);
    }
  }

  scoreValue.textContent = String(state.game.score);

  if (state.game.status === "game-over") {
    statusValue.textContent = "Game over";
  } else if (state.game.status === "idle") {
    statusValue.textContent = "Press an arrow key or WASD";
  } else {
    statusValue.textContent = "Running";
  }
}

window.addEventListener("keydown", (event) => {
  const directionByKey = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    a: "left",
    s: "down",
    d: "right",
    W: "up",
    A: "left",
    S: "down",
    D: "right"
  };

  const direction = directionByKey[event.key];
  if (!direction) {
    return;
  }

  event.preventDefault();
  setDirection(direction);
});

restartButton.addEventListener("click", restartGame);

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDirection(button.dataset.direction);
  });
});

render();
