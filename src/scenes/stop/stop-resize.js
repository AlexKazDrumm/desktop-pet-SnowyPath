// src/scenes/stop/stop-resize.js

/**
 * Ресайз канваса stop под единый стейдж 16x8 БЕЗ растяжения CSS-ом.
 * Правило: внутренний размер canvas === визуальному CSS размеру (1:1),
 * клетка строго целая, канвас центрируется по X, прибит к верху.
 *
 * Это убирает мыло/смещение и делает пиксель-арт стабильным.
 */

function resizeStopCanvas() {
  if (!stopCanvas) return;

  // ВАЖНО: контейнером берем секцию stop, а не parentElement canvas,
  // чтобы размеры были предсказуемые даже при позиционировании.
  const screen = document.getElementById("screen-stop");
  const container = screen || stopCanvas.parentElement;

  const cw = container ? container.clientWidth : stopCanvas.clientWidth;
  const ch = container ? container.clientHeight : stopCanvas.clientHeight;

  if (!cw || !ch || cw <= 0 || ch <= 0) return;

  const cols = typeof HUB_GRID_COLS === "number" ? HUB_GRID_COLS : 16;

  // 16x6 город + 2 строки HUD = 8
  const stageRows = typeof HUB_STAGE_ROWS === "number"
    ? HUB_STAGE_ROWS
    : ((typeof HUB_GRID_ROWS === "number" ? HUB_GRID_ROWS : 7) + 2);

  // подбираем целочисленный cellSize, чтобы ВЛЕЗЛО в контейнер
  const cellSize = Math.max(8, Math.floor(Math.min(cw / cols, ch / stageRows)));

  const cssW = cols * cellSize;
  const cssH = stageRows * cellSize;

  // размер буфера = размеру на экране (никакого DPR и растяжений)
  stopCanvas.width = cssW;
  stopCanvas.height = cssH;

  // позиционируем канвас вручную, чтобы он не тянулся CSS-ом
  const left = Math.max(0, Math.floor((cw - cssW) / 2));

  stopCanvas.style.position = "absolute";
  stopCanvas.style.top = "0px";
  stopCanvas.style.left = `${left}px`;
  stopCanvas.style.right = "auto";
  stopCanvas.style.bottom = "auto";
  stopCanvas.style.width = `${cssW}px`;
  stopCanvas.style.height = `${cssH}px`;

  // убираем сглаживание
  const ctx = stopCanvas.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }

  // Пересчёт позиции игрока по нормализованным координатам (только по миру 16x6)
  if (state && state.mode === "stop") {
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

  // ты сейчас реально рисуешь HUD в canvas — DOM HUD должен быть скрыт
  const bottomBarEl = document.querySelector(".stop-bottom-bar");
  if (bottomBarEl) bottomBarEl.style.display = "none";
}
