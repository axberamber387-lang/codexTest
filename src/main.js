import { advanceGame, createInitialState, GRID_SIZE, queueDirection } from "./snakeLogic.js";

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
  game: createInitialState(),
  timerId: null,
  speed: "normal",
  soundEnabled: true,
  musicTimerId: null,
  musicStep: 0
};

const board = document.querySelector("[data-board]");
const overlay = document.querySelector("[data-overlay]");
const scoreValue = document.querySelector("[data-score]");
const statusValue = document.querySelector("[data-status]");
const speedSelect = document.querySelector("[data-speed]");
const soundSelect = document.querySelector("[data-sound]");
const startButton = document.querySelector("[data-start]");
const restartButton = document.querySelector("[data-restart]");
const controlButtons = document.querySelectorAll("[data-direction]");
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

function playMusicStep() {
  if (!state.soundEnabled || state.game.status !== "running") {
    return;
  }

  const note = MUSIC_PATTERN[state.musicStep];
  playTone(note.frequency, note.duration, "square", 0.025);
  playTone(note.frequency / 2, Math.max(0.08, note.duration - 0.02), "triangle", 0.012);
  state.musicStep = (state.musicStep + 1) % MUSIC_PATTERN.length;
}

function stopMusicLoop() {
  if (state.musicTimerId !== null) {
    window.clearInterval(state.musicTimerId);
    state.musicTimerId = null;
  }
}

function startMusicLoop() {
  stopMusicLoop();

  if (!state.soundEnabled || state.game.status !== "running") {
    return;
  }

  playMusicStep();
  state.musicTimerId = window.setInterval(playMusicStep, MUSIC_STEP_MS);
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

function startLoop() {
  stopLoop();
  state.timerId = window.setInterval(() => {
    const previousGame = state.game;
    state.game = advanceGame(state.game);

    if (state.game.score > previousGame.score) {
      playFoodSound();
    }

    if (
      previousGame.status !== "game-over" &&
      state.game.status === "game-over"
    ) {
      stopMusicLoop();
      playGameOverSound();
    }

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

  stopMusicLoop();
}

function restartGame() {
  stopLoop();
  state.musicStep = 0;
  state.game = createInitialState();
  render();
}

function startGame() {
  unlockAudio();
  state.musicStep = 0;
  state.game = {
    ...createInitialState(),
    status: "running"
  };
  render();
  startLoop();
  startMusicLoop();
}

function resumeGame() {
  if (state.game.status !== "paused") {
    return;
  }

  unlockAudio();
  state.game = {
    ...state.game,
    status: "running"
  };
  render();
  startLoop();
  startMusicLoop();
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
  soundSelect.value = state.soundEnabled ? "on" : "off";
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
  unlockAudio();

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
    startMusicLoop();
  }
});
soundSelect.addEventListener("change", () => {
  state.soundEnabled = soundSelect.value === "on";

  if (state.soundEnabled) {
    unlockAudio();
    startMusicLoop();
    return;
  }

  stopMusicLoop();
});

controlButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDirection(button.dataset.direction);
  });
});

render();
