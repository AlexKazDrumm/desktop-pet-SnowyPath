// src/scenes/map/map-resize.js

function resizeMapCanvas() {
  if (!mapCanvas) return;

  const screen = document.getElementById("screen-map");
  if (!screen) return;

  const rect = screen.getBoundingClientRect();
  const cw = Math.floor(rect.width);
  const ch = Math.floor(rect.height);

  if (!cw || !ch || cw <= 0 || ch <= 0) return;

  const cols = (typeof window.MAP_GRID_COLS === "number") ? window.MAP_GRID_COLS : 16;
  const stageRows = (typeof window.MAP_STAGE_ROWS === "number") ? window.MAP_STAGE_ROWS : 8;

  // pixel-perfect cell size (как stop)
  const cellSize = Math.max(8, Math.floor(Math.min(cw / cols, ch / stageRows)));

  const cssW = cols * cellSize;
  const cssH = stageRows * cellSize;

  mapCanvas.width = cssW;
  mapCanvas.height = cssH;

  const left = Math.max(0, Math.floor((cw - cssW) / 2));

  mapCanvas.style.position = "absolute";
  mapCanvas.style.top = "0px";
  mapCanvas.style.left = `${left}px`;
  mapCanvas.style.right = "auto";
  mapCanvas.style.bottom = "auto";
  mapCanvas.style.width = `${cssW}px`;
  mapCanvas.style.height = `${cssH}px`;

  const ctx = mapCanvas.getContext("2d");
  if (ctx) ctx.imageSmoothingEnabled = false;
}
