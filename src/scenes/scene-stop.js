// src/scenes/scene-stop.js

/**
 * Тайловая сцена "stop":
 * - ASCII-редактор из game-data.js (hubGridConfigs)
 * - повороты дорог + перекрёстки
 * - здания (мультиклетки поддерживаются)
 * - props внутри хаба (мусорка, NPC и т.п.) из hubCfg.props
 * - коллизии (здания непроходимы, props solid — непроходимы)
 * - интеракт по соседству и с машиной
 * - UI: подсказка, название активного объекта, инвентарь (toggle), статы, диалог, toast
 */

const HUB_DEBUG_DRAW_GRID = true;
const STOP_BOTTOM_BAR_MIN_HEIGHT = 172;

let stopInventoryOpen = false;
let stopUiInited = false;

/** локальные флаги сцены (не трогаем глобальный state) */
const stopLocalFlags = {
  introShownAtHub0: false,            // toast-подсказка "выйди из машины"
  hub0ExitHintShown: false,           // toast после выхода "подойди к местному"
  hub0NpcIntroDialogShown: false,     // интро-диалог показан (только по E у NPC)
  trashSearchedOnce: false
};

/** локальное состояние диалога (VN-стиль: реплики -> далее -> выбор) */
let stopDialogState = {
  open: false,

  /** @type {string[]} */
  lines: [],
  lineIndex: 0,

  /** текущая строка для рендера (кеш) */
  text: "",

  /** @type {Array<{id:string; label:string; onPick:()=>void}>} */
  choices: [],

  /** если true — игрок не двигается пока открыт диалог */
  lockMovement: true,

  /** если есть "скрипт" — по закрытию можно повесить обработчик */
  onClose: null
};

let stopToastTimer = 0;

/** защита от двойного интеракта (автоповтор keydown/двойные слушатели) */
let stopInteractCooldown = 0;
const STOP_INTERACT_COOLDOWN_SEC = 0.22;

/**
 * Получить текущий конфиг хаба на сетке
 * @returns {ReturnType<typeof getHubGridConfig>}
 */
function getCurrentHubGridConfig() {
  return getHubGridConfig(state.currentPointIndex || 0);
}

/**
 * Вычисление параметров сетки в пикселях.
 * ПРИОРИТЕТ: занять всю ширину (если помещается по высоте).
 * СЕТКА ВСЕГДА ПРИБИТА К ВЕРХУ (offsetY = 0).
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

  // если по высоте НЕ помещается — уходим в "вписать"
  if (gridHByWidth > canvasH) {
    cellSize = Math.max(8, Math.floor(Math.min(canvasW / cols, canvasH / rows)));
  }

  const gridW = cols * cellSize;
  const gridH = rows * cellSize;

  const nearFullWidth = Math.abs(canvasW - gridW) <= 2;

  const offsetX = nearFullWidth ? 0 : Math.floor((canvasW - gridW) / 2);
  const offsetY = 0; // важно: прибиваем к верху

  return { cols, rows, cellSize, gridW, gridH, offsetX, offsetY };
}

function isRoadChar(ch) { return ch === "#"; }
function isSidewalkChar(ch) { return ch === "s"; }
function isSnowChar(ch) { return ch === "."; }
function isGrassChar(ch) { return ch === "g"; }

function isWalkableTileChar(ch) {
  return isRoadChar(ch) || isSidewalkChar(ch) || isSnowChar(ch) || isGrassChar(ch);
}

/**
 * Здание — любая заглавная буква A-Z, кроме:
 * - C (машина)
 * - символов тайлов (# s . g)
 * Это позволяет добавлять новые здания без правок кода (B, X, Y, ...).
 */
function isBuildingChar(ch) {
  if (!ch) return false;
  if (ch === "C") return false;
  if (isWalkableTileChar(ch)) return false;
  if (ch === " ") return false;
  return /^[A-Z]$/.test(ch);
}

/**
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

/**
 * @param {string} themeKey
 * @param {string} baseKey
 */
