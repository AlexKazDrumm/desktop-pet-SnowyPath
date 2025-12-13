// src/data/routes/map-grid.js

/**
 * Конвертация window.mapPoints (пиксели) -> точки в СЕТКЕ 16x6.
 * Результат: window.mapGridPoints = [{cx,cy}, ...] (0-based)
 */

(function initMapGridPoints() {
  const cols = (typeof window.MAP_GRID_COLS === "number") ? window.MAP_GRID_COLS : 16;
  const rows = (typeof window.MAP_GRID_ROWS === "number") ? window.MAP_GRID_ROWS : 6;

  const pts = Array.isArray(window.mapPoints) ? window.mapPoints : [];
  if (!pts.length) {
    window.mapGridPoints = [];
    return;
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (!p) continue;
    const x = Number(p.x);
    const y = Number(p.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  // fallback если вдруг все одинаковые
  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || minX === maxX) {
    minX = 0; maxX = 1;
  }
  if (!Number.isFinite(minY) || !Number.isFinite(maxY) || minY === maxY) {
    minY = 0; maxY = 1;
  }

  // рабочая область внутри рамки 1 клетка
  const innerCols = Math.max(1, cols - 2);
  const innerRows = Math.max(1, rows - 2);

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  /** @type {{cx:number, cy:number}[]} */
  const out = pts.map((p) => {
    const nx = (Number(p.x) - minX) / (maxX - minX);
    const ny = (Number(p.y) - minY) / (maxY - minY);

    let cx = 1 + Math.round(nx * (innerCols - 1));
    let cy = 1 + Math.round(ny * (innerRows - 1));

    cx = clamp(cx, 0, cols - 1);
    cy = clamp(cy, 0, rows - 1);

    return { cx, cy };
  });

  // resolve collisions (если 2 точки попали в одну клетку)
  const used = new Set();
  for (let i = 0; i < out.length; i++) {
    let { cx, cy } = out[i];
    let key = `${cx},${cy}`;

    if (!used.has(key)) {
      used.add(key);
      continue;
    }

    // пробуем сдвигать вверх/вниз в пределах
    let placed = false;
    for (let d = 1; d <= rows; d++) {
      const cyUp = cy - d;
      if (cyUp >= 0) {
        const k = `${cx},${cyUp}`;
        if (!used.has(k)) {
          cy = cyUp;
          key = k;
          placed = true;
          break;
        }
      }
      const cyDown = cy + d;
      if (cyDown < rows) {
        const k = `${cx},${cyDown}`;
        if (!used.has(k)) {
          cy = cyDown;
          key = k;
          placed = true;
          break;
        }
      }
    }

    // если по y не получилось — двигаем по x
    if (!placed) {
      for (let d = 1; d <= cols; d++) {
        const cxLeft = cx - d;
        if (cxLeft >= 0) {
          const k = `${cxLeft},${cy}`;
          if (!used.has(k)) {
            cx = cxLeft;
            key = k;
            placed = true;
            break;
          }
        }
        const cxRight = cx + d;
        if (cxRight < cols) {
          const k = `${cxRight},${cy}`;
          if (!used.has(k)) {
            cx = cxRight;
            key = k;
            placed = true;
            break;
          }
        }
      }
    }

    out[i] = { cx, cy };
    used.add(key);
  }

  window.mapGridPoints = out;

  window.getMapGridPoint = function getMapGridPoint(index) {
    const i = Math.max(0, Math.min(Number(index) || 0, out.length - 1));
    return out[i];
  };

  window.getMapGridPoints = function getMapGridPoints() {
    return out.slice();
  };
})();
