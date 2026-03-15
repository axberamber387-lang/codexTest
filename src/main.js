import { advanceGame, createInitialState, GRID_SIZE, queueDirection } from "./snakeLogic.js";

const SPEED_TICKS = {
  slow: 220,
  normal: 140,
  fast: 90
};

const state = {
  game: createInitialState(),
  timerId: null,
  speed: "normal"
};

const board = document.querySelector("[data-board]");
const overlay = document.querySelector("[data-overlay]");
const scoreValue = document.querySelector("[data-score]");
const statusValue = document.querySelector("[data-status]");
const speedSelect = document.querySelector("[data-speed]");
const startButton = document.querySelector("[data-start]");
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
  }, SPEED_TICKS[state.speed]);
}

function stopLoop() {
  if (state.timerId !== null) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function restartGame() {
  stopLoop();
  state.game = createInitialState();
  render();
}

function startGame() {
  state.game = {
    ...createInitialState(),
    status: "running"
  };
  render();
  startLoop();
}

function resumeGame() {
  if (state.game.status !== "paused") {
    return;
  }

  state.game = {
    ...state.game,
    status: "running"
  };
  render();
  startLoop();
}

function togglePause() {
  if (state.game.status === "running") {
    stopLoop();
    state.game = {
      ...state.game,
      status: "paused"
    };
    render();
    return;
  }

  if (state.game.status === "paused") {
    resumeGame();
  }
}

function setDirection(direction) {
  if (state.game.status !== "running") {
    return;
  }

  state.game = {
    ...state.game,
    queuedDirection: queueDirection(state.game.direction, direction)
  };

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
  speedSelect.value = state.speed;
  overlay.hidden = state.game.status !== "idle";

  if (state.game.status === "game-over") {
    statusValue.textContent = "Game over";
  } else if (state.game.status === "idle") {
    statusValue.textContent = "Press Start game";
  } else if (state.game.status === "paused") {
    statusValue.textContent = "Paused";
  } else {
    statusValue.textContent = "Running";
  }
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    togglePause();
    return;
  }

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

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);
speedSelect.addEventListener("change", () => {
  state.speed = speedSelect.value;

  if (state.game.status === "running") {
    startLoop();
  }
});

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDirection(button.dataset.direction);
  });
});

render();
