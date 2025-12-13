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
  // try to use character-specific car sprite first
  const charId = String(state.characterId || selectedCharacterId || "tourist");
  const personalKey = `car_${charId}`;
  let carSprite = (sprites && sprites[personalKey]) ? sprites[personalKey] : null;
  if (!carSprite) carSprite = (sprites && sprites.car) ? sprites.car : null;

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
  const carScreenRow = (typeof state.road.carScreenRow === "number")
    ? state.road.carScreenRow
    : ROAD_CAR_SCREEN_ROW;

  // allow drawing one extra row above to enable smooth partial reveal
  const worldTopRow = Math.max(0, scrollInt);
  const worldBottomRow = worldTopRow + viewRows; // inclusive (we draw sy = -1..viewRows-1)

  // ===== draw tiles (16x6) =====
  // apply fractional vertical offset for smooth sliding (no rounding)
  ctx.save();
  ctx.translate(0, scrollFrac * layout.cellH);

  // choose themeKey for road tiles (fallback to first road template)
  const themeKey = (typeof getRoadSegmentTemplateByIndex === "function" && getRoadSegmentTemplateByIndex(0) && getRoadSegmentTemplateByIndex(0).themeKey)
    ? getRoadSegmentTemplateByIndex(0).themeKey
    : "";

  // draw one extra row above (sy = -1) so the incoming row is visible gradually
  for (let sy = -1; sy < viewRows; sy++) {
    // inverted mapping: higher worldRow -> closer to top
    const worldRow = worldTopRow + (viewRows - 1 - sy);
    const rowStr =
      state.road.worldRows && state.road.worldRows[worldRow]
        ? state.road.worldRows[worldRow]
        : ".".repeat(16);

    for (let x = 0; x < ROAD_COLS; x++) {
      const ch = rowStr[x] || ".";
      const r = _roadCellRect(layout, x, sy);

      // pick base tile like in hub
      let tileBase = "tile_snow";
      if (typeof isSidewalkChar === "function" && isSidewalkChar(ch)) tileBase = "tile_sidewalk";
      if (typeof isGrassChar === "function" && isGrassChar(ch)) tileBase = "tile_grass";
      if (typeof isSnowChar === "function" && isSnowChar(ch)) tileBase = "tile_snow";
      if (typeof isRoadChar === "function" && isRoadChar(ch)) tileBase = "tile_sidewalk";

      const baseSpr = (typeof getThemedSprite === "function") ? getThemedSprite(themeKey, tileBase) : { img: null };
      if (typeof drawTile === "function") drawTile(ctx, baseSpr.img, r.x, r.y, r.w);
      else ctx.fillRect(r.x, r.y, r.w, r.h);

      // if road char — draw the road variant on top
      if (typeof isRoadChar === "function" && isRoadChar(ch)) {
        const rv = (typeof computeRoadVariant === "function") ? computeRoadVariant(state.road.worldRows || [], x, worldRow) : { variant: "road_straight", rot: 0 };
        const roadSpr = (typeof getThemedSprite === "function") ? getThemedSprite(themeKey, rv.variant) : { img: null };
        if (typeof drawRotatedTile === "function") drawRotatedTile(ctx, roadSpr.img, r.x, r.y, r.w, rv.rot);
      }
    }
  }

  // ===== roadside entities + interact zone =====

  const entities = Array.isArray(state.road.entities) ? state.road.entities : [];
  const carCellX = Math.round((typeof state.road.carX === "number") ? state.road.carX : ROAD_X1);
  const carWorldRow = worldTopRow + (viewRows - 1 - carScreenRow);
  for (const ent of entities) {
    if (!ent || ent.triggered) continue;
    const row = ent.row;
    if (row < worldTopRow || row > worldBottomRow) continue;

    const sy = worldBottomRow - row;

    // персонаж на обочине справа (x=ROAD_NPC_X)
    const xr = _roadCellRect(layout, ROAD_NPC_X, sy);

    // draw sprite (smaller, same visual scale as hub characters)
    const spr = ent.kind === "hitchhiker" ? _getHitchhikerSprite(ent) : _getNpcSprite();
    const padFrac = 0.38;
    const pad = Math.floor(xr.w * padFrac);
    const spriteH = Math.max(1, xr.h - pad * 2);

    if (spr) {
      _drawSpriteInCell(ctx, spr, xr, padFrac);
    } else {
      ctx.fillStyle = ent.kind === "npc" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.75)";
      const pad2 = Math.floor(xr.w * 0.2);
      ctx.fillRect(xr.x + pad2, xr.y + pad2, xr.w - pad2 * 2, xr.h - pad2 * 2);
    }

    // зелёная интеракт-зона — на дороге у правого края (x=ROAD_INTERACT_X)
    // make it same height as the sprite and use thinner border like in hub
    const zrFull = _roadCellRect(layout, ROAD_INTERACT_X, sy);
    // make interact zone narrower (half width) and center it in the cell
    const zrW = Math.max(1, Math.floor(zrFull.w / 2));
    const zrX = zrFull.x + Math.floor((zrFull.w - zrW) / 2);
    const zr = { x: zrX, y: xr.y + pad, w: zrW, h: spriteH };
    const strong = (Math.abs((state.road.carX || 0) - ROAD_INTERACT_X) < 0.6 && carWorldRow === row);

    // custom thinner draw
    ctx.fillStyle = strong ? "rgba(34,197,94,0.65)" : "rgba(34,197,94,0.40)";
    ctx.fillRect(zr.x, zr.y, zr.w, zr.h);
    ctx.strokeStyle = strong ? "rgba(34,197,94,0.95)" : "rgba(34,197,94,0.75)";
    ctx.lineWidth = Math.max(1, Math.floor(Math.min(zr.w, zr.h) * 0.03));
    ctx.strokeRect(zr.x + ctx.lineWidth * 0.5, zr.y + ctx.lineWidth * 0.5, zr.w - ctx.lineWidth, zr.h - ctx.lineWidth);

    // маленькая метка типа (чтобы визуально отличались)
    ctx.fillStyle = ent.kind === "npc" ? "rgba(255,215,0,0.95)" : "rgba(34,197,94,0.95)";
    const tag = Math.max(2, Math.floor(xr.w * 0.14));
    ctx.fillRect(xr.x + 2, xr.y + 2, tag, tag);
  }
  ctx.restore();

  // ===== car ===== (рисуем без scroll-translate, машина стоит на месте)
  const carSy = carScreenRow;
  // draw car with fractional X (prevents visual "teleport" when rounding)
  const cxF = (typeof state.road.carX === "number") ? state.road.carX : ROAD_X1;
  const carRect = {
    x: layout.x0 + Math.floor(cxF * layout.cellW),
    y: layout.y0 + carSy * layout.cellH,
    w: layout.cellW,
    h: layout.cellH,
  };

  // угол поворота (радианы), небольшой
  const carAngle = (typeof state.road.carAngle === "number") ? state.road.carAngle : 0;
  _drawCar(ctx, carRect, carAngle);

  // ===== draw HUD 16x2 =====
  _clearRoadHudRegions();

  const stage = (typeof computeStageLayout === "function") ? computeStageLayout(w, h) : null;
  const hudRect = (typeof getHudRect === "function" && stage) ? getHudRect(stage) : { x: layout.x0, y: layout.y0 + menuTop * layout.cellH, w: layout.gridW, h: layout.cellH * 2 };
  if (typeof drawPanel === "function") drawPanel(ctx, hudRect);

  // layout
  const rInteractAvatar = (typeof hudCellsToRect === "function" && stage) ? hudCellsToRect(stage, 1, 2, 1, 2) : { x: layout.x0 + layout.cellW, y: layout.y0 + menuTop * layout.cellH, w: layout.cellW, h: layout.cellH * 2 };
  const rInteractText = (typeof hudCellsToRect === "function" && stage) ? hudCellsToRect(stage, 3, 4, 1, 2) : { x: layout.x0 + 3 * layout.cellW, y: layout.y0 + menuTop * layout.cellH, w: 4 * layout.cellW, h: layout.cellH * 2 };
  const rDialog = (typeof hudCellsToRect === "function" && stage) ? hudCellsToRect(stage, 5, 12, 1, 1) : { x: layout.x0 + 5 * layout.cellW, y: layout.y0 + menuTop * layout.cellH, w: 8 * layout.cellW, h: layout.cellH };
  const rBottomCenter = (typeof hudCellsToRect === "function" && stage) ? hudCellsToRect(stage, 5, 12, 2, 2) : { x: layout.x0 + 5 * layout.cellW, y: layout.y0 + (menuTop + 1) * layout.cellH, w: 8 * layout.cellW, h: layout.cellH };
  const rStats = (typeof hudCellsToRect === "function" && stage) ? hudCellsToRect(stage, 13, 14, 1, 2) : { x: layout.x0 + 13 * layout.cellW, y: layout.y0 + menuTop * layout.cellH, w: 2 * layout.cellW, h: layout.cellH * 2 };
  const rPlayerAvatar = (typeof hudCellsToRect === "function" && stage) ? hudCellsToRect(stage, 15, 16, 1, 2) : { x: layout.x0 + 15 * layout.cellW, y: layout.y0 + menuTop * layout.cellH, w: layout.cellW, h: layout.cellH * 2 };

  // prepare stop-like HUD state from road state
  try {
    // interact avatar: use first nearby hitchhiker if any
    const nearby = (Array.isArray(state.road.entities) ? state.road.entities.find((e) => e && !e.triggered && Math.abs(e.row - (worldTopRow + viewRows - 1 - carScreenRow)) <= 1) : null);
    if (nearby) {
      const spr = nearby.kind === "hitchhiker" ? _getHitchhikerSprite(nearby) : _getNpcSprite();
      window.stopHudState = window.stopHudState || {};
      window.stopHudState.interactAvatar = spr && spr.src ? { kind: "npc", src: spr.src } : { kind: "prop", src: getDefaultAvatarSrc("prop") };
      window.stopHudState.interactTitle = nearby.label || "Пассажир";
      window.stopHudState.interactHint = nearby.hint || "";
    } else {
      window.stopHudState = window.stopHudState || {};
      window.stopHudState.interactAvatar = { kind: "prop", src: getDefaultAvatarSrc("prop") };
      window.stopHudState.interactTitle = "";
      window.stopHudState.interactHint = "";
    }

    // player avatar
    const cfg = (typeof getCharacterById === "function") ? getCharacterById(state.characterId || selectedCharacterId || "tourist") : null;
    window.stopHudState.playerAvatarSrc = (cfg && cfg.avatarKey) ? getAvatarSrcByKey(cfg.avatarKey) : getDefaultAvatarSrc("player");

    // stats text
    if (typeof buildStopStatsText === "function") {
      window.stopHudState.statsText = buildStopStatsText();
    } else {
      const money = typeof state.money === "number" ? state.money : 0;
      const fuel = typeof state.fuel === "number" ? state.fuel : 0;
      const hunger = typeof state.hunger === "number" ? state.hunger : 0;
      const fatigue = typeof state.fatigue === "number" ? state.fatigue : 0;
      window.stopHudState.statsText = `Money: ${money}\nFuel:  ${fuel}\nHungr: ${hunger}\nFatig: ${fatigue}`;
    }

    // controls text
    window.stopHudState.controlsText = window.stopHudState.controlsTextDefault || "";

  } catch (e) { /* ignore HUD prep errors */ }

  // draw exactly like stop-render's HUD but push hit regions into road HUD
  // use existing stop-render helpers where available

  // draw avatars
  const ia = (window.stopHudState && window.stopHudState.interactAvatar) ? window.stopHudState.interactAvatar : null;
  const iaImg = ia ? (typeof getHudImageBySrc === "function" ? getHudImageBySrc(ia.src) : null) : null;
  if (typeof drawAvatarInRect === "function") drawAvatarInRect(ctx, iaImg, rInteractAvatar);

  const paSrc = (window.stopHudState && window.stopHudState.playerAvatarSrc) ? window.stopHudState.playerAvatarSrc : "";
  const paImg = paSrc ? (typeof getHudImageBySrc === "function" ? getHudImageBySrc(paSrc) : null) : null;
  if (typeof drawAvatarInRect === "function") drawAvatarInRect(ctx, paImg, rPlayerAvatar);

  // left text (title + hint)
  if (typeof drawPanel === "function") drawPanel(ctx, rInteractText);

  const titleRect = {
    x: rInteractText.x + 8,
    y: rInteractText.y + 6,
    w: rInteractText.w - 16,
    h: Math.floor(rInteractText.h * 0.46)
  };

  const hintRect = {
    x: rInteractText.x + 8,
    y: titleRect.y + titleRect.h + 2,
    w: rInteractText.w - 16,
    h: rInteractText.y + rInteractText.h - (titleRect.y + titleRect.h + 10)
  };

  if (typeof drawTextInRect === "function") drawTextInRect(ctx, window.stopHudState.interactTitle, titleRect, {
    fontSize: Math.max(10, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.18)),
    color: "#f8fafc",
    maxLines: 2,
    lineHeight: Math.max(12, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.22)),
    padding: 2
  });

  if (typeof drawTextInRect === "function") drawTextInRect(ctx, window.stopHudState.interactHint, hintRect, {
    fontSize: Math.max(9, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.16)),
    color: "#e5e7eb",
    maxLines: 3,
    lineHeight: Math.max(11, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.20)),
    padding: 2
  });

  // stats panel
  if (typeof drawPanel === "function") drawPanel(ctx, rStats);
  const statsText = String(window.stopHudState.statsText || "");
  const statLines = statsText.replace(/\r/g, "").split("\n");
  const fontSize = Math.max(9, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.16));
  const lineHeight = Math.max(11, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.20));
  const padding = 4;

  ctx.save();
  ctx.beginPath();
  ctx.rect(rStats.x, rStats.y, rStats.w, rStats.h);
  ctx.clip();

  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  let x = rStats.x + padding;
  let y = rStats.y + padding;

  for (let i = 0; i < statLines.length; i++) {
    const line = statLines[i] || "";
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(line, x, y);
    y += lineHeight;
    if (y > rStats.y + rStats.h) break;
  }

  ctx.restore();

  // dialog panel (center)
  if (typeof drawPanel === "function") drawPanel(ctx, rDialog);

  // sync road dialog -> stopDialogState so HUD renders choices identically
  window.stopDialogState = window.stopDialogState || {};
  if (state.road && state.road.dialog && state.road.dialog.open) {
    const d = state.road.dialog;
    window.stopDialogState.open = true;
    window.stopDialogState.text = d.text || (Array.isArray(d.lines) ? (d.lines[d.lineIndex] || d.lines[0] || "") : "");
    window.stopDialogState.lines = Array.isArray(d.lines) ? d.lines.slice() : [String(d.text || "")];
    window.stopDialogState.lineIndex = typeof d.lineIndex === "number" ? d.lineIndex : 0;
    window.stopDialogState.choices = Array.isArray(d.choices) ? d.choices.slice() : [];
  } else {
    window.stopDialogState.open = false;
    window.stopDialogState.text = "";
    window.stopDialogState.lines = [];
    window.stopDialogState.lineIndex = 0;
    window.stopDialogState.choices = [];
  }

  if (window.stopDialogState.open) {
    const dlgInner = { x: rDialog.x + 10, y: rDialog.y + 10, w: rDialog.w - 20, h: rDialog.h - 20 };

    const isLastLine = window.stopDialogState.lineIndex >= (window.stopDialogState.lines.length - 1);
    const hasChoices = isLastLine && window.stopDialogState.choices && window.stopDialogState.choices.length;

    let textBox = dlgInner;
    let buttonsBox = null;

    if (hasChoices) {
      const btnH = Math.max(18, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.42));
      buttonsBox = { x: dlgInner.x, y: dlgInner.y + dlgInner.h - btnH, w: dlgInner.w, h: btnH };
      textBox = { x: dlgInner.x, y: dlgInner.y, w: dlgInner.w, h: dlgInner.h - btnH - 6 };
    }

    if (typeof drawTextInRect === "function") drawTextInRect(ctx, window.stopDialogState.text, textBox, {
      fontSize: Math.max(11, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.20)),
      color: "#e5e7eb",
      align: "center",
      maxLines: 3,
      padding: 6
    });

    if (!hasChoices) {
      const hasMore = window.stopDialogState.lineIndex < window.stopDialogState.lines.length - 1;
      if (hasMore) {
        const btnR = { x: rDialog.x + rDialog.w - Math.max(90, Math.floor((stage ? stage.cellSize : layout.cellH) * 2.2)) - 10, y: rDialog.y + rDialog.h - Math.max(22, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.5)) - 10, w: Math.max(90, Math.floor((stage ? stage.cellSize : layout.cellH) * 2.2)), h: Math.max(22, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.5)) };
        if (typeof drawButton === "function") drawButton(ctx, btnR, "Далее", false);
        _pushRoadHudRegion("road_next", btnR.x, btnR.y, btnR.w, btnR.h, null);
      }
    } else if (buttonsBox) {
      const choices = window.stopDialogState.choices.slice(0, 4);
      const gap = 8;
      const btnW = Math.floor((buttonsBox.w - gap * (choices.length - 1)) / choices.length);
      const btnH = buttonsBox.h;

      for (let i = 0; i < choices.length; i++) {
        const c = choices[i];
        const br = { x: buttonsBox.x + i * (btnW + gap), y: buttonsBox.y, w: btnW, h: btnH };
        if (typeof drawButton === "function") drawButton(ctx, br, c.label, false);
        _pushRoadHudRegion("road_choice", br.x, br.y, br.w, br.h, { index: i });
      }
    }
  }

  // bottom center: inventory + controls
  if (typeof drawPanel === "function") drawPanel(ctx, rBottomCenter);

  const pad = 8;
  const textH = Math.max(18, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.34));

  const rInv = { x: rBottomCenter.x + pad, y: rBottomCenter.y + pad, w: rBottomCenter.w - pad * 2, h: Math.max(0, rBottomCenter.h - pad * 2 - textH - 6) };
  const rText = { x: rBottomCenter.x + pad, y: rBottomCenter.y + rBottomCenter.h - textH - pad, w: rBottomCenter.w - pad * 2, h: textH };

  if (rInv.h >= 10) {
    ctx.save();
    ctx.fillStyle = "rgba(11, 18, 32, 0.70)";
    ctx.fillRect(rInv.x, rInv.y, rInv.w, rInv.h);
    ctx.strokeStyle = "rgba(55, 65, 81, 0.95)";
    ctx.strokeRect(rInv.x + 0.5, rInv.y + 0.5, rInv.w - 1, rInv.h - 1);
    ctx.restore();

    const inv = Array.isArray(state.inventory) ? state.inventory : [];
    if (!inv.length) {
      if (typeof drawTextInRect === "function") drawTextInRect(ctx, "Пусто", rInv, { fontSize: Math.max(10, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.18)), color: "#9ca3af", align: "center", maxLines: 1 });
    } else {
      const slotGap = Math.max(6, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.12));
      const slotSize = Math.max(28, Math.floor(Math.min(rInv.h, (stage ? stage.cellSize : layout.cellH) * 0.78)));

      const maxSlots = Math.max(1, Math.floor((rInv.w + slotGap) / (slotSize + slotGap)));
      const show = inv.slice(0, Math.min(inv.length, maxSlots));

      const totalW = show.length * slotSize + (show.length - 1) * slotGap;
      const startX = rInv.x + Math.max(8, Math.floor((rInv.w - totalW) / 2));
      const y0 = rInv.y + Math.max(6, Math.floor((rInv.h - slotSize) / 2));

      ctx.save();
      ctx.beginPath();
      ctx.rect(rInv.x + 1, rInv.y + 1, rInv.w - 2, rInv.h - 2);
      ctx.clip();

      for (let i = 0; i < show.length; i++) {
        const it = show[i];
        const sr = { x: startX + i * (slotSize + slotGap), y: y0, w: slotSize, h: slotSize };

        ctx.save();
        ctx.fillStyle = "rgba(2, 6, 23, 0.35)";
        ctx.fillRect(sr.x, sr.y, sr.w, sr.h);
        ctx.strokeStyle = "rgba(55,65,81,0.85)";
        ctx.strokeRect(sr.x + 0.5, sr.y + 0.5, sr.w - 1, sr.h - 1);
        ctx.restore();

        const iconSrc = it && it.iconKey ? (typeof getInventoryIconSrc === "function" ? getInventoryIconSrc(it.iconKey) : "") : "";
        const iconImg = iconSrc ? (typeof getHudImageBySrc === "function" ? getHudImageBySrc(iconSrc) : null) : null;

        if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
          const inset = Math.max(3, Math.floor(sr.w * 0.18));
          ctx.drawImage(iconImg, sr.x + inset, sr.y + inset, sr.w - inset * 2, sr.h - inset * 2);
        }

        _pushRoadHudRegion("inv_item", sr.x, sr.y, sr.w, sr.h, { item: it || null });
      }

      ctx.restore();

      if (inv.length > show.length) {
        ctx.save();
        ctx.fillStyle = "#9ca3af";
        ctx.font = `700 ${Math.max(12, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.22))}px monospace`;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText("…", rInv.x + rInv.w - 6, rInv.y + rInv.h - 4);
        ctx.restore();
      }
    }
  }

  if (typeof drawTextInRect === "function") drawTextInRect(ctx, window.stopHudState.controlsText, rText, { fontSize: Math.max(10, Math.floor((stage ? stage.cellSize : layout.cellH) * 0.16)), color: "#9ca3af", align: "center", maxLines: 1, padding: 4 });

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
