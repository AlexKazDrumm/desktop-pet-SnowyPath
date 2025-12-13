// src/scenes/stop/stop-resize.js

/**
 * Ресайз канваса stop под единый стейдж 16x8.
 * HUD больше НЕ отдельный DOM-блок — рисуется в canvas.
 */

function resizeStopCanvas() {
  if (!stopCanvas) return;

  const container = stopCanvas.parentElement;
  const w = container ? container.clientWidth : stopCanvas.clientWidth;
  const h = container ? container.clientHeight : stopCanvas.clientHeight;

  if (w <= 0 || h <= 0) return;

  // Подбор cellSize: по ширине 16 колонок, но если не влезает по высоте 8 строк — ужимаемся.
  const cols = typeof HUB_GRID_COLS === "number" ? HUB_GRID_COLS : 16;
  const stageRows = typeof HUB_STAGE_ROWS === "number" ? HUB_STAGE_ROWS : 8;

  let cellSize = Math.max(8, Math.floor(w / cols));
  let wantH = cellSize * stageRows;

  if (wantH > h) {
    cellSize = Math.max(8, Math.floor(Math.min(w / cols, h / stageRows)));
    wantH = cellSize * stageRows;
  }

  const gridW = cols * cellSize;

  // Canvas оставляем по ширине контейнера, но реальный grid может быть уже — он центрируется offsetX в layout.
  stopCanvas.width = w;
  stopCanvas.height = wantH;

  // Визуально: пусть canvas занимает ровно то, что мы считаем "стейджем"
  stopCanvas.style.width = "100%";
  stopCanvas.style.height = `${wantH}px`;
  stopCanvas.style.left = "0px";
  stopCanvas.style.top = "0px";
  stopCanvas.style.bottom = "auto";

  // Пересчёт позиции игрока по нормализованным координатам (только по миру 16x6)
  if (state.mode === "stop") {
    const stage = computeStageLayout(stopCanvas.width, stopCanvas.height);
    const city = deriveCityLayout(stage);

    if (typeof state.hub.xNorm === "number" && typeof state.hub.yNorm === "number") {
      state.hub.x = city.offsetX + state.hub.xNorm * city.gridW;
      state.hub.y = city.offsetY + state.hub.yNorm * city.gridH;
    } else {
      state.hub.x = clamp(state.hub.x, city.offsetX, city.offsetX + city.gridW);
      state.hub.y = clamp(state.hub.y, city.offsetY, city.offsetY + city.gridH);

      state.hub.xNorm = (state.hub.x - city.offsetX) / city.gridW;
      state.hub.yNorm = (state.hub.y - city.offsetY) / city.gridH;
    }

    state.hub.xNorm = (state.hub.x - city.offsetX) / city.gridW;
    state.hub.yNorm = (state.hub.y - city.offsetY) / city.gridH;
  }

  // DOM HUD НЕ прячем: он нужен тебе сейчас (аватар/статы/инвентарь в DOM могут жить параллельно).
  // Если позже окончательно перейдёшь на canvas-HUD — тогда уберёшь DOM сам.
  const bottomBarEl = document.querySelector(".stop-bottom-bar");
  if (bottomBarEl) bottomBarEl.style.display = "none";
}
