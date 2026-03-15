const PUZZLES = [
  {
    difficultyLabel: "Easy",
    puzzle: [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ],
    solution: [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
      [1, 9, 8, 3, 4, 2, 5, 6, 7],
      [8, 5, 9, 7, 6, 1, 4, 2, 3],
      [4, 2, 6, 8, 5, 3, 7, 9, 1],
      [7, 1, 3, 9, 2, 4, 8, 5, 6],
      [9, 6, 1, 5, 3, 7, 2, 8, 4],
      [2, 8, 7, 4, 1, 9, 6, 3, 5],
      [3, 4, 5, 2, 8, 6, 1, 7, 9]
    ]
  },
  {
    difficultyLabel: "Medium",
    puzzle: [
      [0, 2, 0, 6, 0, 8, 0, 0, 0],
      [5, 8, 0, 0, 0, 9, 7, 0, 0],
      [0, 0, 0, 0, 4, 0, 0, 0, 0],
      [3, 7, 0, 0, 0, 0, 5, 0, 0],
      [6, 0, 0, 0, 0, 0, 0, 0, 4],
      [0, 0, 8, 0, 0, 0, 0, 1, 3],
      [0, 0, 0, 0, 2, 0, 0, 0, 0],
      [0, 0, 9, 8, 0, 0, 0, 3, 6],
      [0, 0, 0, 3, 0, 6, 0, 9, 0]
    ],
    solution: [
      [1, 2, 3, 6, 7, 8, 9, 4, 5],
      [5, 8, 4, 2, 3, 9, 7, 6, 1],
      [9, 6, 7, 1, 4, 5, 3, 2, 8],
      [3, 7, 2, 4, 6, 1, 5, 8, 9],
      [6, 9, 1, 5, 8, 3, 2, 7, 4],
      [4, 5, 8, 7, 9, 2, 6, 1, 3],
      [8, 3, 6, 9, 2, 4, 1, 5, 7],
      [2, 1, 9, 8, 5, 7, 4, 3, 6],
      [7, 4, 5, 3, 1, 6, 8, 9, 2]
    ]
  }
];

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function coordinatesMatch(a, b) {
  return a.row === b.row && a.col === b.col;
}

export function createSudokuState(random = Math.random) {
  const index = Math.floor(random() * PUZZLES.length);
  const selected = PUZZLES[index];

  return {
    puzzle: cloneGrid(selected.puzzle),
    solution: cloneGrid(selected.solution),
    entries: selected.puzzle.map((row) => row.map(() => 0)),
    selectedCell: null,
    conflicts: [],
    difficultyLabel: selected.difficultyLabel
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

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
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

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
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

export function isSudokuCellSelected(state, row, col) {
  return state.selectedCell !== null && coordinatesMatch(state.selectedCell, { row, col });
}
