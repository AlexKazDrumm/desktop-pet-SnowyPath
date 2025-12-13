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
  const carScreenRow = (typeof state.road.carScreenRow === "number") ? state.road.carScreenRow : 4;

  const worldTopRow = Math.max(0, scrollInt);
  const worldBottomRow = worldTopRow + viewRows - 1;

  // ===== draw tiles (16x6) =====
  for (let sy = 0; sy < viewRows; sy++) {
    const worldRow = worldTopRow + sy;
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

  for (const ent of entities) {
    if (!ent || ent.triggered) continue;
    const row = ent.row;
    if (row < worldTopRow || row > worldBottomRow) continue;

    const sy = row - worldTopRow;

    // зелёная интеракт-зона — слева от NPC (col 10 => x=9)
    const zr = _roadCellRect(layout, ROAD_INTERACT_X, sy);
    ctx.fillStyle = "rgba(34,197,94,0.35)";
    ctx.fillRect(zr.x, zr.y, zr.w, zr.h);

    // NPC/HH стоят справа (col 11 => x=10)
    const xr = _roadCellRect(layout, ROAD_NPC_X, sy);

    ctx.fillStyle = ent.kind === "npc" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.75)";
    const pad = Math.floor(xr.w * 0.2);
    ctx.fillRect(xr.x + pad, xr.y + pad, xr.w - pad * 2, xr.h - pad * 2);

    // маркер
    ctx.fillStyle = ent.kind === "npc" ? "rgba(255,215,0,0.9)" : "rgba(34,197,94,0.9)";
    ctx.fillRect(
      xr.x + pad,
      xr.y + pad,
      Math.max(2, Math.floor(xr.w * 0.12)),
      Math.max(2, Math.floor(xr.h * 0.12))
    );

    // если машина в зоне и на этой строке — подсветка сильнее
    const carWorldRow = worldTopRow + carScreenRow;
    if (carCellX === ROAD_INTERACT_X && carWorldRow === row) {
      ctx.fillStyle = "rgba(34,197,94,0.55)";
      ctx.fillRect(zr.x, zr.y, zr.w, zr.h);
    }
  }

  // ===== car =====
  const carSy = carScreenRow;
  const carRect = _roadCellRect(layout, Math.round(state.road.carX || 8.5), carSy);

  const carSprite = (sprites && sprites.car) ? sprites.car : null;
  if (carSprite && carSprite.complete && carSprite.naturalWidth > 0) {
    const pad = Math.floor(carRect.w * 0.08);
    ctx.drawImage(
      carSprite,
      carRect.x + pad,
      carRect.y + pad,
      carRect.w - pad * 2,
      carRect.h - pad * 2
    );
  } else {
    ctx.fillStyle = "#f97316";
    const pad = Math.floor(carRect.w * 0.12);
    ctx.fillRect(carRect.x + pad, carRect.y + pad, carRect.w - pad * 2, carRect.h - pad * 2);
  }

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

  const line1 = `ПУТЬ: ${Math.floor(distDone)} / ${Math.floor(distTotal)}  |  ТОПЛИВО ${Math.floor(state.fuel)}  |  СЫТОСТЬ ${Math.floor(state.hunger)}  |  БОДРОСТЬ ${Math.floor(state.fatigue)}  |  ₽ ${Math.floor(state.money)}`;
  const line2 = (state.road.dialog && state.road.dialog.open)
    ? "ВЫБОР: 1-4  •  ENTER — далее"
    : "УПРАВЛЕНИЕ: A/D — рулить • M — карта";

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
