// src/scenes/road/road-render.js

function _roadCellRect(layout, cx, cy) {
  return {
    x: layout.x0 + cx * layout.cellW,
    y: layout.y0 + cy * layout.cellH,
    w: layout.cellW,
    h: layout.cellH,
  };
}

function computeRoadStageLayout() {
  const w = roadCanvas.width;
  const h = roadCanvas.height;

  const cellH = Math.floor(h / ROAD_TOTAL_ROWS);
  const cellW = Math.floor(w / ROAD_COLS);

  const size = Math.max(1, Math.min(cellW, cellH));
  const gridW = size * ROAD_COLS;
  const gridH = size * ROAD_TOTAL_ROWS;

  const x0 = Math.floor((w - gridW) / 2);
  const y0 = Math.floor((h - gridH) / 2);

  return {
    x0,
    y0,
    cellW: size,
    cellH: size,
    gridW,
    gridH,
  };
}

// hit regions for dialog
function _clearRoadHudRegions() {
  const regs = typeof getRoadHudHitRegions === "function" ? getRoadHudHitRegions() : null;
  if (regs && regs.length) regs.length = 0;
}
function _pushRoadHudRegion(kind, x, y, w, h, payload) {
  const regs = typeof getRoadHudHitRegions === "function" ? getRoadHudHitRegions() : null;
  if (!regs) return;
  regs.push({ kind, x, y, w, h, payload: payload || null });
}

function _drawText(ctx, text, x, y, maxW) {
  const s = String(text || "");
  if (!s) return;
  ctx.fillText(s, x, y, maxW);
}

function _hasSprite(img) {
  return !!(img && img.complete && img.naturalWidth > 0);
}

function _getHitchhikerSprite(ent) {
  // 1) персональный спрайт по id (если когда-нибудь появится ассет)
  const hh = ent && ent.hitchhiker ? ent.hitchhiker : null;
  const personalKey = hh && hh.id ? `hitchhiker_${hh.id}` : "";
  if (personalKey && sprites && sprites[personalKey] && _hasSprite(sprites[personalKey])) {
    return sprites[personalKey];
  }

  // 2) общий hitchhiker (у тебя сейчас он уже фолбечится на default_npc через game-sprites.js)
  if (sprites && sprites.hitchhiker && _hasSprite(sprites.hitchhiker)) return sprites.hitchhiker;

  // 3) дефолтный npc
  if (sprites && sprites.default_npc && _hasSprite(sprites.default_npc)) return sprites.default_npc;

  return null;
}

function _getNpcSprite() {
  // для "npc" можно дать отдельный проп, но если нет — default_npc
  if (sprites && sprites.prop_npc && _hasSprite(sprites.prop_npc)) return sprites.prop_npc;
  if (sprites && sprites.default_npc && _hasSprite(sprites.default_npc)) return sprites.default_npc;
  if (sprites && sprites.hitchhiker && _hasSprite(sprites.hitchhiker)) return sprites.hitchhiker;
  return null;
}

function _drawSpriteInCell(ctx, img, r, padFrac) {
  const pad = Math.floor(r.w * (padFrac || 0.10));
  const w = Math.max(1, r.w - pad * 2);
  const h = Math.max(1, r.h - pad * 2);
  ctx.drawImage(img, r.x + pad, r.y + pad, w, h);
}

function _drawInteractZone(ctx, zr, strong) {
  // основная заливка
  ctx.fillStyle = strong ? "rgba(34,197,94,0.65)" : "rgba(34,197,94,0.40)";
  ctx.fillRect(zr.x, zr.y, zr.w, zr.h);

  // рамка, чтобы не терялась на дороге
  ctx.strokeStyle = strong ? "rgba(34,197,94,0.95)" : "rgba(34,197,94,0.75)";
  ctx.lineWidth = Math.max(1, Math.floor(Math.min(zr.w, zr.h) * 0.06));
  ctx.strokeRect(
    zr.x + ctx.lineWidth * 0.5,
    zr.y + ctx.lineWidth * 0.5,
    zr.w - ctx.lineWidth,
    zr.h - ctx.lineWidth
  );

  // маленький маркер "STOP"
  ctx.fillStyle = "rgba(34,197,94,0.95)";
  const mW = Math.max(2, Math.floor(zr.w * 0.18));
  const mH = Math.max(2, Math.floor(zr.h * 0.18));
  ctx.fillRect(zr.x + 2, zr.y + 2, mW, mH);
}

