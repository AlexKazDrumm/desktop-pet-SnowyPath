// src/scenes/map/map-render.js

const MAP_HIT_REGIONS = []; // пересчитывается каждый кадр
const MAP_IMG_CACHE = {};

function getMapImageBySrc(src) {
  const key = String(src || "");
  if (!key) return null;
  if (MAP_IMG_CACHE[key]) return MAP_IMG_CACHE[key];
  const img = new Image();
  img.src = key;
  MAP_IMG_CACHE[key] = img;
  return img;
}

function mapDrawPanel(ctx, r) {
  ctx.save();
  ctx.fillStyle = "rgba(2, 6, 23, 0.92)";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = "rgba(55, 65, 81, 0.95)";
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  ctx.restore();
}

function mapDrawTextInRect(ctx, text, r, opts) {
  const t = String(text || "");
  if (!t) return;

  const padding = (opts && typeof opts.padding === "number") ? opts.padding : 8;
  const fontSize = (opts && typeof opts.fontSize === "number") ? opts.fontSize : 12;
  const color = (opts && opts.color) ? opts.color : "#e5e7eb";
  const align = (opts && opts.align) ? opts.align : "left";

  const maxWidth = Math.max(0, r.w - padding * 2);
  const maxHeight = Math.max(0, r.h - padding * 2);

  const lineHeight = Math.max(10, Math.floor(fontSize * 1.22));
  const maxLinesByHeight = Math.max(1, Math.floor(maxHeight / lineHeight));

  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();

  ctx.font = `${fontSize}px monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  const x = (align === "center") ? (r.x + r.w / 2) : (r.x + padding);
  let y = r.y + padding;

  const lines = t.replace(/\r/g, "").split("\n").slice(0, maxLinesByHeight);
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y);
    y += lineHeight;
    if (y > r.y + r.h) break;
  }

  ctx.restore();
}

function mapAddHitRegion(kind, rect, payload) {
  MAP_HIT_REGIONS.push({
    kind,
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    payload: payload || null
  });
}

function getMapHitRegions() {
  return MAP_HIT_REGIONS;
}

function getPointSpriteKey(pointIndex) {
  const cur = (typeof state.currentPointIndex === "number") ? state.currentPointIndex : 0;

  if (pointIndex === cur) return "mapPointCurrent";
  if (pointIndex > cur + 1) return "mapPointLocked";
  return "mapPoint";
}

function renderMap(dt) {
  if (!mapCanvas || !mapCtx) return;

  if (!mapUiInited) {
    initMapSceneUI();
    mapUiInited = true;
    if (typeof resizeMapCanvas === "function") resizeMapCanvas();
  }

  // toast timer
  if (mapHudState.toastTimer > 0) {
    mapHudState.toastTimer = Math.max(0, mapHudState.toastTimer - dt);
    if (mapHudState.toastTimer <= 0) mapHudState.toastText = "";
  }

  // синк текстов
  mapHudState.statsText = buildMapStatsText();
  mapHudState.infoText = computeRouteInfoText();
  mapHudState.poiText = playerHasMapItem() ? computeRoutePoiText() : "";

  const ctx = mapCtx;
  const w = mapCanvas.width;
  const h = mapCanvas.height;

  const stage = computeMapStageLayout(w, h);
  const mapLayout = deriveMapLayout(stage);

  // фон
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, w, h);

  // ===== отрисовка карты 16x6 =====
  // (тайлов нет — просто “поле” под линии/точки)
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
  ctx.fillRect(mapLayout.offsetX, mapLayout.offsetY, mapLayout.gridW, mapLayout.gridH);
  ctx.restore();

  const pts = (typeof window.getMapGridPoints === "function")
    ? window.getMapGridPoints()
    : (Array.isArray(window.mapGridPoints) ? window.mapGridPoints : []);

  // линии (между центрами клеток)
  if (pts.length >= 2) {
    ctx.save();
    ctx.strokeStyle = "rgba(148, 163, 184, 0.60)";
    ctx.lineWidth = Math.max(1, Math.floor(mapLayout.cellSize * 0.06));
    ctx.beginPath();

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (!a || !b) continue;
      const pa = mapCellCenter(a.cx, a.cy, mapLayout);
      const pb = mapCellCenter(b.cx, b.cy, mapLayout);

      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
    }

    ctx.stroke();
    ctx.restore();
  }

  // точки (спрайты)
  MAP_HIT_REGIONS.length = 0;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (!p) continue;

    const rCell = mapCellToRect(p.cx, p.cy, mapLayout);
    const s = mapLayout.cellSize;

    const inset = Math.max(2, Math.floor(s * 0.18));
    const rr = { x: rCell.x + inset, y: rCell.y + inset, w: rCell.w - inset * 2, h: rCell.h - inset * 2 };

    const spriteKey = getPointSpriteKey(i);
    const img = (window.sprites && window.sprites[spriteKey]) ? window.sprites[spriteKey] : null;

    // подсветка выбранной точки
    const isSelected = (typeof mapHudState.selectedPointIndex === "number" && mapHudState.selectedPointIndex === i);
    if (isSelected) {
      ctx.save();
      ctx.fillStyle = "rgba(34, 197, 94, 0.18)";
      ctx.fillRect(rCell.x, rCell.y, rCell.w, rCell.h);
      ctx.strokeStyle = "rgba(34, 197, 94, 0.75)";
      ctx.lineWidth = 1;
      ctx.strokeRect(rCell.x + 0.5, rCell.y + 0.5, rCell.w - 1, rCell.h - 1);
      ctx.restore();
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, rr.x, rr.y, rr.w, rr.h);
    } else {
      // fallback кружок
      ctx.save();
      ctx.fillStyle = (spriteKey === "mapPointLocked") ? "rgba(148,163,184,0.45)" : "rgba(248,250,252,0.80)";
      ctx.beginPath();
      ctx.arc(rr.x + rr.w / 2, rr.y + rr.h / 2, Math.max(3, rr.w * 0.32), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // hit region: вся клетка
    mapAddHitRegion("map_point", rCell, { index: i });
  }

  // ===== HUD 16x2 =====
  const hudRect = getMapHudRect(stage);
  mapDrawPanel(ctx, hudRect);

  // layout (16x2):
  // cols 1-4  rows 1-2 -> route info
  // cols 5-12 rows 1   -> big hint/info (controls or selection)
  // cols 5-12 rows 2   -> secondary line (toast or controls)
  // cols 13-14 rows 1-2 -> stats
  // cols 15-16 rows 1-2 -> small “selected/current”
  const rInfo = mapHudCellsToRect(stage, 1, 4, 1, 2);
  const rTopMid = mapHudCellsToRect(stage, 5, 12, 1, 1);
  const rBotMid = mapHudCellsToRect(stage, 5, 12, 2, 2);
  const rStats = mapHudCellsToRect(stage, 13, 14, 1, 2);
  const rMini = mapHudCellsToRect(stage, 15, 16, 1, 2);

  mapDrawPanel(ctx, rInfo);
  mapDrawTextInRect(ctx, mapHudState.infoText, rInfo, {
    fontSize: Math.max(9, Math.floor(stage.cellSize * 0.16)),
    color: "#e5e7eb",
    padding: 6,
    align: "left"
  });

  mapDrawPanel(ctx, rStats);
  mapDrawTextInRect(ctx, mapHudState.statsText, rStats, {
    fontSize: Math.max(9, Math.floor(stage.cellSize * 0.16)),
    color: "#e5e7eb",
    padding: 6,
    align: "left"
  });

  mapDrawPanel(ctx, rTopMid);

  const cur = (typeof state.currentPointIndex === "number") ? state.currentPointIndex : 0;
  const sel = (typeof mapHudState.selectedPointIndex === "number") ? mapHudState.selectedPointIndex : null;

  const ptsCount = (Array.isArray(window.mapPoints) && window.mapPoints.length)
    ? window.mapPoints.length
    : 10;

  // UI values (1-based)
  const curUi = Math.max(1, Math.min(ptsCount, cur + 1));
  const selUi = (sel == null) ? null : Math.max(1, Math.min(ptsCount, sel + 1));

  let topMidText = "";
  if (sel != null) {
    const locked = sel > cur + 1; // логика на 0-based
    if (locked) topMidText = `Selected: ${selUi} (locked)`;
    else if (sel === cur) topMidText = `Selected: ${selUi} (current)`;
    else topMidText = `Selected: ${selUi} (available)`;
  } else {
    topMidText = "Select a point to see distance";
  }

  mapDrawTextInRect(ctx, topMidText, rTopMid, {
    fontSize: Math.max(10, Math.floor(stage.cellSize * 0.18)),
    color: "#f8fafc",
    padding: 6,
    align: "center"
  });

  mapDrawPanel(ctx, rBotMid);
  const botText = mapHudState.toastText
    ? mapHudState.toastText
    : (mapHudState.poiText || mapHudState.controlsText);
  mapDrawTextInRect(ctx, botText, rBotMid, {
    fontSize: Math.max(9, Math.floor(stage.cellSize * 0.16)),
    color: mapHudState.toastText ? "#fbbf24" : "#9ca3af",
    padding: 6,
    align: "center"
  });

  mapDrawPanel(ctx, rMini);
  mapDrawTextInRect(ctx, `Cur:\n${curUi}\nSel:\n${selUi == null ? "-" : selUi}`, rMini, {
    fontSize: Math.max(9, Math.floor(stage.cellSize * 0.16)),
    color: "#e5e7eb",
    padding: 6,
    align: "center"
  });
}
