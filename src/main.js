import { advanceGame, createInitialState, GRID_SIZE, queueDirection } from "./snakeLogic.js";
import {
  clearSudokuEntries,
  createSudokuState,
  getSudokuStatus,
  setSudokuCellValue
} from "./sudokuLogic.js";

const SPEED_TICKS = {
  slow: 220,
  normal: 140,
  fast: 90
};

const MUSIC_STEP_MS = 180;
const MUSIC_PATTERN = [
  { frequency: 523.25, duration: 0.12 },
  { frequency: 659.25, duration: 0.12 },
  { frequency: 783.99, duration: 0.12 },
  { frequency: 659.25, duration: 0.12 },
  { frequency: 587.33, duration: 0.12 },
  { frequency: 698.46, duration: 0.12 },
  { frequency: 880, duration: 0.16 },
  { frequency: 698.46, duration: 0.12 }
];

const state = {
  currentView: "menu",
  theme: "default",
  snake: {
    game: createInitialState(),
    timerId: null,
    speed: "normal",
    soundEnabled: true,
    musicTimerId: null,
    musicStep: 0
  },
  sudoku: createSudokuState()
};

const themeSelect = document.querySelector("[data-theme]");
const appTitle = document.querySelector("[data-app-title]");
const gameMenu = document.querySelector("[data-game-menu]");
const snakeScreen = document.querySelector("[data-snake-screen]");
const sudokuScreen = document.querySelector("[data-sudoku-screen]");
const menuButtons = document.querySelectorAll("[data-open-game]");
const backButtons = document.querySelectorAll("[data-back-menu]");

const board = document.querySelector("[data-board]");
const overlay = document.querySelector("[data-overlay]");
const scoreValue = document.querySelector("[data-score]");
const statusValue = document.querySelector("[data-status]");
const speedSelect = document.querySelector("[data-speed]");
const soundSelect = document.querySelector("[data-sound]");
const startButton = document.querySelector("[data-start]");
const restartButton = document.querySelector("[data-restart]");
const controlButtons = document.querySelectorAll("[data-direction]");

const sudokuBoard = document.querySelector("[data-sudoku-board]");
const sudokuStatus = document.querySelector("[data-sudoku-status]");
const sudokuDifficulty = document.querySelector("[data-sudoku-difficulty]");
const sudokuNewGameButton = document.querySelector("[data-sudoku-new]");
const sudokuClearButton = document.querySelector("[data-sudoku-clear]");
const sudokuClearAllButton = document.querySelector("[data-sudoku-clear-all]");

let audioContext = null;

function getAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }

  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContextClass();
  }

  return audioContext;
}

function unlockAudio() {
  if (!state.snake.soundEnabled) {
    return;
  }

  const context = getAudioContext();
  if (context && context.state === "suspended") {
    context.resume().catch(() => {});
  }
}

