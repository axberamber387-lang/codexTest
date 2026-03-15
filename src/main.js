import { advanceGame, createInitialState, GRID_SIZE, queueDirection } from "./snakeLogic.js";
import {
  clearSudokuEntries,
  createSudokuState,
  getNextSudokuDifficultyKey,
  getSudokuStatus,
  isSudokuSolved,
  setSudokuCellValue
} from "./sudokuLogic.js";

const SPEED_TICKS = {
  slow: 220,
  normal: 140,
  fast: 90
};

const SNAKE_MUSIC_STEP_MS = 180;
const SNAKE_MUSIC_PATTERN = [
  { frequency: 523.25, duration: 0.12 },
  { frequency: 659.25, duration: 0.12 },
  { frequency: 783.99, duration: 0.12 },
  { frequency: 659.25, duration: 0.12 },
  { frequency: 587.33, duration: 0.12 },
  { frequency: 698.46, duration: 0.12 },
  { frequency: 880, duration: 0.16 },
  { frequency: 698.46, duration: 0.12 }
];

const SUDOKU_MUSIC_STEP_MS = 650;
const SUDOKU_TRACK_CHANGE_MS = 120000;
const SUDOKU_TRACKS = [
  [
    { melody: 261.63, bass: 130.81, harmony: 392.0, duration: 0.48 },
    { melody: 293.66, bass: 146.83, harmony: 440.0, duration: 0.42 },
    { melody: 329.63, bass: 164.81, harmony: 493.88, duration: 0.52 },
    { melody: 293.66, bass: 146.83, harmony: 440.0, duration: 0.44 }
  ],
  [
    { melody: 220.0, bass: 110.0, harmony: 329.63, duration: 0.46 },
    { melody: 246.94, bass: 123.47, harmony: 369.99, duration: 0.44 },
    { melody: 293.66, bass: 146.83, harmony: 440.0, duration: 0.5 },
    { melody: 246.94, bass: 123.47, harmony: 392.0, duration: 0.46 }
  ],
  [
    { melody: 196.0, bass: 98.0, harmony: 293.66, duration: 0.52 },
    { melody: 220.0, bass: 110.0, harmony: 329.63, duration: 0.48 },
    { melody: 261.63, bass: 130.81, harmony: 392.0, duration: 0.5 },
    { melody: 220.0, bass: 110.0, harmony: 329.63, duration: 0.44 }
  ]
];

const state = {
  currentView: "menu",
  theme: "default",
  soundEnabled: true,
  snake: {
    game: createInitialState(),
    timerId: null,
    speed: "normal",
    musicTimerId: null,
    musicStep: 0
  },
  sudoku: createSudokuState({ difficultyKey: "easy" }),
  sudokuAudio: {
    musicTimerId: null,
    trackTimerId: null,
    musicStep: 0,
    trackIndex: 0
  }
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
const soundToggles = document.querySelectorAll("[data-sound-toggle]");
const startButton = document.querySelector("[data-start]");
const restartButton = document.querySelector("[data-restart]");
const controlButtons = document.querySelectorAll("[data-direction]");

const sudokuBoard = document.querySelector("[data-sudoku-board]");
const sudokuStatus = document.querySelector("[data-sudoku-status]");
const sudokuDifficulty = document.querySelector("[data-sudoku-difficulty]");
const sudokuDifficultySelect = document.querySelector("[data-sudoku-difficulty-select]");
const sudokuNewGameButton = document.querySelector("[data-sudoku-new]");
const sudokuClearButton = document.querySelector("[data-sudoku-clear]");
const sudokuClearAllButton = document.querySelector("[data-sudoku-clear-all]");
const sudokuVictory = document.querySelector("[data-sudoku-victory]");
const sudokuVictoryRepeat = document.querySelector("[data-sudoku-repeat]");
const sudokuVictoryIncrease = document.querySelector("[data-sudoku-increase]");
const sudokuVictoryMenu = document.querySelector("[data-sudoku-menu]");

let audioContext = null;

function createSudokuGame(difficultyKey = state.sudoku.difficultyKey) {
  return createSudokuState({ difficultyKey });
}

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
  if (!state.soundEnabled) {
    return;
  }

  const context = getAudioContext();
  if (context && context.state === "suspended") {
    context.resume().catch(() => {});
  }
}