function getThemedSprite(themeKey, baseKey) {
  const themedKey = themeKey ? `${themeKey}_${baseKey}` : baseKey;
  const themed = sprites[themedKey];
  if (themed && themed.complete && themed.naturalWidth > 0) return { key: themedKey, img: themed };
  const generic = sprites[baseKey];
  if (generic && generic.complete && generic.naturalWidth > 0) return { key: baseKey, img: generic };
  return { key: baseKey, img: null };
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
 * - здания (прямоугольники по одинаковой букве) — мультиклетки поддерживаются
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

      // ВАЖНО: безопасные дефолты
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

function isNearCar(car) {
  const px = state.hub.x;
  const py = state.hub.y;
  return (
    px >= car.interactX &&
    px <= car.interactX + car.interactW &&
    py >= car.interactY &&
    py <= car.interactY + car.interactH
  );
}

function collidesWithCar(px, py, car) {
  return (
    px >= car.x &&
    px <= car.x + car.w &&
    py >= car.y &&
    py <= car.y + car.h
  );
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
 * Получить текущий спрайт машины персонажа (fallback на общий sprites.car)
 */
function getSelectedCarSprite() {
  const cfg = (typeof getCharacterById === "function")
    ? getCharacterById(state.selectedCharacterId || "tourist")
    : null;

  if (cfg && cfg.carSpriteKey && sprites && sprites[cfg.carSpriteKey]) {
    const img = sprites[cfg.carSpriteKey];
    if (img && img.complete && img.naturalWidth > 0) return img;
  }

  return sprites ? sprites.car : null;
}

/**
 * Машина: по высоте <= 50% клетки.
 * @param {{cx:number;cy:number}} carCell
 * @param {ReturnType<typeof computeGridLayout>} layout
 */
function computeHubCarFromCell(carCell, layout) {
  if (!carCell) return null;
  const r = cellToRect(carCell.cx, carCell.cy, layout);

  const cell = layout.cellSize;
  const inset = Math.max(2, Math.floor(cell * 0.10));

  const boxX = r.x + inset;
  const boxW = r.w - inset * 2;

  const boxH = Math.floor(r.h * 0.50);
  const boxY = r.y + (r.h - boxH) / 2;

  const carSprite = getSelectedCarSprite();
  const fitted = fitSpriteInBox(carSprite, boxX, boxY, boxW, boxH);

  const padding = Math.max(6, cell * 0.18);
  const interactX = fitted.x - padding;
  const interactY = fitted.y - padding;
  const interactW = fitted.w + padding * 2;
  const interactH = fitted.h + padding * 2;

  return {
    x: fitted.x,
    y: fitted.y,
    w: fitted.w,
    h: fitted.h,
    interactX,
    interactY,
    interactW,
    interactH,
    cellCx: carCell.cx,
    cellCy: carCell.cy
  };
}

/**
 * Здания:
 * - спрайт вписываем в bbox здания с padding 10% от клетки
 * - актив-зона: ПОД зданием:
 *   берём клетку(и) непосредственно под зданием (y1+1) и используем верхние 15% высоты этой клетки
 *
 * @param {ReturnType<typeof computeGridLayout>} layout
 * @param {ReturnType<typeof parseHubAscii>["buildings"]} buildings
 */
function computeHubBuildingsFromCells(layout, buildings) {
  const res = [];

  for (const b of buildings) {
    const x0 = b.x0, y0 = b.y0, x1 = b.x1, y1 = b.y1;
    const cell = layout.cellSize;

    const boxX = layout.offsetX + x0 * cell;
    const boxY = layout.offsetY + y0 * cell;
    const boxW = (x1 - x0 + 1) * cell;
    const boxH = (y1 - y0 + 1) * cell;

    const inset = Math.max(2, Math.floor(cell * 0.10));
    const innerX = boxX + inset;
    const innerY = boxY + inset;
    const innerW = boxW - inset * 2;
    const innerH = boxH - inset * 2;

    const spriteKey = b.spriteKey || null;
    const sprite = spriteKey ? sprites[spriteKey] : null;

    const fitted = sprite
      ? fitSpriteInBox(sprite, innerX, innerY, innerW, innerH)
      : { x: innerX, y: innerY, w: innerW, h: innerH };

    const belowRow = y1 + 1;
    const hasBelowCell = belowRow >= 0 && belowRow < layout.rows;

    let interactX = 0;
    let interactY = 0;
    let interactW = 0;
    let interactH = 0;

    if (hasBelowCell) {
      const belowY = layout.offsetY + belowRow * cell;
      interactX = boxX;
      interactY = belowY;
      interactW = boxW;
      interactH = Math.max(6, Math.floor(cell * 0.15));
    }

    res.push({
      id: b.id,
      type: b.type,
      label: b.label,
      hint: b.hint,
      spriteKey,
      x: fitted.x,
      y: fitted.y,
      w: fitted.w,
      h: fitted.h,
      cellX0: x0,
      cellY0: y0,
      cellX1: x1,
      cellY1: y1,
      interactX,
      interactY,
      interactW,
      interactH,
      bboxX: boxX,
      bboxY: boxY,
      bboxW: boxW,
      bboxH: boxH
    });
  }

  return res;
}

/**
 * Props внутри хаба (субклеточные объекты) из hubCfg.props
 * + поддержка angle/dir (поворот NPC/prop)
 *
 * @param {ReturnType<typeof getHubGridConfig>} hubCfg
 * @param {ReturnType<typeof computeGridLayout>} layout
 */
function computeHubProps(hubCfg, layout) {
  const list = Array.isArray(hubCfg.props) ? hubCfg.props : [];
  const res = [];

  for (const p of list) {
    if (typeof p.cx !== "number" || typeof p.cy !== "number") continue;
    const relX = typeof p.relX === "number" ? p.relX : 0;
    const relY = typeof p.relY === "number" ? p.relY : 0;
    const relW = typeof p.relW === "number" ? p.relW : 1;
    const relH = typeof p.relH === "number" ? p.relH : 1;

    const r = cellToSubRect(p.cx, p.cy, layout, relX, relY, relW, relH);

    let angle = 0;
    if (typeof p.angleRad === "number") angle = p.angleRad;
    else if (typeof p.angleDeg === "number") angle = (p.angleDeg * Math.PI) / 180;
    else if (typeof p.dir === "string") {
      if (p.dir === "right") angle = 0;
      else if (p.dir === "down") angle = Math.PI / 2;
      else if (p.dir === "left") angle = Math.PI;
      else if (p.dir === "up") angle = -Math.PI / 2;
    }

    if (p.snap8) angle = snapAngleTo8Directions(angle);

    res.push({
      id: String(p.id || `prop_${p.cx}_${p.cy}_${relX}_${relY}`),
      kind: p.kind || "prop",
      label: p.label || "",
      hint: p.hint || "",
      cx: p.cx,
      cy: p.cy,
      spriteKey: p.spriteKey || null,
      solid: !!p.solid,
      angle,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h
    });
  }

  return res;
}

function isNearPOI(poi) {
  if (!poi || poi.interactW <= 0 || poi.interactH <= 0) return false;
  const px = state.hub.x;
  const py = state.hub.y;
  return (
    px >= poi.interactX &&
    px <= poi.interactX + poi.interactW &&
    py >= poi.interactY &&
    py <= poi.interactY + poi.interactH
  );
}

function isNearProp(p) {
  const px = state.hub.x;
  const py = state.hub.y;

  const padX = Math.max(6, p.w * 0.45);
  const padY = Math.max(6, p.h * 0.55);

  return pointInRect(px, py, {
    x: p.x - padX,
    y: p.y - padY,
    w: p.w + padX * 2,
    h: p.h + padY * 2
  });
}

function drawTile(ctx, img, x, y, s) {
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, y, s, s);
  } else {
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(x, y, s, s);
  }
}

