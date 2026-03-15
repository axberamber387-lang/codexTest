import test from "node:test";
import assert from "node:assert/strict";

import {
  createSudokuState,
  getSudokuStatus,
  isSudokuSolved,
  setSudokuCellValue
} from "../src/sudokuLogic.js";

test("createSudokuState returns a puzzle with empty entries", () => {
  const state = createSudokuState(() => 0);

  assert.equal(state.difficultyLabel, "Easy");
  assert.equal(state.entries[0][0], 0);
  assert.equal(state.puzzle[0][2], 0);
  assert.equal(state.solution[0][2], 4);
});

test("setSudokuCellValue ignores fixed cells", () => {
  const state = createSudokuState(() => 0);
  const next = setSudokuCellValue(state, 0, 0, 9);

  assert.equal(next.entries[0][0], 0);
  assert.deepEqual(next.selectedCell, { row: 0, col: 0 });
});

test("setSudokuCellValue stores editable values and tracks conflicts", () => {
  const state = createSudokuState(() => 0);
  const wrong = setSudokuCellValue(state, 0, 2, 9);
  const corrected = setSudokuCellValue(wrong, 0, 2, 4);

  assert.equal(wrong.entries[0][2], 9);
  assert.deepEqual(wrong.conflicts, [{ row: 0, col: 2 }]);
  assert.equal(corrected.entries[0][2], 4);
  assert.deepEqual(corrected.conflicts, []);
});

test("isSudokuSolved becomes true when all empty cells match the solution", () => {
  let state = createSudokuState(() => 0);

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (state.puzzle[row][col] === 0) {
        state = setSudokuCellValue(state, row, col, state.solution[row][col]);
      }
    }
  }

  assert.equal(isSudokuSolved(state), true);
  assert.equal(getSudokuStatus(state), "Solved");
});

test("getSudokuStatus reflects idle, conflict, and guided input states", () => {
  const initial = createSudokuState(() => 0);
  const selected = {
    ...initial,
    selectedCell: { row: 0, col: 2 }
  };
  const conflicted = setSudokuCellValue(selected, 0, 2, 9);

  assert.equal(getSudokuStatus(initial), "Select a cell to begin");
  assert.equal(getSudokuStatus(selected), "Type 1-9, or Delete to clear");
  assert.equal(getSudokuStatus(conflicted), "Check highlighted cells");
});
