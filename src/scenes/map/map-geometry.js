// src/scenes/map/map-geometry.js

function mapClamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

/**
 * Layout для map stage 16x9 (map 16x7 + HUD 16x2)
 * Приоритет: чтобы влезло целочисленно (как stop).
 * offsetY = 0; offsetX центрируется при необходимости.
 */
function computeMapStageLayout(canvasW, canvasH) {
  const cols = (typeof window.MAP_GRID_COLS === "number") ? window.MAP_GRID_COLS : 16;
  const stageRows = (typeof window.MAP_STAGE_ROWS === "number") ? window.MAP_STAGE_ROWS : 9;

  let cellSize = Math.max(8, Math.floor(Math.min(canvasW / cols, canvasH / stageRows)));

  const gridW = cols * cellSize;
  const gridH = stageRows * cellSize;

  const offsetX = Math.max(0, Math.floor((canvasW - gridW) / 2));
  const offsetY = 0;

  const mapRows = (typeof window.MAP_GRID_ROWS === "number") ? window.MAP_GRID_ROWS : 7;
  const uiRows = stageRows - mapRows;

  return {
    cols,
    stageRows,
    mapRows,
    uiRows,
    cellSize,
    gridW,
    gridH,
    offsetX,
    offsetY,
    mapY0: offsetY,
    mapH: mapRows * cellSize,
    hudY0: offsetY + mapRows * cellSize,
    hudH: uiRows * cellSize
  };
}

function deriveMapLayout(stage) {
  return {
    cols: stage.cols,
    rows: stage.mapRows,
    cellSize: stage.cellSize,
    gridW: stage.gridW,
    gridH: stage.mapH,
    offsetX: stage.offsetX,
    offsetY: stage.offsetY
  };
}

function mapCellToRect(cx, cy, layout) {
  const x = layout.offsetX + cx * layout.cellSize;
  const y = layout.offsetY + cy * layout.cellSize;
  const s = layout.cellSize;
  return { x, y, w: s, h: s };
}

function mapCellCenter(cx, cy, layout) {
  const r = mapCellToRect(cx, cy, layout);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

function getMapHudRect(stage) {
  return { x: stage.offsetX, y: stage.hudY0, w: stage.gridW, h: stage.hudH };
}

function mapHudCellsToRect(stage, col0, col1, row0, row1) {
  const cols = stage.cols;
  const uiRows = stage.uiRows;

  const c0 = mapClamp(col0, 1, cols) - 1;
  const c1 = mapClamp(col1, 1, cols) - 1;
  const r0 = mapClamp(row0, 1, uiRows) - 1;
  const r1 = mapClamp(row1, 1, uiRows) - 1;

  const x = stage.offsetX + c0 * stage.cellSize;
  const y = stage.hudY0 + r0 * stage.cellSize;
  const w = (c1 - c0 + 1) * stage.cellSize;
  const h = (r1 - r0 + 1) * stage.cellSize;

  return { x, y, w, h };
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
