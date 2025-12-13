// src/scenes/stop/stop-entities.js

/**
 * Построение сущностей для отрисовки/интеракта:
 * - themed sprites
 * - buildings bbox + interact band
 * - car rect + interact rect
 * - props rects
 */

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

/**
 * Получить текущий спрайт машины персонажа (fallback на общий sprites.car)
 *
 * ВАЖНО:
 * - выбор персонажа в state хранится как state.characterId (а не selectedCharacterId)
 *
 * @returns {HTMLImageElement|null}
 */
function getSelectedCarSprite() {
  const id = (typeof state === "object" && state && state.characterId)
    ? String(state.characterId)
    : null;

  // 1) Через конфиг персонажа
  if (id && typeof getCharacterById === "function") {
    const cfg = getCharacterById(id);
    if (cfg && cfg.carSpriteKey && sprites && sprites[cfg.carSpriteKey]) {
      const img = sprites[cfg.carSpriteKey];
      if (img && img.complete && img.naturalWidth > 0) return img;
    }
  }

  // 2) Прямой ключ car_${id}
  if (id) {
    const directKey = `car_${id}`;
    if (sprites && sprites[directKey]) {
      const img = sprites[directKey];
      if (img && img.complete && img.naturalWidth > 0) return img;
    }
  }

  // 3) Финальный fallback
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
 * - СПРАЙТ ДОЛЖЕН ТЯНУТЬСЯ в bbox здания с padding 10% от клетки (НЕ сохраняем пропорции)
 * - актив-зона: ПОД зданием (тонкая полоса)
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
    const avatarKey = b.avatarKey || null;

    // ВАЖНО: тянем спрайт в inner-box всегда
    const stretched = { x: innerX, y: innerY, w: innerW, h: innerH };

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
      avatarKey,
      x: stretched.x,
      y: stretched.y,
      w: stretched.w,
      h: stretched.h,
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
      avatarKey: p.avatarKey || null,
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
