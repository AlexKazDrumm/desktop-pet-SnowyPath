// src/scenes/stop/stop-geometry.js

/**
 * Геометрия / координаты / базовые хелперы.
 * Никакой логики игры, только математика и примитивы.
 */

function isRoadChar(ch) { return ch === "#"; }
function isSidewalkChar(ch) { return ch === "s"; }
function isSnowChar(ch) { return ch === "."; }
function isGrassChar(ch) { return ch === "g"; }

function isWalkableTileChar(ch) {
  return isRoadChar(ch) || isSidewalkChar(ch) || isSnowChar(ch) || isGrassChar(ch);
}

/**
 * Получить символ из ASCII-сетки.
 * @param {string[]} grid
 * @param {number} x
 * @param {number} y
 */
function getMapChar(grid, x, y) {
  if (!grid || y < 0 || y >= grid.length) return " ";
  const row = grid[y] || "";
  if (x < 0 || x >= row.length) return " ";
  return row[x];
}

/**
 * Общий layout для "стейджа" 16x8.
 * Приоритет: влезть по ширине (16 колонок), но если по высоте не помещается — ужимаемся.
 * offsetY = 0 (прибито к верху), offsetX центрируется если пришлось ужать cellSize из-за высоты.
 *
 * @param {number} canvasW
 * @param {number} canvasH
 */
function computeStageLayout(canvasW, canvasH) {
  const cols = typeof HUB_GRID_COLS === "number" ? HUB_GRID_COLS : 16;

  const stageRows = typeof HUB_STAGE_ROWS === "number"
    ? HUB_STAGE_ROWS
    : ((typeof HUB_GRID_ROWS === "number" ? HUB_GRID_ROWS : 6) + 2);

  // сначала по ширине
  let cellSize = Math.max(8, Math.floor(canvasW / cols));
  let gridH = cellSize * stageRows;

  // если по высоте не влезает — ужимаемся
  if (gridH > canvasH) {
    cellSize = Math.max(8, Math.floor(Math.min(canvasW / cols, canvasH / stageRows)));
    gridH = cellSize * stageRows;
  }

  const gridW = cols * cellSize;

  // если gridW меньше canvasW (потому что ужали по высоте) — центрируем по X
  const offsetX = Math.max(0, Math.floor((canvasW - gridW) / 2));
  const offsetY = 0;

  const cityRows = typeof HUB_GRID_ROWS === "number" ? HUB_GRID_ROWS : 6;
  const uiRows = stageRows - cityRows;

  return {
    cols,
    stageRows,
    cityRows,
    uiRows,
    cellSize,
    gridW,
    gridH,
    offsetX,
    offsetY,
    cityY0: offsetY,
    cityH: cityRows * cellSize,
    hudY0: offsetY + cityRows * cellSize,
    hudH: uiRows * cellSize
  };
}

/**
 * Производный layout только для "мира" (города) 16x6
 * Использует тот же cellSize/offsetX/offsetY, но rows = cityRows.
 *
 * @param {ReturnType<typeof computeStageLayout>} stage
 */
function deriveCityLayout(stage) {
  return {
    cols: stage.cols,
    rows: stage.cityRows,
    cellSize: stage.cellSize,
    gridW: stage.gridW,
    gridH: stage.cityH,
    offsetX: stage.offsetX,
    offsetY: stage.offsetY
  };
}

/**
 * @param {number} px
 * @param {number} py
 * @param {{offsetX:number; offsetY:number; cellSize:number; cols:number; rows:number}} layout
 */
function pixelToCell(px, py, layout) {
  const cx = Math.floor((px - layout.offsetX) / layout.cellSize);
  const cy = Math.floor((py - layout.offsetY) / layout.cellSize);
  return { cx, cy };
}

/**
 * @param {number} cx
 * @param {number} cy
 * @param {{offsetX:number; offsetY:number; cellSize:number}} layout
 */
function cellToRect(cx, cy, layout) {
  const x = layout.offsetX + cx * layout.cellSize;
  const y = layout.offsetY + cy * layout.cellSize;
  const s = layout.cellSize;
  return { x, y, w: s, h: s };
}