function _drawCar(ctx, carRect, carAngleRad) {
  const carSprite = (sprites && sprites.car) ? sprites.car : null;

  const pad = Math.floor(carRect.w * 0.08);
  const dx = carRect.x + pad;
  const dy = carRect.y + pad;
  const dw = carRect.w - pad * 2;
  const dh = carRect.h - pad * 2;

  // Если есть спрайт — рисуем с лёгким поворотом (угол небольшой, так что артефакты терпимы)
  if (carSprite && _hasSprite(carSprite)) {
    const cx = dx + dw / 2;
    const cy = dy + dh / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(carAngleRad || 0);
    ctx.translate(-cx, -cy);
    ctx.drawImage(carSprite, dx, dy, dw, dh);
    ctx.restore();
    return;
  }

  // fallback-прямоугольник
  ctx.fillStyle = "#f97316";
  const p2 = Math.floor(carRect.w * 0.12);
  ctx.fillRect(carRect.x + p2, carRect.y + p2, carRect.w - p2 * 2, carRect.h - p2 * 2);
}

function renderRoadScene() {
  if (!roadCtx || !roadCanvas) return;
  const ctx = roadCtx;

  const w = roadCanvas.width;
  const h = roadCanvas.height;

  ctx.clearRect(0, 0, w, h);

  // фон
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  if (!state.road || !state.road.active) {
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.floor(Math.min(w, h) * 0.03)}px monospace`;
    ctx.fillText("ROAD", 20, 40);
    return;
  }

  const layout = computeRoadStageLayout();
  _clearRoadHudRegions();

  const viewRows = ROAD_VIEW_ROWS;
  const menuTop = ROAD_VIEW_ROWS;

  const scroll = state.road.scroll || 0; // float
  const scrollInt = Math.floor(scroll);
  const scrollFrac = (scroll - scrollInt) || 0;
  const carScreenRow = (typeof state.road.carScreenRow === "number") ? state.road.carScreenRow : 4;

  const worldTopRow = Math.max(0, scrollInt);
  const worldBottomRow = worldTopRow + viewRows - 1;

  // ===== draw tiles (16x6) =====
  // apply fractional vertical offset for smooth sliding
  ctx.save();
  ctx.translate(0, Math.round(scrollFrac * layout.cellH));

  for (let sy = 0; sy < viewRows; sy++) {
    // inverted mapping: higher worldRow -> closer to top
    const worldRow = worldTopRow + (viewRows - 1 - sy);
    const rowStr =
      state.road.worldRows && state.road.worldRows[worldRow]
        ? state.road.worldRows[worldRow]
        : ".".repeat(16);

    for (let x = 0; x < ROAD_COLS; x++) {
      const ch = rowStr[x] || ".";
      const r = _roadCellRect(layout, x, sy);

      let fill = "#050505";

      // дорога базовая
      if (x >= ROAD_X0 && x <= ROAD_X1) fill = "#0b0b0b";

      // декоративка по символам
      if (ch === "s") fill = "#070707";
      if (ch === "#") fill = "#0b0b0b";

      // точка/пусто
      if (ch === ".") {
        fill = (x >= ROAD_X0 && x <= ROAD_X1) ? "#0b0b0b" : "#050505";
      }

      ctx.fillStyle = fill;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }

  // ===== roadside entities + interact zone =====
  const entities = Array.isArray(state.road.entities) ? state.road.entities : [];
  const carCellX = Math.round(state.road.carX || 8.5);
  const carWorldRow = worldTopRow + (viewRows - 1 - carScreenRow);

  for (const ent of entities) {
    if (!ent || ent.triggered) continue;
    const row = ent.row;
    if (row < worldTopRow || row > worldBottomRow) continue;

    const sy = worldBottomRow - row;

    // зелёная интеракт-зона — на дороге у правого края (x=ROAD_INTERACT_X)
    const zr = _roadCellRect(layout, ROAD_INTERACT_X, sy);
    const strong = (Math.abs((state.road.carX || 0) - ROAD_INTERACT_X) < 0.6 && carWorldRow === row);
    _drawInteractZone(ctx, zr, strong);

    // персонаж на обочине справа (x=ROAD_NPC_X)
    const xr = _roadCellRect(layout, ROAD_NPC_X, sy);

    const spr =
      ent.kind === "hitchhiker"
        ? _getHitchhikerSprite(ent)
        : _getNpcSprite();

    if (spr) {
      _drawSpriteInCell(ctx, spr, xr, 0.06);
    } else {
      // fallback если вообще нет картинок
      ctx.fillStyle = ent.kind === "npc" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.75)";
      const pad = Math.floor(xr.w * 0.2);
      ctx.fillRect(xr.x + pad, xr.y + pad, xr.w - pad * 2, xr.h - pad * 2);
    }

    // маленькая метка типа (чтобы визуально отличались)
    ctx.fillStyle = ent.kind === "npc" ? "rgba(255,215,0,0.95)" : "rgba(34,197,94,0.95)";
    const tag = Math.max(2, Math.floor(xr.w * 0.14));
    ctx.fillRect(xr.x + 2, xr.y + 2, tag, tag);
  }

  // ===== car =====
  const carSy = carScreenRow;
  // draw car with fractional X (prevents visual "teleport" when rounding)
  const cxF = (typeof state.road.carX === "number") ? state.road.carX : 8.5;
  const carRect = {
    x: layout.x0 + Math.floor(cxF * layout.cellW),
    y: layout.y0 + carSy * layout.cellH,
    w: layout.cellW,
    h: layout.cellH,
  };

  // угол поворота (радианы), небольшой
  const carAngle = (typeof state.road.carAngle === "number") ? state.road.carAngle : 0;
  _drawCar(ctx, carRect, carAngle);

  ctx.restore();

  // ===== menu (16x2) =====
  for (let y = 0; y < ROAD_MENU_ROWS; y++) {
    const sy = menuTop + y;
    for (let x = 0; x < ROAD_COLS; x++) {
      const r = _roadCellRect(layout, x, sy);
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }

  // тексты меню
  ctx.fillStyle = "#fff";
  ctx.font = `${Math.floor(layout.cellH * 0.35)}px monospace`;
  ctx.textBaseline = "top";

  const distDone = Math.min(state.road.scroll || 0, state.road.distanceTotal || 0);
  const distTotal = state.road.distanceTotal || 0;

  const line1 =
    `ПУТЬ: ${Math.floor(distDone)} / ${Math.floor(distTotal)}  |  ТОПЛИВО ${Math.floor(state.fuel)}  |  ` +
    `СЫТОСТЬ ${Math.floor(state.hunger)}  |  БОДРОСТЬ ${Math.floor(state.fatigue)}  |  ₽ ${Math.floor(state.money)}`;

  const line2 = (state.road.dialog && state.road.dialog.open)
    ? "ВЫБОР: 1-4  •  ENTER — далее"
    : "УПРАВЛЕНИЕ: A/D — рулить (угол) • Въедь в зелёную зону у автостопщика • M — карта";

  const r0 = _roadCellRect(layout, 0, menuTop);
  const r1 = _roadCellRect(layout, 0, menuTop + 1);

  _drawText(ctx, line1, r0.x + 6, r0.y + 4, layout.gridW - 12);
  _drawText(ctx, state.lastMessage ? `> ${state.lastMessage}` : line2, r1.x + 6, r1.y + 4, layout.gridW - 12);

  // ===== dialog overlay in menu =====
  if (state.road.dialog && state.road.dialog.open) {
    const d = state.road.dialog;

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(r0.x, r0.y, layout.gridW, layout.cellH * 2);

    ctx.fillStyle = "#fff";
    ctx.font = `${Math.floor(layout.cellH * 0.42)}px monospace`;
    ctx.textBaseline = "top";

    _drawText(ctx, d.text || "", r0.x + 8, r0.y + 6, layout.gridW - 16);

    const choices = Array.isArray(d.choices) ? d.choices : [];
    if (choices.length) {
      ctx.font = `${Math.floor(layout.cellH * 0.36)}px monospace`;

      for (let i = 0; i < Math.min(4, choices.length); i++) {
        const c = choices[i];
        const y = r1.y + 6 + i * Math.floor(layout.cellH * 0.45);

        _pushRoadHudRegion("road_choice", r1.x, y - 2, layout.gridW, Math.floor(layout.cellH * 0.45), { index: i });

        _drawText(ctx, `${i + 1}) ${c.label || "..."}`, r1.x + 8, y, layout.gridW - 16);
      }
    } else {
      _pushRoadHudRegion("road_next", r1.x, r1.y, layout.gridW, layout.cellH, null);
      ctx.font = `${Math.floor(layout.cellH * 0.34)}px monospace`;
      _drawText(ctx, "ENTER — продолжить", r1.x + 8, r1.y + 6, layout.gridW - 16);
    }
  }
}

if (typeof window !== "undefined") {
  window.renderRoadScene = renderRoadScene;
}