function playTone(frequency, duration, type, volume, when = 0) {
  if (!state.soundEnabled) {
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

function playSnakeMusicStep() {
  if (!state.soundEnabled || state.currentView !== "snake") {
    return;
  }

  if (state.snake.game.status !== "running") {
    return;
  }

  const note = SNAKE_MUSIC_PATTERN[state.snake.musicStep];
  playTone(note.frequency, note.duration, "square", 0.025);
  playTone(note.frequency / 2, Math.max(0.08, note.duration - 0.02), "triangle", 0.012);
  state.snake.musicStep = (state.snake.musicStep + 1) % SNAKE_MUSIC_PATTERN.length;
}

function stopSnakeMusicLoop() {
  if (state.snake.musicTimerId !== null) {
    window.clearInterval(state.snake.musicTimerId);
    state.snake.musicTimerId = null;
  }
}

function startSnakeMusicLoop() {
  stopSnakeMusicLoop();

  if (!state.soundEnabled || state.currentView !== "snake") {
    return;
  }

  if (state.snake.game.status !== "running") {
    return;
  }

  playSnakeMusicStep();
  state.snake.musicTimerId = window.setInterval(playSnakeMusicStep, SNAKE_MUSIC_STEP_MS);
}

function playSudokuMusicStep() {
  if (!state.soundEnabled || state.currentView !== "sudoku") {
    return;
  }

  if (isSudokuSolved(state.sudoku)) {
    return;
  }

  const track = SUDOKU_TRACKS[state.sudokuAudio.trackIndex];
  const note = track[state.sudokuAudio.musicStep];
  playTone(note.melody, note.duration, "square", 0.016);
  playTone(note.bass, note.duration + 0.08, "triangle", 0.01);
  playTone(note.harmony, Math.max(0.18, note.duration - 0.08), "square", 0.008, 0.16);
  state.sudokuAudio.musicStep = (state.sudokuAudio.musicStep + 1) % track.length;
}

function rotateSudokuTrack() {
  state.sudokuAudio.trackIndex =
    (state.sudokuAudio.trackIndex + 1) % SUDOKU_TRACKS.length;
  state.sudokuAudio.musicStep = 0;
}

function stopSudokuMusicLoop() {
  if (state.sudokuAudio.musicTimerId !== null) {
    window.clearInterval(state.sudokuAudio.musicTimerId);
    state.sudokuAudio.musicTimerId = null;
  }

  if (state.sudokuAudio.trackTimerId !== null) {
    window.clearInterval(state.sudokuAudio.trackTimerId);
    state.sudokuAudio.trackTimerId = null;
  }
}

function startSudokuMusicLoop() {
  stopSudokuMusicLoop();

  if (!state.soundEnabled || state.currentView !== "sudoku" || isSudokuSolved(state.sudoku)) {
    return;
  }

  playSudokuMusicStep();
  state.sudokuAudio.musicTimerId = window.setInterval(
    playSudokuMusicStep,
    SUDOKU_MUSIC_STEP_MS
  );
  state.sudokuAudio.trackTimerId = window.setInterval(() => {
    rotateSudokuTrack();
  }, SUDOKU_TRACK_CHANGE_MS);
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

function playSudokuSolvedSound() {
  unlockAudio();
  playTone(523.25, 0.12, "square", 0.03);
  playTone(659.25, 0.14, "square", 0.03, 0.12);
  playTone(783.99, 0.16, "square", 0.025, 0.24);
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

function resetSudokuGame(difficultyKey = state.sudoku.difficultyKey) {
  state.sudoku = createSudokuGame(difficultyKey);
  state.sudokuAudio.musicStep = 0;
  if (state.currentView === "sudoku") {
    startSudokuMusicLoop();
  }
}

function handleSolvedSudoku() {
  stopSudokuMusicLoop();
  playSudokuSolvedSound();
}

function handleSudokuInput(value) {
  if (state.currentView !== "sudoku" || !state.sudoku.selectedCell || isSudokuSolved(state.sudoku)) {
    return;
  }

  const previousSolved = isSudokuSolved(state.sudoku);
  state.sudoku = setSudokuCellValue(
    state.sudoku,
    state.sudoku.selectedCell.row,
    state.sudoku.selectedCell.col,
    value
  );

  if (!previousSolved && isSudokuSolved(state.sudoku)) {
    handleSolvedSudoku();
  }

  renderSudoku();
}

function openView(view) {
  if (view === state.currentView) {
    return;
  }

  if (state.currentView === "snake" && view !== "snake") {
    stopSnakeLoop();
  }

  if (state.currentView === "sudoku" && view !== "sudoku") {
    stopSudokuMusicLoop();
  }

  state.currentView = view;

  if (view === "snake" && state.snake.game.status === "running") {
    startSnakeLoop();
  }

  if (view === "sudoku") {
    startSudokuMusicLoop();
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
        if (isSudokuSolved(state.sudoku)) {
          return;
        }

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
  sudokuDifficultySelect.value = state.sudoku.difficultyKey;
  sudokuStatus.textContent = getSudokuStatus(state.sudoku);
  sudokuVictory.hidden = !isSudokuSolved(state.sudoku);
  sudokuVictoryIncrease.disabled = state.sudoku.difficultyKey === "hard";
}

function render() {
  document.body.dataset.theme = state.theme;
  themeSelect.value = state.theme;
  soundToggles.forEach((toggle) => {
    toggle.value = state.soundEnabled ? "on" : "off";
  });

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
    unlockAudio();

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

soundToggles.forEach((toggle) => {
  toggle.addEventListener("change", () => {
    state.soundEnabled = toggle.value === "on";

    if (state.soundEnabled) {
      unlockAudio();

      if (state.currentView === "snake") {
        startSnakeMusicLoop();
      }

      if (state.currentView === "sudoku") {
        startSudokuMusicLoop();
      }

      render();
      return;
    }

    stopSnakeMusicLoop();
    stopSudokuMusicLoop();
    render();
  });
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

sudokuDifficultySelect.addEventListener("change", () => {
  resetSudokuGame(sudokuDifficultySelect.value);
  renderSudoku();
});

sudokuNewGameButton.addEventListener("click", () => {
  resetSudokuGame(state.sudoku.difficultyKey);
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

sudokuVictoryRepeat.addEventListener("click", () => {
  resetSudokuGame(state.sudoku.difficultyKey);
  renderSudoku();
});

sudokuVictoryIncrease.addEventListener("click", () => {
  resetSudokuGame(getNextSudokuDifficultyKey(state.sudoku.difficultyKey));
  renderSudoku();
});

sudokuVictoryMenu.addEventListener("click", () => {
  backToMenu();
});

render();
