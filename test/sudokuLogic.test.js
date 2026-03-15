import test from "node:test";
import assert from "node:assert/strict";

import {
  clearSudokuEntries,
  createSudokuState,
  getNextSudokuDifficultyKey,
  getSudokuStatus,
  isSudokuSolved,
  setSudokuCellValue
} from "../src/sudokuLogic.js";

test("createSudokuState returns a generated puzzle with blank entries", () => {
  const state = createSudokuState({ difficultyKey: "easy", random: () => 0 });
  const clueCount = state.puzzle.flat().filter((value) => value !== 0).length;

  assert.equal(state.difficultyLabel, "Easy");
  assert.equal(state.difficultyKey, "easy");
  assert.equal(state.entries[0][0], 0);
  assert.equal(clueCount, 40);
  assert.equal(state.solution.flat().every((value) => value >= 1 && value <= 9), true);
});

test("setSudokuCellValue ignores fixed cells", () => {
  const state = createSudokuState({ difficultyKey: "easy", random: () => 0 });
  const next = setSudokuCellValue(state, 0, 0, 9);

  assert.equal(next.entries[0][0], 0);
  assert.deepEqual(next.selectedCell, { row: 0, col: 0 });
});

test("setSudokuCellValue stores editable values and tracks conflicts", () => {
  const state = createSudokuState({ difficultyKey: "easy", random: () => 0 });
  const editableCell = state.puzzle
    .flatMap((row, rowIndex) =>
      row.map((value, colIndex) => ({ row: rowIndex, col: colIndex, value }))
    )
    .find((cell) => cell.value === 0);
  const wrongValue =
    state.solution[editableCell.row][editableCell.col] === 9 ? 8 : 9;
  const wrong = setSudokuCellValue(
    state,
    editableCell.row,
    editableCell.col,
    wrongValue
  );
  const corrected = setSudokuCellValue(
    wrong,
    editableCell.row,
    editableCell.col,
    state.solution[editableCell.row][editableCell.col]
  );

  assert.equal(wrong.entries[editableCell.row][editableCell.col], wrongValue);
  assert.deepEqual(wrong.conflicts, [
    { row: editableCell.row, col: editableCell.col }
  ]);
  assert.equal(
    corrected.entries[editableCell.row][editableCell.col],
    state.solution[editableCell.row][editableCell.col]
  );
  assert.deepEqual(corrected.conflicts, []);
});

test("isSudokuSolved becomes true when all empty cells match the solution", () => {
  let state = createSudokuState({ difficultyKey: "easy", random: () => 0 });

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
  const initial = createSudokuState({ difficultyKey: "easy", random: () => 0 });
  const editableCell = initial.puzzle
    .flatMap((row, rowIndex) =>
      row.map((value, colIndex) => ({ row: rowIndex, col: colIndex, value }))
    )
    .find((cell) => cell.value === 0);
  const selected = {
    ...initial,
    selectedCell: { row: editableCell.row, col: editableCell.col }
  };
  const wrongValue =
    initial.solution[editableCell.row][editableCell.col] === 9 ? 8 : 9;
  const conflicted = setSudokuCellValue(
    selected,
    editableCell.row,
    editableCell.col,
    wrongValue
  );

  assert.equal(getSudokuStatus(initial), "Select a cell to begin");
  assert.equal(getSudokuStatus(selected), "Type 1-9, or Delete to clear");
  assert.equal(getSudokuStatus(conflicted), "Check highlighted cells");
});

test("clearSudokuEntries removes all player-entered values and conflicts", () => {
  const initial = createSudokuState({ difficultyKey: "easy", random: () => 0 });
  const editableCells = initial.puzzle
    .flatMap((row, rowIndex) =>
      row.map((value, colIndex) => ({ row: rowIndex, col: colIndex, value }))
    )
    .filter((cell) => cell.value === 0)
    .slice(0, 2);
  let state = setSudokuCellValue(
    initial,
    editableCells[0].row,
    editableCells[0].col,
    initial.solution[editableCells[0].row][editableCells[0].col]
  );
  state = setSudokuCellValue(
    state,
    editableCells[1].row,
    editableCells[1].col,
    initial.solution[editableCells[1].row][editableCells[1].col] === 9 ? 8 : 9
  );

  const cleared = clearSudokuEntries(state);

  assert.equal(cleared.entries.flat().every((value) => value === 0), true);
  assert.deepEqual(cleared.conflicts, []);
});

test("createSudokuState supports the high difficulty level", () => {
  const state = createSudokuState({ difficultyKey: "hard", random: () => 0 });
  const clueCount = state.puzzle.flat().filter((value) => value !== 0).length;

  assert.equal(state.difficultyLabel, "High");
  assert.equal(state.difficultyKey, "hard");
  assert.equal(clueCount, 26);
});

test("getNextSudokuDifficultyKey advances until high and then stays there", () => {
  assert.equal(getNextSudokuDifficultyKey("easy"), "medium");
  assert.equal(getNextSudokuDifficultyKey("medium"), "hard");
  assert.equal(getNextSudokuDifficultyKey("hard"), "hard");
});
