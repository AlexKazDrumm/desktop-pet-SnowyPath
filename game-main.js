// game-main.js

let lastTimestamp = 0;

/**
 * Главный игровой цикл
 * @param {number} timestamp
 */
function gameLoop(timestamp) {
  const dt = (timestamp - lastTimestamp) / 1000 || 0;
  lastTimestamp = timestamp;

  if (state.mode === "stop") {
    renderStopHub(dt);
  } else if (state.mode === "map") {
    renderMap();
  } else if (state.mode === "road") {
    updateRoad(dt);
  }
  // В меню и на экране конца ничего не обновляем по кадрам

  requestAnimationFrame(gameLoop);
}

window.addEventListener("DOMContentLoaded", () => {
  stopCanvas = /** @type {HTMLCanvasElement|null} */ (qid("stopCanvas"));
  mapCanvas  = /** @type {HTMLCanvasElement|null} */ (qid("mapCanvas"));
  roadCanvas = /** @type {HTMLCanvasElement|null} */ (qid("roadCanvas"));

  stopCtx = stopCanvas ? stopCanvas.getContext("2d") : null;
  mapCtx  = mapCanvas  ? mapCanvas.getContext("2d")  : null;
  roadCtx = roadCanvas ? roadCanvas.getContext("2d") : null;

  resizeStopCanvas();
  window.addEventListener("resize", resizeStopCanvas);

  renderStats();
  setupInput();
  setupMenuScene();
  setupEndScreen();

  // Стартуем с меню
  setScreen("screen-menu");

  requestAnimationFrame(gameLoop);
});
