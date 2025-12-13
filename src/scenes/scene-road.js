// src/scenes/scene-road.js

function ensureRoadSceneBound() {
  if (ensureRoadSceneBound._bound) return;
  ensureRoadSceneBound._bound = true;

  window.addEventListener("resize", () => {
    if (state && state.mode === "road") {
      if (typeof resizeRoadCanvas === "function") resizeRoadCanvas();
      if (typeof renderRoadScene === "function") renderRoadScene();
    }
  });
}
ensureRoadSceneBound._bound = false;

function enterRoadScene() {
  const screen = document.getElementById("screen-road");
  if (!screen) return;

  roadCanvas = /** @type {HTMLCanvasElement|null} */ (document.getElementById("roadCanvas"));
  if (!roadCanvas) return;

  roadCtx = roadCanvas.getContext("2d");
  if (roadCtx) roadCtx.imageSmoothingEnabled = false;

  ensureRoadSceneBound();

  if (typeof resizeRoadCanvas === "function") resizeRoadCanvas();
  if (typeof renderRoadScene === "function") renderRoadScene();
}

if (typeof window !== "undefined") {
  window.enterRoadScene = enterRoadScene;
}
