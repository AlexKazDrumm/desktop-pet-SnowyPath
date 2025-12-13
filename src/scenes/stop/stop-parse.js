// src/scenes/stop/stop-parse.js

/**
 * Парс ASCII + логика проходимости/вариантов дороги.
 */

/**
 * Здание — любая заглавная буква A-Z, кроме:
 * - C (машина)
 * - символов тайлов (# s . g)
 */
function isBuildingChar(ch) {
  if (!ch) return false;
  if (ch === "C") return false;
  if (isWalkableTileChar(ch)) return false;
  if (ch === " ") return false;
  return /^[A-Z]$/.test(ch);
}

function computeRoadVariant(grid, x, y) {
  const up = isRoadChar(getMapChar(grid, x, y - 1));
  const down = isRoadChar(getMapChar(grid, x, y + 1));
  const left = isRoadChar(getMapChar(grid, x - 1, y));
  const right = isRoadChar(getMapChar(grid, x + 1, y));

  const count = (up ? 1 : 0) + (down ? 1 : 0) + (left ? 1 : 0) + (right ? 1 : 0);

  if (count >= 4) return { variant: "road_cross", rot: 0 };

  if (count === 3) {
    if (!up) return { variant: "road_t", rot: 0 };
    if (!down) return { variant: "road_t", rot: Math.PI };
    if (!left) return { variant: "road_t", rot: Math.PI / 2 };
    return { variant: "road_t", rot: -Math.PI / 2 };
  }

  if (count === 2 && ((up && right) || (right && down) || (down && left) || (left && up))) {
    if (right && down) return { variant: "road_corner", rot: 0 };
    if (up && right) return { variant: "road_corner", rot: -Math.PI / 2 };
    if (left && up) return { variant: "road_corner", rot: Math.PI };
    return { variant: "road_corner", rot: Math.PI / 2 };
  }

  if (count === 2 && ((left && right) || (up && down))) {
    if (left && right) return { variant: "road_straight", rot: 0 };
    return { variant: "road_straight", rot: Math.PI / 2 };
  }

  if (count === 1) {
    if (down) return { variant: "road_end", rot: 0 };
    if (up) return { variant: "road_end", rot: Math.PI };
    if (right) return { variant: "road_end", rot: -Math.PI / 2 };
    return { variant: "road_end", rot: Math.PI / 2 };
  }

  return { variant: "road_end", rot: 0 };
}

/**
 * Парсим ASCII:
 * - здания (прямоугольники по одинаковой букве)
 * - машина (C)
 *
 * @param {ReturnType<typeof getHubGridConfig>} hubCfg
 */
function parseHubAscii(hubCfg) {
  const grid = hubCfg.grid || [];
  const cols = HUB_GRID_COLS;
  const rows = HUB_GRID_ROWS;

  /** @type {boolean[][]} */
  const visited = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));

  /** @type {Array<{char:string; x0:number;y0:number;x1:number;y1:number; type:any; label:string; hint:string; spriteKey:string|null; id:string}>} */
  const buildings = [];

  /** @type {null|{cx:number; cy:number}} */
  let carCell = null;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = getMapChar(grid, x, y);

      if (ch === "C") carCell = { cx: x, cy: y };

      if (!isBuildingChar(ch)) continue;
      if (visited[y][x]) continue;

      const target = ch;
      /** @type {Array<{x:number;y:number}>} */
      const stack = [{ x, y }];
      visited[y][x] = true;

      let minX = x, maxX = x, minY = y, maxY = y;

      while (stack.length) {
        const cur = stack.pop();
        if (!cur) break;

        if (cur.x < minX) minX = cur.x;
        if (cur.x > maxX) maxX = cur.x;
        if (cur.y < minY) minY = cur.y;
        if (cur.y > maxY) maxY = cur.y;

        const neigh = [
          { x: cur.x + 1, y: cur.y },
          { x: cur.x - 1, y: cur.y },
          { x: cur.x, y: cur.y + 1 },
          { x: cur.x, y: cur.y - 1 }
        ];

        for (const n of neigh) {
          if (n.x < 0 || n.x >= cols || n.y < 0 || n.y >= rows) continue;
          if (visited[n.y][n.x]) continue;
          const nc = getMapChar(grid, n.x, n.y);
          if (nc !== target) continue;
          visited[n.y][n.x] = true;
          stack.push(n);
        }
      }

      const meta = (typeof hubBuildingMetaByChar === "object" && hubBuildingMetaByChar)
        ? (hubBuildingMetaByChar[target] || null)
        : null;

      const label = meta && meta.label ? meta.label : "Здание";
      const hint = meta && meta.hint ? meta.hint : "E — осмотреть (ничего полезного).";
      const spriteKey = meta && meta.spriteKey ? meta.spriteKey : null;
      const type = meta && meta.type ? meta.type : "passive";

      buildings.push({
        char: target,
        x0: minX,
        y0: minY,
        x1: maxX,
        y1: maxY,
        type,
        label,
        hint,
        spriteKey,
        id: `${target}_${hubCfg.pointIndex}_${minX}_${minY}_${maxX}_${maxY}`
      });
    }
  }

  return { buildings, carCell };
}

/**
 * Клетка проходима?
 * @param {ReturnType<typeof getHubGridConfig>} hubCfg
 * @param {number} cx
 * @param {number} cy
 */
function isCellWalkable(hubCfg, cx, cy) {
  const ch = getMapChar(hubCfg.grid, cx, cy);
  if (isBuildingChar(ch)) return false;
  if (ch === " ") return false;
  if (ch === "C") return true;
  return isWalkableTileChar(ch) || ch === "#";
}