function playTone(frequency, duration, type, volume, when = 0) {
  if (!state.snake.soundEnabled) {
    return;
  }

  const context = getAudioContext();
  if (!context) {
    return;
  }

  const startAt = context.currentTime + when;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

function playMusicStep() {
  if (!state.snake.soundEnabled || state.currentView !== "snake") {
    return;
  }

  if (state.snake.game.status !== "running") {
    return;
  }

  const note = MUSIC_PATTERN[state.snake.musicStep];
  playTone(note.frequency, note.duration, "square", 0.025);
  playTone(note.frequency / 2, Math.max(0.08, note.duration - 0.02), "triangle", 0.012);
  state.snake.musicStep = (state.snake.musicStep + 1) % MUSIC_PATTERN.length;
}

function stopSnakeMusicLoop() {
  if (state.snake.musicTimerId !== null) {
    window.clearInterval(state.snake.musicTimerId);
    state.snake.musicTimerId = null;
  }
}

function startSnakeMusicLoop() {
  stopSnakeMusicLoop();

  if (!state.snake.soundEnabled || state.currentView !== "snake") {
    return;
  }

  if (state.snake.game.status !== "running") {
    return;
  }

  playMusicStep();
  state.snake.musicTimerId = window.setInterval(playMusicStep, MUSIC_STEP_MS);
}

function playFoodSound() {
  unlockAudio();
  playTone(660, 0.08, "square", 0.05);
  playTone(880, 0.1, "square", 0.04, 0.05);
}

function playGameOverSound() {
  unlockAudio();
  playTone(220, 0.18, "sawtooth", 0.05);
  playTone(165, 0.28, "triangle", 0.04, 0.08);
}

function stopSnakeLoop() {
  if (state.snake.timerId !== null) {
    window.clearInterval(state.snake.timerId);
    state.snake.timerId = null;
  }

  stopSnakeMusicLoop();
}

function startSnakeLoop() {
  stopSnakeLoop();

  state.snake.timerId = window.setInterval(() => {
    const previousGame = state.snake.game;
    state.snake.game = advanceGame(state.snake.game);

    if (state.snake.game.score > previousGame.score) {
      playFoodSound();
    }

    if (
      previousGame.status !== "game-over" &&
      state.snake.game.status === "game-over"
    ) {
      stopSnakeMusicLoop();
      playGameOverSound();
    }

    render();

    if (state.snake.game.status === "game-over") {
      stopSnakeLoop();
    }
  }, SPEED_TICKS[state.snake.speed]);

  startSnakeMusicLoop();
}

function resetSnakeToIdle() {
  stopSnakeLoop();
  state.snake.musicStep = 0;
  state.snake.game = createInitialState();
}

function startSnakeGame() {
  unlockAudio();
  state.snake.musicStep = 0;
  state.snake.game = {
    ...createInitialState(),
    status: "running"
  };
  startSnakeLoop();
  render();
}

function resumeSnakeGame() {
  if (state.snake.game.status !== "paused") {
    return;
  }

  unlockAudio();
  state.snake.game = {
    ...state.snake.game,
    status: "running"
  };
  startSnakeLoop();
  render();
}

function toggleSnakePause() {
  if (state.currentView !== "snake") {
    return;
  }

  if (state.snake.game.status === "running") {
    stopSnakeLoop();
    state.snake.game = {
      ...state.snake.game,
      status: "paused"
    };
    render();
    return;
  }

  if (state.snake.game.status === "paused") {
    resumeSnakeGame();
  }
}

function setSnakeDirection(direction) {
  if (state.currentView !== "snake" || state.snake.game.status !== "running") {
    return;
  }

  state.snake.game = {
    ...state.snake.game,
    queuedDirection: queueDirection(state.snake.game.direction, direction)
  };

  renderSnake();
}

function openView(view) {
  if (view === state.currentView) {
    return;
  }

  if (state.currentView === "snake" && view !== "snake") {
    stopSnakeLoop();
  }

  state.currentView = view;

  if (view === "snake" && state.snake.game.status === "running") {
    startSnakeLoop();
  }

  render();
}

function backToMenu() {
  openView("menu");
}

function renderSnake() {
  board.style.setProperty("--grid-size", String(GRID_SIZE));
  board.replaceChildren();

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";

      if (
        state.snake.game.food &&
        state.snake.game.food.x === x &&
        state.snake.game.food.y === y
      ) {
        cell.classList.add("cell-food");
      }

      if (state.snake.game.snake.some((segment) => segment.x === x && segment.y === y)) {
        cell.classList.add("cell-snake");
      }

      if (state.snake.game.snake[0].x === x && state.snake.game.snake[0].y === y) {
        cell.classList.add("cell-head");
      }

      board.append(cell);
    }
  }

  scoreValue.textContent = String(state.snake.game.score);
  speedSelect.value = state.snake.speed;
  soundSelect.value = state.snake.soundEnabled ? "on" : "off";
  overlay.hidden = state.snake.game.status !== "idle";

  if (state.snake.game.status === "game-over") {
    statusValue.textContent = "Game over";
  } else if (state.snake.game.status === "idle") {
    statusValue.textContent = "Press Start game";
  } else if (state.snake.game.status === "paused") {
    statusValue.textContent = "Paused";
  } else {
    statusValue.textContent = "Running";
  }
}

