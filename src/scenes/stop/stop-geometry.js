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
 * Вычисление параметров сетки в пикселях.
 * Приоритет: занять всю ширину (если помещается по высоте).
 * Сетка прибита к верху (offsetY=0).
 *
 * @param {number} canvasW
 * @param {number} canvasH
 */
function computeGridLayout(canvasW, canvasH) {
  const cols = typeof HUB_GRID_COLS === "number" ? HUB_GRID_COLS : 16;
  const rows = typeof HUB_GRID_ROWS === "number" ? HUB_GRID_ROWS : 6;

  const cellByWidth = Math.max(8, Math.floor(canvasW / cols));
  const gridHByWidth = cellByWidth * rows;

  let cellSize = cellByWidth;

  if (gridHByWidth > canvasH) {
    cellSize = Math.max(8, Math.floor(Math.min(canvasW / cols, canvasH / rows)));
  }

  const gridW = cols * cellSize;
  const gridH = rows * cellSize;

  const nearFullWidth = Math.abs(canvasW - gridW) <= 2;

  const offsetX = nearFullWidth ? 0 : Math.floor((canvasW - gridW) / 2);
  const offsetY = 0;

  return { cols, rows, cellSize, gridW, gridH, offsetX, offsetY };
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
 * @param {ReturnType<typeof computeGridLayout>} layout
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
 * @param {ReturnType<typeof computeGridLayout>} layout
 */
function getPlayerRadius(layout) {
  const drawSize = Math.max(6, Math.floor(layout.cellSize * 0.25));
  return Math.max(3, drawSize / 2);
}
