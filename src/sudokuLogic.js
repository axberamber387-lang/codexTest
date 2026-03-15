const SUDOKU_SIZE = 9;
const BLOCK_SIZE = 3;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const DIFFICULTY_ORDER = ["easy", "medium", "hard"];
const DIFFICULTIES = {
  easy: { difficultyLabel: "Easy", clues: 40 },
  medium: { difficultyLabel: "Medium", clues: 32 },
  hard: { difficultyLabel: "High", clues: 26 }
};

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function shuffle(items, random = Math.random) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function createBaseSolvedBoard() {
  return Array.from({ length: SUDOKU_SIZE }, (_, row) =>
    Array.from(
      { length: SUDOKU_SIZE },
      (_, col) => ((row * BLOCK_SIZE + Math.floor(row / BLOCK_SIZE) + col) % SUDOKU_SIZE) + 1
    )
  );
}

function createShuffledIndexes(random = Math.random) {
  const groups = shuffle([0, 1, 2], random);
  const indexes = [];

  for (const group of groups) {
    const localIndexes = shuffle([0, 1, 2], random);
    for (const localIndex of localIndexes) {
      indexes.push(group * BLOCK_SIZE + localIndex);
    }
  }

  return indexes;
}

function permuteSolvedBoard(random = Math.random) {
  const base = createBaseSolvedBoard();
  const digitMap = shuffle(DIGITS, random);
  const rowIndexes = createShuffledIndexes(random);
  const colIndexes = createShuffledIndexes(random);

  return rowIndexes.map((rowIndex) =>
    colIndexes.map((colIndex) => digitMap[base[rowIndex][colIndex] - 1])
  );
}

function removeClues(solution, clues, random = Math.random) {
  const puzzle = cloneGrid(solution);
  const positions = shuffle(
    Array.from({ length: SUDOKU_SIZE * SUDOKU_SIZE }, (_, index) => index),
    random
  );
  const holesToCreate = SUDOKU_SIZE * SUDOKU_SIZE - clues;

  for (let index = 0; index < holesToCreate; index += 1) {
    const position = positions[index];
    const row = Math.floor(position / SUDOKU_SIZE);
    const col = position % SUDOKU_SIZE;
    puzzle[row][col] = 0;
  }

  return puzzle;
}

export function createSudokuState({
  difficultyKey = "easy",
  random = Math.random
} = {}) {
  const difficulty = DIFFICULTIES[difficultyKey] || DIFFICULTIES.easy;
  const solution = permuteSolvedBoard(random);
  const puzzle = removeClues(solution, difficulty.clues, random);

  return {
    puzzle,
    solution,
    entries: puzzle.map((row) => row.map(() => 0)),
    selectedCell: null,
    conflicts: [],
    difficultyKey,
    difficultyLabel: difficulty.difficultyLabel
  };
}

export function getNextSudokuDifficultyKey(currentDifficultyKey) {
  const currentIndex = DIFFICULTY_ORDER.indexOf(currentDifficultyKey);
  if (currentIndex === -1 || currentIndex === DIFFICULTY_ORDER.length - 1) {
    return DIFFICULTY_ORDER[DIFFICULTY_ORDER.length - 1];
  }

  return DIFFICULTY_ORDER[currentIndex + 1];
}

export function clearSudokuEntries(state) {
  return {
    ...state,
    entries: state.entries.map((row) => row.map(() => 0)),
    conflicts: []
  };
}

export function setSudokuCellValue(state, row, col, value) {
  if (state.puzzle[row][col] !== 0) {
    return {
      ...state,
      selectedCell: { row, col }
    };
  }

  const nextEntries = cloneGrid(state.entries);
  nextEntries[row][col] = value >= 1 && value <= 9 ? value : 0;
  const nextState = {
    ...state,
    entries: nextEntries,
    selectedCell: { row, col }
  };

  return {
    ...nextState,
    conflicts: findConflicts(nextState)
  };
}

export function findConflicts(state) {
  const conflicts = [];

  for (let row = 0; row < SUDOKU_SIZE; row += 1) {
    for (let col = 0; col < SUDOKU_SIZE; col += 1) {
      if (state.puzzle[row][col] !== 0) {
        continue;
      }

      const value = state.entries[row][col];
      if (value === 0) {
        continue;
      }

      if (value !== state.solution[row][col]) {
        conflicts.push({ row, col });
      }
    }
  }

  return conflicts;
}

export function isSudokuSolved(state) {
  if (state.conflicts.length > 0) {
    return false;
  }

  for (let row = 0; row < SUDOKU_SIZE; row += 1) {
    for (let col = 0; col < SUDOKU_SIZE; col += 1) {
      const actual = state.puzzle[row][col] || state.entries[row][col];
      if (actual !== state.solution[row][col]) {
        return false;
      }
    }
  }

  return true;
}

export function getSudokuStatus(state) {
  if (isSudokuSolved(state)) {
    return "Solved";
  }

  if (state.conflicts.length > 0) {
    return "Check highlighted cells";
  }

  if (state.selectedCell) {
    return "Type 1-9, or Delete to clear";
  }

  return "Select a cell to begin";
}