/**
 * Прямоугольник в пределах клетки по относительным координатам (0..1)
 * @param {number} cx
 * @param {number} cy
 * @param {ReturnType<typeof deriveCityLayout>|ReturnType<typeof computeStageLayout>} layout
 * @param {number} relX
 * @param {number} relY
 * @param {number} relW
 * @param {number} relH
 */
function cellToSubRect(cx, cy, layout, relX, relY, relW, relH) {
  const base = cellToRect(cx, cy, layout);
  const x = base.x + base.w * relX;
  const y = base.y + base.h * relY;
  const w = base.w * relW;
  const h = base.h * relH;
  return { x, y, w, h };
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function snapAngleTo8Directions(angleRad) {
  const sectorAngle = Math.PI / 4;
  const sectorIndex = Math.round(angleRad / sectorAngle);
  return sectorIndex * sectorAngle;
}

/**
 * @param {HTMLImageElement} img
 * @param {number} boxX
 * @param {number} boxY
 * @param {number} boxW
 * @param {number} boxH
 */
function fitSpriteInBox(img, boxX, boxY, boxW, boxH) {
  if (!img || !img.complete || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
    return { x: boxX, y: boxY, w: boxW, h: boxH };
  }
  const aspect = img.naturalWidth / img.naturalHeight;
  let w = boxW;
  let h = w / aspect;
  if (h > boxH) {
    h = boxH;
    w = h * aspect;
  }
  const x = boxX + (boxW - w) / 2;
  const y = boxY + (boxH - h) / 2;
  return { x, y, w, h };
}

/**
 * Вычислить "радиус" игрока для коллизий/спавна
 * @param {ReturnType<typeof deriveCityLayout>} cityLayout
 */
function getPlayerRadius(cityLayout) {
  const drawSize = Math.max(6, Math.floor(cityLayout.cellSize * 0.25));
  return Math.max(3, drawSize / 2);
}

/**
 * Прямоугольник HUD-зоны в координатах canvas:
 *  - rows 6..7 (если cityRows=6, uiRows=2)
 *
 * @param {ReturnType<typeof computeStageLayout>} stage
 */
function getHudRect(stage) {
  return {
    x: stage.offsetX,
    y: stage.hudY0,
    w: stage.gridW,
    h: stage.hudH
  };
}

/**
 * Прямоугольник "HUD клетки" по координатам меню (col 1..16, row 1..2).
 * Внимание: меню — это нижние 2 строки canvas.
 *
 * @param {ReturnType<typeof computeStageLayout>} stage
 * @param {number} uiCol1based 1..16
 * @param {number} uiRow1based 1..2
 */
function hudCellToRect(stage, uiCol1based, uiRow1based) {
  const cx = Math.max(1, Math.min(stage.cols, uiCol1based)) - 1; // 0-based
  const ry = Math.max(1, Math.min(stage.uiRows, uiRow1based)) - 1; // 0..1
  const x = stage.offsetX + cx * stage.cellSize;
  const y = stage.hudY0 + ry * stage.cellSize;
  const s = stage.cellSize;
  return { x, y, w: s, h: s };
}

/**
 * HUD-область по диапазону клеток (включительно), 1-based координаты.
 *
 * @param {ReturnType<typeof computeStageLayout>} stage
 * @param {number} col0 1..16
 * @param {number} col1 1..16
 * @param {number} row0 1..2
 * @param {number} row1 1..2
 */
function hudCellsToRect(stage, col0, col1, row0, row1) {
  const c0 = Math.max(1, Math.min(stage.cols, col0)) - 1;
  const c1 = Math.max(1, Math.min(stage.cols, col1)) - 1;
  const r0 = Math.max(1, Math.min(stage.uiRows, row0)) - 1;
  const r1 = Math.max(1, Math.min(stage.uiRows, row1)) - 1;

  const x = stage.offsetX + c0 * stage.cellSize;
  const y = stage.hudY0 + r0 * stage.cellSize;
  const w = (c1 - c0 + 1) * stage.cellSize;
  const h = (r1 - r0 + 1) * stage.cellSize;
  return { x, y, w, h };
}
