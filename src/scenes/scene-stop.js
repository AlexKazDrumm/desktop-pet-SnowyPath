// src/scenes/scene-stop.js

/**
 * Тонкий вход сцены stop:
 * - бинды инпута один раз
 * - resize
 * - делегирование в модули stop/*
 */

/** @type {HTMLCanvasElement|null} */
var stopCanvas = null;
/** @type {CanvasRenderingContext2D|null} */
var stopCtx = null;

function ensureStopSceneBound() {
  if (ensureStopSceneBound._bound) return;
  ensureStopSceneBound._bound = true;

  window.addEventListener("resize", () => {
    if (state.mode === "stop") resizeStopCanvas();
  });

  window.addEventListener("keydown", (e) => {
    if (state.mode !== "stop") return;

    if (e.code === "KeyI") {
      e.preventDefault();
      toggleInventoryUI();
    }

    if (e.code === "KeyE") {
      e.preventDefault();
      handleHubInteract();
    }

    if (e.code === "Enter" || e.code === "Space") {
      if (stopDialogState.open) {
        const hasMore = stopDialogState.lineIndex < stopDialogState.lines.length - 1;
        if (hasMore) {
          e.preventDefault();
          advanceStopDialog();
        }
      }
    }
  });
}
ensureStopSceneBound._bound = false;

ensureStopSceneBound();
