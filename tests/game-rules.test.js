const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateFailure, isJourneyComplete } = require("../src/core/game-rules.js");

test("journey continues while resources remain", () => {
  assert.equal(evaluateFailure({ hunger: 1, fatigue: 1, finished: false }), null);
});
test("zero hunger ends the journey", () => {
  assert.match(evaluateFailure({ hunger: 0, fatigue: 50, finished: false }).description, /еды/);
});
test("zero fatigue ends the journey", () => {
  assert.match(evaluateFailure({ hunger: 50, fatigue: 0, finished: false }).description, /Усталость/);
});
test("completed journey is not evaluated as a failure", () => {
  assert.equal(evaluateFailure({ hunger: 0, fatigue: 0, finished: true }), null);
});
test("last map point completes the route", () => {
  assert.equal(isJourneyComplete({ currentPointIndex: 9 }, 10), true);
  assert.equal(isJourneyComplete({ currentPointIndex: 8 }, 10), false);
});
