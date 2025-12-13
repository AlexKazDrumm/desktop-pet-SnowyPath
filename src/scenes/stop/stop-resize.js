// src/scenes/stop/stop-resize.js

/**
 * Ресайз канваса stop + корректировка нижней панели.
 * Теперь нижняя панель НЕ имеет фиксированной высоты.
 * Мы измеряем её реальную высоту и под неё подрезаем канвас.
 */

function resizeStopCanvas() {
  if (!stopCanvas) return;

  const container = stopCanvas.parentElement;
  /** @type {HTMLElement|null} */
  const bottomBarEl = document.querySelector(".stop-bottom-bar");

  const width = container ? container.clientWidth : stopCanvas.clientWidth;
  const totalHeight = container ? container.clientHeight : stopCanvas.clientHeight;

  if (width <= 0 || totalHeight <= 0) return;

  // 1) сначала выставим "черновые" размеры, чтобы DOM мог посчитать высоту HUD
  stopCanvas.width = width;
  stopCanvas.height = totalHeight;
  stopCanvas.style.bottom = "0px";

  // 2) измеряем фактическую высоту нижней панели
  let bottomBarHeight = 0;
  if (bottomBarEl) {
    const rect = bottomBarEl.getBoundingClientRect();
    bottomBarHeight = Math.max(0, Math.floor(rect.height));
  }

  // 3) доступная высота под канвас
  const maxCanvasHeight = Math.max(100, totalHeight - bottomBarHeight);

  // 4) канвас по высоте = ровно gridH (чтобы сетка не "плавала"), но не больше доступного
  const layout = computeGridLayout(width, maxCanvasHeight);
  const canvasHeight = Math.min(layout.gridH, maxCanvasHeight);

  stopCanvas.width = width;
  stopCanvas.height = canvasHeight;

  // 5) канвас прижимаем над нижней панелью
  stopCanvas.style.bottom = `${bottomBarHeight}px`;

  // 6) пересчёт позиции игрока по нормализованным координатам
  if (state.mode === "stop") {
    const newLayout = computeGridLayout(stopCanvas.width, stopCanvas.height);

    if (typeof state.hub.xNorm === "number" && typeof state.hub.yNorm === "number") {
      state.hub.x = newLayout.offsetX + state.hub.xNorm * newLayout.gridW;
      state.hub.y = newLayout.offsetY + state.hub.yNorm * newLayout.gridH;
    } else {
      state.hub.x = clamp(state.hub.x, newLayout.offsetX, newLayout.offsetX + newLayout.gridW);
      state.hub.y = clamp(state.hub.y, newLayout.offsetY, newLayout.offsetY + newLayout.gridH);

      state.hub.xNorm = (state.hub.x - newLayout.offsetX) / newLayout.gridW;
      state.hub.yNorm = (state.hub.y - newLayout.offsetY) / newLayout.gridH;
    }

    state.hub.xNorm = (state.hub.x - newLayout.offsetX) / newLayout.gridW;
    state.hub.yNorm = (state.hub.y - newLayout.offsetY) / newLayout.gridH;
  }
}