function renderSudoku() {
  sudokuBoard.replaceChildren();

  const { puzzle, entries, selectedCell } = state.sudoku;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const button = document.createElement("button");
      const puzzleValue = puzzle[row][col];
      const entryValue = entries[row][col];
      const displayValue = puzzleValue || entryValue || "";
      const isFixed = puzzleValue !== 0;
      const isSelected =
        selectedCell !== null &&
        selectedCell.row === row &&
        selectedCell.col === col;

      button.type = "button";
      button.className = "sudoku-cell";
      button.textContent = String(displayValue);
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.setAttribute("aria-label", `Sudoku cell ${row + 1}-${col + 1}`);

      if (isFixed) {
        button.classList.add("sudoku-fixed");
      }

      if (isSelected) {
        button.classList.add("sudoku-selected");
      }

      if (state.sudoku.conflicts.some((cell) => cell.row === row && cell.col === col)) {
        button.classList.add("sudoku-conflict");
      }

      if ((col + 1) % 3 === 0 && col !== 8) {
        button.classList.add("sudoku-block-right");
      }

      if ((row + 1) % 3 === 0 && row !== 8) {
        button.classList.add("sudoku-block-bottom");
      }

      button.addEventListener("click", () => {
        state.sudoku = {
          ...state.sudoku,
          selectedCell: { row, col }
        };
        renderSudoku();
      });

      sudokuBoard.append(button);
    }
  }

  sudokuDifficulty.textContent = state.sudoku.difficultyLabel;
  sudokuStatus.textContent = getSudokuStatus(state.sudoku);
}

function render() {
  document.body.dataset.theme = state.theme;
  themeSelect.value = state.theme;

  appTitle.textContent =
    state.currentView === "snake"
      ? "Snake"
      : state.currentView === "sudoku"
        ? "Sudoku"
        : "Arcade";

  gameMenu.hidden = state.currentView !== "menu";
  snakeScreen.hidden = state.currentView !== "snake";
  sudokuScreen.hidden = state.currentView !== "sudoku";

  if (state.currentView === "snake") {
    renderSnake();
  }

  if (state.currentView === "sudoku") {
    renderSudoku();
  }
}

function handleSudokuInput(value) {
  if (state.currentView !== "sudoku" || !state.sudoku.selectedCell) {
    return;
  }

  state.sudoku = setSudokuCellValue(
    state.sudoku,
    state.sudoku.selectedCell.row,
    state.sudoku.selectedCell.col,
    value
  );
  renderSudoku();
}

window.addEventListener("keydown", (event) => {
  if (state.currentView === "snake") {
    unlockAudio();

    if (event.code === "Space") {
      event.preventDefault();
      toggleSnakePause();
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
    setSnakeDirection(direction);
    return;
  }

  if (state.currentView === "sudoku") {
    if (event.key >= "1" && event.key <= "9") {
      event.preventDefault();
      handleSudokuInput(Number(event.key));
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
      event.preventDefault();
      handleSudokuInput(0);
    }
  }
});

menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openView(button.dataset.openGame);
  });
});

backButtons.forEach((button) => {
  button.addEventListener("click", backToMenu);
});

startButton.addEventListener("click", startSnakeGame);
restartButton.addEventListener("click", () => {
  resetSnakeToIdle();
  render();
});

speedSelect.addEventListener("change", () => {
  state.snake.speed = speedSelect.value;

  if (state.currentView === "snake" && state.snake.game.status === "running") {
    startSnakeLoop();
    renderSnake();
  }
});

soundSelect.addEventListener("change", () => {
  state.snake.soundEnabled = soundSelect.value === "on";

  if (state.snake.soundEnabled) {
    unlockAudio();
    startSnakeMusicLoop();
    return;
  }

  stopSnakeMusicLoop();
});

themeSelect.addEventListener("change", () => {
  state.theme = themeSelect.value;
  render();
});

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setSnakeDirection(button.dataset.direction);
  });
});

sudokuNewGameButton.addEventListener("click", () => {
  state.sudoku = createSudokuState();
  renderSudoku();
});

sudokuClearButton.addEventListener("click", () => {
  if (!state.sudoku.selectedCell) {
    return;
  }

  handleSudokuInput(0);
});

sudokuClearAllButton.addEventListener("click", () => {
  state.sudoku = clearSudokuEntries(state.sudoku);
  renderSudoku();
});

render();