function drawRotatedTile(ctx, img, x, y, s, rot) {
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2);
    ctx.rotate(rot);
    ctx.drawImage(img, -s / 2, -s / 2, s, s);
    ctx.restore();
  } else {
    ctx.fillStyle = "#111827";
    ctx.fillRect(x, y, s, s);
  }
}

function drawRotatedSprite(ctx, img, x, y, w, h, angle) {
  if (!img || !img.complete || img.naturalWidth <= 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(250,204,21,0.6)";
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
    return;
  }
  if (!angle) {
    ctx.drawImage(img, x, y, w, h);
    return;
  }
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/**
 * Вычислить "радиус" игрока для коллизий/спавна
 * @param {ReturnType<typeof computeGridLayout>} layout
 */
function getPlayerRadius(layout) {
  const drawSize = Math.max(6, Math.floor(layout.cellSize * 0.25));
  return Math.max(3, drawSize / 2);
}

/**
 * Проверка "точка стояния" валидна:
 * - в пределах сетки
 * - попадает в walkable клетку
 * - не коллизится с машиной
 * - не попадает в solid props
 */
function isValidStandPoint(hubCfg, layout, x, y, car, props) {
  const cell = pixelToCell(x, y, layout);
  if (cell.cx < 0 || cell.cx >= layout.cols || cell.cy < 0 || cell.cy >= layout.rows) return false;
  if (!isCellWalkable(hubCfg, cell.cx, cell.cy)) return false;
  if (car && collidesWithCar(x, y, car)) return false;

  if (Array.isArray(props)) {
    for (const p of props) {
      if (!p.solid) continue;
      if (pointInRect(x, y, p)) return false;
    }
  }

  return true;
}

/* ===== UI helpers ===== */

function setStopObjectTitle(text) {
  const el = qid("stopObjectTitle");
  if (!el) return;
  el.textContent = text || "";
}

function setStopHint(text) {
  const el = qid("stopHint");
  if (!el) return;
  el.textContent = text || "";
}

function ensureStopToastEl() {
  const root = qid("screen-stop");
  if (!root) return null;

  let el = qid("stopToast");
  if (el) return el;

  el = document.createElement("div");
  el.id = "stopToast";
  el.className = "stop-toast hidden";
  root.appendChild(el);

  return el;
}

function showStopToast(text, kind) {
  const el = ensureStopToastEl();
  if (!el) return;

  el.textContent = String(text || "");
  el.classList.remove("hidden");

  el.classList.remove("good", "bad", "info");
  if (kind === "good") el.classList.add("good");
  else if (kind === "bad") el.classList.add("bad");
  else el.classList.add("info");

  stopToastTimer = 2.2;
}

function hideStopToast() {
  const el = qid("stopToast");
  if (!el) return;
  el.classList.add("hidden");
  el.textContent = "";
  stopToastTimer = 0;
}

/* ===== VN dialog engine ===== */

function openStopDialogVN(lines, choices, opts) {
  const safeLines = Array.isArray(lines) ? lines.map((x) => String(x ?? "")) : [String(lines ?? "")];

  stopDialogState.open = true;
  stopDialogState.lines = safeLines.filter((x) => x.length > 0);
  if (!stopDialogState.lines.length) stopDialogState.lines = [""];
  stopDialogState.lineIndex = 0;
  stopDialogState.text = stopDialogState.lines[0] || "";
  stopDialogState.choices = Array.isArray(choices) ? choices : [];
  stopDialogState.lockMovement = opts && typeof opts.lockMovement === "boolean" ? opts.lockMovement : true;
  stopDialogState.onClose = opts && typeof opts.onClose === "function" ? opts.onClose : null;

  renderStopDialog();
}

function closeStopDialog() {
  const onClose = stopDialogState.onClose;

  stopDialogState.open = false;
  stopDialogState.lines = [];
  stopDialogState.lineIndex = 0;
  stopDialogState.text = "";
  stopDialogState.choices = [];
  stopDialogState.lockMovement = true;
  stopDialogState.onClose = null;

  renderStopDialog();

  if (onClose) {
    try { onClose(); } catch (e) { console.error(e); }
  }
}

function advanceStopDialog() {
  if (!stopDialogState.open) return;

  const hasMore = stopDialogState.lineIndex < stopDialogState.lines.length - 1;
  if (hasMore) {
    stopDialogState.lineIndex += 1;
    stopDialogState.text = stopDialogState.lines[stopDialogState.lineIndex] || "";
    renderStopDialog();
    return;
  }

  if (stopDialogState.choices && stopDialogState.choices.length) {
    return;
  }

  closeStopDialog();
}

function renderStopDialog() {
  const dlg = qid("stopDialog");
  const txt = qid("stopDialogText");
  const chs = qid("stopDialogChoices");
  if (!dlg || !txt || !chs) return;

  if (!stopDialogState.open) {
    dlg.classList.add("hidden");
    txt.textContent = "";
    chs.innerHTML = "";
    return;
  }

  dlg.classList.remove("hidden");
  txt.textContent = stopDialogState.text;

  chs.innerHTML = "";

  const hasMore = stopDialogState.lineIndex < stopDialogState.lines.length - 1;
  if (hasMore) {
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "primary";
    nextBtn.textContent = "Далее";
    nextBtn.addEventListener("click", () => advanceStopDialog());
    chs.appendChild(nextBtn);
  }

  const isLastLine = stopDialogState.lineIndex >= stopDialogState.lines.length - 1;
  if (isLastLine && stopDialogState.choices && stopDialogState.choices.length) {
    for (const c of stopDialogState.choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "primary";
      btn.textContent = c.label;
      btn.addEventListener("click", () => {
        try { c.onPick && c.onPick(); } catch (e) { console.error(e); }
      });
      chs.appendChild(btn);
    }
  }
}

/* ===== inventory ===== */

function toggleInventoryUI(force) {
  if (typeof force === "boolean") stopInventoryOpen = force;
  else stopInventoryOpen = !stopInventoryOpen;

  const panel = qid("inventoryPanel");
  const btn = qid("btnToggleInventory");
  if (!panel || !btn) return;

  if (stopInventoryOpen) {
    panel.style.display = "flex";
    btn.textContent = "Инвентарь (I) ▴";
  } else {
    panel.style.display = "none";
    btn.textContent = "Инвентарь (I) ▾";
  }
}

function renderInventoryUI() {
  const panel = qid("inventoryPanel");
  if (!panel) return;

  const inv = Array.isArray(state.inventory) ? state.inventory : [];

  panel.innerHTML = "";

  if (!inv.length) {
    const empty = document.createElement("div");
    empty.className = "inventory-empty";
    empty.textContent = "Пусто";
    panel.appendChild(empty);
    return;
  }

  for (const it of inv) {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "inventory-slot";
    slot.title = `${it.name || it.id || "Предмет"}${it.description ? ` — ${it.description}` : ""}`;

    const iconWrap = document.createElement("div");
    iconWrap.className = "inventory-slot-iconwrap";

    const icon = document.createElement("img");
    icon.className = "inventory-icon";
    icon.alt = it.name || it.id || "item";
    icon.width = 24;
    icon.height = 24;
    icon.style.imageRendering = "pixelated";
    if (it.iconKey && sprites[it.iconKey]) {
      icon.src = sprites[it.iconKey].src;
    }
    iconWrap.appendChild(icon);

    const name = document.createElement("div");
    name.className = "inventory-slot-name";
    name.textContent = it.name || it.id || "Предмет";

    slot.appendChild(iconWrap);
    slot.appendChild(name);

    panel.appendChild(slot);
  }
}

/* ===== dialogs wiring helpers (from StopDialogs) ===== */

function openHub0NpcIntroDialog() {
  const D = window.StopDialogs;

  if (!D || typeof D.hub0Intro !== "function") {
    openStopDialogVN(
      ["Местный: “Привет.”", "“Следи за ресурсами.”"],
      [{ id: "ok", label: "Ок", onPick: () => closeStopDialog() }],
      { lockMovement: true }
    );
    return;
  }

  const intro = D.hub0Intro();
  openStopDialogVN(
    intro.lines,
    [
      {
        id: "tips",
        label: "Дай конкретику",
        onPick: () => {
          const concrete = D.hub0IntroConcrete();
          openStopDialogVN(
            concrete.lines,
            concrete.choices.map((c) => ({
              id: c.id,
              label: c.label,
              onPick: () => closeStopDialog()
            })),
            { lockMovement: true }
          );
        }
      },
      { id: "bye", label: "Ок", onPick: () => closeStopDialog() }
    ],
    { lockMovement: true }
  );
}

function openNpcGenericDialog() {
  const D = window.StopDialogs;

  const root = D && typeof D.npcGenericRoot === "function" ? D.npcGenericRoot() : null;
  const about = D && typeof D.npcAboutPlace === "function" ? D.npcAboutPlace() : null;
  const mech = D && typeof D.npcMechanicsShort === "function" ? D.npcMechanicsShort() : null;
  const danger = D && typeof D.npcAboutHitchhikers === "function" ? D.npcAboutHitchhikers() : null;

  if (!root) {
    openStopDialogVN(
      ["Местный: “Привет.”"],
      [{ id: "ok", label: "Ок", onPick: () => closeStopDialog() }],
      { lockMovement: true }
    );
    return;
  }

  openStopDialogVN(
    root.lines,
    [
      {
        id: "about",
        label: "Что за место?",
        onPick: () => {
          if (!about) {
            closeStopDialog();
            return;
          }
          openStopDialogVN(
            about.lines,
            [
              {
                id: "tips2",
                label: "Ок, а по механикам?",
                onPick: () => {
                  if (!mech) {
                    closeStopDialog();
                    return;
                  }
                  openStopDialogVN(
                    mech.lines,
                    [{ id: "ok", label: "Понял", onPick: () => closeStopDialog() }],
                    { lockMovement: true }
                  );
                }
              },
              { id: "bye", label: "Уйти", onPick: () => closeStopDialog() }
            ],
            { lockMovement: true }
          );
        }
      },
      {
        id: "danger",
        label: "Про попутчиков?",
        onPick: () => {
          if (!danger) {
            closeStopDialog();
            return;
          }
          openStopDialogVN(
            danger.lines,
            [{ id: "ok", label: "Ясно", onPick: () => closeStopDialog() }],
            { lockMovement: true }
          );
        }
      },
      { id: "bye0", label: "Уйти", onPick: () => closeStopDialog() }
    ],
    { lockMovement: true }
  );
}

function openTrashDialogFirst() {
  const D = window.StopDialogs;
  const t = D && typeof D.trashFirstTime === "function" ? D.trashFirstTime() : null;

  openStopDialogVN(
    t ? t.lines : ["Ты роешься в мусорке.", "Находка!"],
    [{ id: "take", label: "Забрать", onPick: () => closeStopDialog() }],
    { lockMovement: true }
  );
}

function openTrashDialogAgain() {
  const D = window.StopDialogs;
  const t = D && typeof D.trashAgain === "function" ? D.trashAgain() : null;

  openStopDialogVN(
    t ? t.lines : ["Ничего полезного."],
    [{ id: "ok", label: "Ладно", onPick: () => closeStopDialog() }],
    { lockMovement: true }
  );
}

/* ===== main render ===== */

function renderStopHub(dt) {
  if (!stopCtx || !stopCanvas) return;

  if (!stopUiInited) {
    initStopSceneUI();
    stopUiInited = true;
  }

  if (stopToastTimer > 0) {
    stopToastTimer -= dt;
    if (stopToastTimer <= 0) hideStopToast();
  }

  if (stopInteractCooldown > 0) {
    stopInteractCooldown -= dt;
    if (stopInteractCooldown < 0) stopInteractCooldown = 0;
  }

  const ctx = stopCtx;
  const w = stopCanvas.width;
  const h = stopCanvas.height;

  const hubCfg = getCurrentHubGridConfig();
  const layout = computeGridLayout(w, h);

  if (!hubCfg || !hubCfg.grid || hubCfg.grid.length !== layout.rows) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, w, h);
    return;
  }

  const parsed = parseHubAscii(hubCfg);
  const buildings = computeHubBuildingsFromCells(layout, parsed.buildings);
  const car = computeHubCarFromCell(parsed.carCell, layout);
  const props = computeHubProps(hubCfg, layout);

  // при смене точки — спавним в машине
  if (state.hub.hubPointIndex !== hubCfg.pointIndex) {
    if (car) {
      state.hub.x = car.x + car.w / 2;
      state.hub.y = car.y + car.h / 2;
      state.hub.inCar = true;
    } else {
      state.hub.x = layout.offsetX + layout.gridW / 2;
      state.hub.y = layout.offsetY + layout.gridH / 2;
      state.hub.inCar = false;
    }
    state.hub.hubPointIndex = hubCfg.pointIndex;

    state.hub.xNorm = (state.hub.x - layout.offsetX) / layout.gridW;
    state.hub.yNorm = (state.hub.y - layout.offsetY) / layout.gridH;

    stopLocalFlags.hub0ExitHintShown = false;
  }

  const isHub0 = (hubCfg.pointIndex === 0);

  if (isHub0 && !stopLocalFlags.introShownAtHub0 && state.hub.inCar) {
    stopLocalFlags.introShownAtHub0 = true;
    showStopToast("Нажми E у машины, чтобы выйти. Рядом местный — он объяснит правила.", "info");
  }

  if (isHub0 && !stopLocalFlags.hub0ExitHintShown && !state.hub.inCar) {
    stopLocalFlags.hub0ExitHintShown = true;
    showStopToast("Подойди к местному у заправки и нажми E, чтобы поговорить.", "info");
  }

  const movementLocked = stopDialogState.open && stopDialogState.lockMovement;

  const speed = state.hub.speed;
  let vx = 0;
  let vy = 0;

  if (!state.hub.inCar && !movementLocked) {
    if (keysPressed["KeyW"] || keysPressed["ArrowUp"]) vy -= 1;
    if (keysPressed["KeyS"] || keysPressed["ArrowDown"]) vy += 1;
    if (keysPressed["KeyA"] || keysPressed["ArrowLeft"]) vx -= 1;
    if (keysPressed["KeyD"] || keysPressed["ArrowRight"]) vx += 1;
  }

  const prevX = state.hub.x;
  const prevY = state.hub.y;

  if (vx !== 0 || vy !== 0) {
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    vx /= len;
    vy /= len;

    state.hub.x += vx * speed * dt;
    state.hub.y += vy * speed * dt;

    state.hub.dirX = vx;
    state.hub.dirY = vy;
    state.hub.angle = snapAngleTo8Directions(Math.atan2(vy, vx));
  }

  const margin = Math.max(6, Math.floor(layout.cellSize * 0.20));
  const minX = layout.offsetX + margin;
  const maxX = layout.offsetX + layout.gridW - margin;
  const minY = layout.offsetY + margin;
  const maxY = layout.offsetY + layout.gridH - margin;

  state.hub.x = clamp(state.hub.x, minX, maxX);
  state.hub.y = clamp(state.hub.y, minY, maxY);

  const cell = pixelToCell(state.hub.x, state.hub.y, layout);

  if (cell.cx < 0 || cell.cx >= layout.cols || cell.cy < 0 || cell.cy >= layout.rows) {
    state.hub.x = prevX;
    state.hub.y = prevY;
  } else {
    if (!state.hub.inCar) {
      const walkable = isCellWalkable(hubCfg, cell.cx, cell.cy);
      if (!walkable) {
        state.hub.x = prevX;
        state.hub.y = prevY;
      }
    }
  }

  if (!state.hub.inCar && car && collidesWithCar(state.hub.x, state.hub.y, car)) {
    state.hub.x = prevX;
    state.hub.y = prevY;
  }

  if (!state.hub.inCar && props && props.length) {
    for (const p of props) {
      if (!p.solid) continue;
      if (pointInRect(state.hub.x, state.hub.y, p)) {
        state.hub.x = prevX;
        state.hub.y = prevY;
        break;
      }
    }
  }

  state.hub.xNorm = (state.hub.x - layout.offsetX) / layout.gridW;
  state.hub.yNorm = (state.hub.y - layout.offsetY) / layout.gridH;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, w, h);

  const themeKey = hubCfg.themeKey || "";

  for (let y = 0; y < layout.rows; y++) {
    for (let x = 0; x < layout.cols; x++) {
      const ch = getMapChar(hubCfg.grid, x, y);
      const r = cellToRect(x, y, layout);

      let tileBase = "tile_snow";
      if (isSidewalkChar(ch)) tileBase = "tile_sidewalk";
      if (isGrassChar(ch)) tileBase = "tile_grass";
      if (isSnowChar(ch)) tileBase = "tile_snow";
      if (isRoadChar(ch)) tileBase = "tile_sidewalk";

      const baseSpr = getThemedSprite(themeKey, tileBase);
      drawTile(ctx, baseSpr.img, r.x, r.y, r.w);

      if (isRoadChar(ch)) {
        const rv = computeRoadVariant(hubCfg.grid, x, y);
        const roadSpr = getThemedSprite(themeKey, rv.variant);
        drawRotatedTile(ctx, roadSpr.img, r.x, r.y, r.w, rv.rot);
      }
    }
  }

  if (HUB_DEBUG_DRAW_GRID) {
    ctx.save();
    ctx.strokeStyle = "rgba(148,163,184,0.55)";
    ctx.lineWidth = 1;
    for (let y = 0; y <= layout.rows; y++) {
      const yy = layout.offsetY + y * layout.cellSize;
      ctx.beginPath();
      ctx.moveTo(layout.offsetX, yy);
      ctx.lineTo(layout.offsetX + layout.gridW, yy);
      ctx.stroke();
    }
    for (let x = 0; x <= layout.cols; x++) {
      const xx = layout.offsetX + x * layout.cellSize;
      ctx.beginPath();
      ctx.moveTo(xx, layout.offsetY);
      ctx.lineTo(xx, layout.offsetY + layout.gridH);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (props && props.length) {
    for (const p of props) {
      const img = p.spriteKey ? sprites[p.spriteKey] : null;
      drawRotatedSprite(ctx, img, p.x, p.y, p.w, p.h, p.angle || 0);
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let currentHint = "";
  let currentTitle = "";

  buildings.forEach((poi) => {
    const isInsideBand = isNearPOI(poi);

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "rgba(148,163,184,0.9)";
    ctx.lineWidth = 1;
    if (poi.interactW > 0 && poi.interactH > 0) {
      ctx.strokeRect(poi.interactX, poi.interactY, poi.interactW, poi.interactH);
    }
    ctx.restore();

    if (isInsideBand && !state.hub.inCar && poi.interactW > 0 && poi.interactH > 0) {
      ctx.fillStyle = "rgba(34,197,94,0.16)";
      ctx.fillRect(poi.interactX, poi.interactY, poi.interactW, poi.interactH);
    }

    const sprite = poi.spriteKey ? sprites[poi.spriteKey] : null;
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, poi.x, poi.y, poi.w, poi.h);
    } else {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(poi.x, poi.y, poi.w, poi.h);
    }

    const labelX = poi.bboxX + poi.bboxW / 2;
    const labelY = poi.bboxY + poi.bboxH + Math.max(6, Math.floor(layout.cellSize * 0.12));

    ctx.font = "13px system-ui";
    ctx.fillStyle = "#e5e7eb";
    ctx.textBaseline = "top";
    ctx.fillText(poi.label, labelX, labelY);

    if (isInsideBand && !state.hub.inCar) {
      currentHint = poi.hint;
      currentTitle = poi.label;
    }
  });

  if (!state.hub.inCar && props && props.length) {
    const nearProp = props.find((p) => isNearProp(p));
    if (nearProp) {
      ctx.save();
      ctx.fillStyle = "rgba(34,197,94,0.14)";
      ctx.fillRect(nearProp.x, nearProp.y, nearProp.w, nearProp.h);
      ctx.restore();

      if (nearProp.label) currentTitle = nearProp.label;
      if (nearProp.hint) currentHint = nearProp.hint;
    }
  }

  if (car) {
    const carSprite = getSelectedCarSprite();
    if (carSprite && carSprite.complete && carSprite.naturalWidth > 0) {
      ctx.drawImage(carSprite, car.x, car.y, car.w, car.h);
    } else {
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(car.x, car.y, car.w, car.h);
    }

    if (isNearCar(car)) {
      currentTitle = "Машина";
      currentHint = state.hub.inCar ? "E — выйти из машины" : "E — сесть в машину";
    }
  }

  if (!state.hub.inCar) {
    const px = state.hub.x;
    const py = state.hub.y;

    const drawSize = Math.max(6, Math.floor(layout.cellSize * 0.25));
    const playerSprite = sprites.player;
    const angle = state.hub.angle ?? -Math.PI / 2;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);

    if (playerSprite && playerSprite.complete && playerSprite.naturalWidth > 0) {
      ctx.drawImage(playerSprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    } else {
      ctx.fillStyle = "#f97316";
      ctx.fillRect(-drawSize / 2, -drawSize / 2, drawSize, drawSize);
    }

    ctx.restore();
  }

  setStopObjectTitle(currentTitle);

  if (currentHint) {
    setStopHint(currentHint);
  } else {
    setStopHint(
      (state.hub.inCar
        ? "Подойди к машине и нажми E, чтобы выйти. M — открыть карту маршрута."
        : "Зайди в зону под зданием (тонкая полоса) и нажми E. M — открыть карту маршрута.")
    );
  }
}

/* ===== interactions ===== */

function handleHubInteract() {
  if (!stopCanvas) return;

  // анти-даблклик / анти-автоповтор
  if (stopInteractCooldown > 0) return;
  stopInteractCooldown = STOP_INTERACT_COOLDOWN_SEC;

  if (stopDialogState.open) {
    const hasMore = stopDialogState.lineIndex < stopDialogState.lines.length - 1;
    const hasChoices = stopDialogState.choices && stopDialogState.choices.length;
    if (hasMore) {
      advanceStopDialog();
      return;
    }
    if (!hasChoices) {
      closeStopDialog();
      return;
    }
    return;
  }

  const hubCfg = getCurrentHubGridConfig();
  const layout = computeGridLayout(stopCanvas.width, stopCanvas.height);
  const parsed = parseHubAscii(hubCfg);

  const buildings = computeHubBuildingsFromCells(layout, parsed.buildings);
  const car = computeHubCarFromCell(parsed.carCell, layout);
  const props = computeHubProps(hubCfg, layout);

  const nearCar = car ? isNearCar(car) : false;

  // ===== машина =====
  if (nearCar && car) {
    if (state.hub.inCar) {
      const rPlayer = getPlayerRadius(layout);
      const gap = Math.max(3, Math.floor(layout.cellSize * 0.08));

      const candidates = [
        { name: "right", x: car.x + car.w + gap + rPlayer, y: car.y + car.h / 2 },
        { name: "left",  x: car.x - gap - rPlayer,        y: car.y + car.h / 2 },
        { name: "down",  x: car.x + car.w / 2,            y: car.y + car.h + gap + rPlayer },
        { name: "up",    x: car.x + car.w / 2,            y: car.y - gap - rPlayer }
      ];

      let chosen = null;

      for (const c of candidates) {
        if (!isValidStandPoint(hubCfg, layout, c.x, c.y, car, props)) continue;
        chosen = { x: c.x, y: c.y };
        break;
      }

      if (!chosen) {
        const carCell = parsed.carCell;

        if (carCell) {
          const neighbors = [
            { cx: carCell.cx + 1, cy: carCell.cy, dir: "right" },
            { cx: carCell.cx - 1, cy: carCell.cy, dir: "left" },
            { cx: carCell.cx, cy: carCell.cy + 1, dir: "down" },
            { cx: carCell.cx, cy: carCell.cy - 1, dir: "up" }
          ];

          for (const n of neighbors) {
            if (n.cx < 0 || n.cx >= layout.cols || n.cy < 0 || n.cy >= layout.rows) continue;
            if (!isCellWalkable(hubCfg, n.cx, n.cy)) continue;

            const rr = cellToRect(n.cx, n.cy, layout);

            let x = rr.x + rr.w / 2;
            let y = rr.y + rr.h / 2;

            const edgePad = Math.max(3, Math.floor(layout.cellSize * 0.12));

            if (n.dir === "right") x = rr.x + edgePad;
            if (n.dir === "left")  x = rr.x + rr.w - edgePad;
            if (n.dir === "down")  y = rr.y + edgePad;
            if (n.dir === "up")    y = rr.y + rr.h - edgePad;

            if (!isValidStandPoint(hubCfg, layout, x, y, car, props)) continue;

            chosen = { x, y };
            break;
          }
        }
      }

      if (!chosen) {
        chosen = { x: car.x + car.w / 2, y: car.y + car.h + Math.max(6, layout.cellSize * 0.2) };
      }

      state.hub.inCar = false;
      state.hub.x = chosen.x;
      state.hub.y = chosen.y;
    } else {
      state.hub.inCar = true;
      state.hub.x = car.x + car.w / 2;
      state.hub.y = car.y + car.h / 2;
    }
    return;
  }

  if (state.hub.inCar) return;

  // ===== props (мусорка / NPC) =====
  if (props && props.length) {
    const nearProp = props.find((p) => isNearProp(p));
    if (nearProp) {
      if (nearProp.id === "trash_near_cafe" || nearProp.kind === "trash") {
        if (!stopLocalFlags.trashSearchedOnce) {
          stopLocalFlags.trashSearchedOnce = true;

          const found = {
            id: "rotten_sandwich",
            name: "Испорченный сэндвич",
            iconKey: "item_rotten_sandwich",
            description: "Пахнет ужасно. Но это еда… наверное."
          };

          state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
          const exists = state.inventory.some((x) => x && x.id === found.id);
          if (!exists) state.inventory.push(found);

          renderInventoryUI();

          showStopToast("Найден предмет: Испорченный сэндвич", "good");
          openTrashDialogFirst();
        } else {
          showStopToast("Ничего полезного.", "info");
          openTrashDialogAgain();
        }
        return;
      }

      if (nearProp.id === "npc_instructor_gas" || nearProp.kind === "npc") {
        const isHub0 = (hubCfg.pointIndex === 0);

        if (isHub0 && !stopLocalFlags.hub0NpcIntroDialogShown) {
          stopLocalFlags.hub0NpcIntroDialogShown = true;
          showStopToast("Разговор", "info");
          openHub0NpcIntroDialog();
          return;
        }

        showStopToast("Разговор", "info");
        openNpcGenericDialog();
        return;
      }

      if (nearProp.hint) {
        openStopDialogVN([nearProp.hint], [
          { id: "ok", label: "Ок", onPick: () => closeStopDialog() }
        ]);
        return;
      }
    }
  }

  // ===== здания =====
  const nearPoi = buildings.find((b) => isNearPOI(b));
  if (!nearPoi) return;

  if (nearPoi.type === "gas") {
    const amount = 10;
    const cost = amount * 1;
    if (state.money < cost) {
      showStopToast("Не хватает денег.", "bad");
      alert("Недостаточно денег для покупки топлива.");
      return;
    }
    adjustResources({ fuel: amount, money: -cost });
    showStopToast("+10 топлива", "good");
    renderStats();
    return;
  }

  if (nearPoi.type === "food") {
    const cost = 10;
    if (state.money < cost) {
      showStopToast("Не хватает денег.", "bad");
      alert("Недостаточно денег для еды.");
      return;
    }
    adjustResources({ money: -cost, hunger: 40 });
    showStopToast("+40 сытости", "good");
    renderStats();
    return;
  }

  if (nearPoi.type === "hotel") {
    const cost = 25;
    if (state.money < cost) {
      showStopToast("Не хватает денег.", "bad");
      alert("Недостаточно денег на гостиницу.");
      return;
    }
    state.money -= cost;
    state.fatigue = 100;
    state.hunger = clamp(state.hunger - 10, 0, 100);
    if (checkFailConditions()) return;
    showStopToast("Бодрость восстановлена", "good");
    renderStats();
    return;
  }

  if (nearPoi.type === "work") {
    adjustResources({ money: 30, hunger: -10, fatigue: -10 });
    if (checkFailConditions()) return;
    showStopToast("+30₽", "good");
    renderStats();
    return;
  }

  // ===== DEFAULT: пассивное/неизвестное здание — ничего не делаем, не ломаемся =====
  showStopToast("Ничего интересного.", "info");
  return;
}

/* ===== canvas resize ===== */

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

/* ===== init/inputs ===== */

function initStopSceneUI() {
  const btn = qid("btnToggleInventory");
  if (btn) {
    btn.onclick = () => {
      toggleInventoryUI();
    };
  }

  toggleInventoryUI(false);

  renderInventoryUI();
  renderStopDialog();
  ensureStopToastEl();

  const avatarEl = qid("playerAvatar");
  if (avatarEl) {
    const cfg = typeof getCharacterById === "function" ? getCharacterById(state.selectedCharacterId || "tourist") : null;
    if (cfg && cfg.avatarKey && sprites[cfg.avatarKey]) {
      avatarEl.src = sprites[cfg.avatarKey].src;
    }
  }

  renderStats();
}

/**
 * Биндим ввод один раз
 */
function ensureStopSceneBound() {
  if (ensureStopSceneBound._bound) return;
  ensureStopSceneBound._bound = true;

  window.addEventListener("resize", () => {
    if (state.mode === "stop") resizeStopCanvas();
  });

  window.addEventListener("keydown", (e) => {
    if (state.mode !== "stop") return;

    if (e.code === "KeyI") {
      e.preventDefault();
      toggleInventoryUI();
    }

    if (e.code === "KeyE") {
      e.preventDefault();
      handleHubInteract();
    }

    if (e.code === "Enter" || e.code === "Space") {
      if (stopDialogState.open) {
        const hasMore = stopDialogState.lineIndex < stopDialogState.lines.length - 1;
        if (hasMore) {
          e.preventDefault();
          advanceStopDialog();
        }
      }
    }
  });
}
ensureStopSceneBound._bound = false;

ensureStopSceneBound();
