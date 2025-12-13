// src/scenes/stop/stop-resize.js

/**
 * Ресайз канваса stop + корректировка нижней панели.
 */

function resizeStopCanvas() {
  if (!stopCanvas) return;

  const container = stopCanvas.parentElement;
  /** @type {HTMLElement|null} */
  const bottomBarEl = document.querySelector(".stop-bottom-bar");

  const width = container ? container.clientWidth : stopCanvas.clientWidth;
  const totalHeight = container ? container.clientHeight : stopCanvas.clientHeight;

  if (width <= 0 || totalHeight <= 0) return;

  const maxCanvasHeight = Math.max(100, totalHeight - STOP_BOTTOM_BAR_MIN_HEIGHT);

  const tmpLayout = computeGridLayout(width, maxCanvasHeight);

  let canvasHeight = tmpLayout.gridH;

  if (canvasHeight > maxCanvasHeight) {
    const fittedLayout = computeGridLayout(width, maxCanvasHeight);
    canvasHeight = fittedLayout.gridH;
  }

  let bottomBarHeight = totalHeight - canvasHeight;

  if (bottomBarHeight < STOP_BOTTOM_BAR_MIN_HEIGHT) {
    bottomBarHeight = STOP_BOTTOM_BAR_MIN_HEIGHT;
    canvasHeight = Math.max(100, totalHeight - bottomBarHeight);
  }

  stopCanvas.width = width;
  stopCanvas.height = canvasHeight;

  stopCanvas.style.bottom = `${bottomBarHeight}px`;

  if (bottomBarEl) {
    bottomBarEl.style.height = `${bottomBarHeight}px`;
  }

  if (state.mode === "stop") {
    const layout = computeGridLayout(stopCanvas.width, stopCanvas.height);

    if (typeof state.hub.xNorm === "number" && typeof state.hub.yNorm === "number") {
      state.hub.x = layout.offsetX + state.hub.xNorm * layout.gridW;
      state.hub.y = layout.offsetY + state.hub.yNorm * layout.gridH;
    } else {
      state.hub.x = clamp(state.hub.x, layout.offsetX, layout.offsetX + layout.gridW);
      state.hub.y = clamp(state.hub.y, layout.offsetY, layout.offsetY + layout.gridH);

      state.hub.xNorm = (state.hub.x - layout.offsetX) / layout.gridW;
      state.hub.yNorm = (state.hub.y - layout.offsetY) / layout.gridH;
    }

    state.hub.xNorm = (state.hub.x - layout.offsetX) / layout.gridW;
    state.hub.yNorm = (state.hub.y - layout.offsetY) / layout.gridH;
  }
}
