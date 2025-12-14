// src/scenes/map/map-ui.js

/**
 * HUD карты рисуется в canvas.
 * Тут только состояние + текстовые билдеры.
 */

let mapUiInited = false;

/** локальный state карты (не ломает глобальный state) */
const mapHudState = {
  selectedPointIndex: null, // выбранная на карте точка (клик)
  toastText: "",
  toastTimer: 0,

  statsText: "",
  infoText: "",
  poiText: "",
  controlsTextDefault: "ЛКМ — выбрать точку • Enter — ехать • M — назад",
  controlsText: "ЛКМ — выбрать точку • Enter — ехать • M — назад"
};

function buildMapStatsText() {
  const money = (typeof state.money === "number") ? state.money : 0;
  const fuel = (typeof state.fuel === "number") ? state.fuel : 0;
  const hunger = (typeof state.hunger === "number") ? state.hunger : 0;
  const fatigue = (typeof state.fatigue === "number") ? state.fatigue : 0;
  const canLine = (typeof hasCanister === "function" && hasCanister())
    ? `Canis: ${typeof getCanisterFuel === "function" ? getCanisterFuel() : 0}/${typeof CANISTER_CAPACITY === "number" ? CANISTER_CAPACITY : 20}`
    : null;
  let lines = [
    `Money: ${money}`,
    `Fuel:  ${fuel}`,
    `Hungr: ${hunger}`,
    `Fatig: ${fatigue}`
  ];
  if (canLine) lines.push(canLine);
  return lines.join("\n");
}

function computeRouteInfoText() {
  const cur = (typeof state.currentPointIndex === "number") ? state.currentPointIndex : 0;
  const sel = (typeof mapHudState.selectedPointIndex === "number")
    ? mapHudState.selectedPointIndex
    : null;

  const segs = Array.isArray(window.segments) ? window.segments : [];
  const pts = Array.isArray(window.mapPoints) ? window.mapPoints : [];
  const cum = Array.isArray(window.cumulativeDistances) ? window.cumulativeDistances : [];

  const pointsCount = Math.max(1, pts.length || (segs.length + 1));
  const segmentsCount = Math.max(0, segs.length);

  const total = segs.reduce((a, s) => a + (Number(s.distance) || 0), 0);
  const curDist = (cum[cur] != null) ? (Number(cum[cur]) || 0) : 0;

  // next segment distance (если мы на последней точке — следующего сегмента нет)
  const nextSeg = segs[cur] ? (Number(segs[cur].distance) || 0) : 0;
  const remain = Math.max(0, total - curDist);

  // UI: показываем точки 1..10
  const curUi = Math.max(1, Math.min(pointsCount, cur + 1));

  let t = `Current: ${curUi}/${pointsCount}\n`;
  t += `Passed:  ${curDist}\n`;
  t += `Next:    ${nextSeg}\n`;
  t += `Remain:  ${remain}`;

  if (sel != null) {
    const safeSel = Math.max(0, Math.min(sel, pointsCount - 1));
    const selDist = (cum[safeSel] != null) ? (Number(cum[safeSel]) || 0) : 0;
    const delta = Math.max(0, selDist - curDist);
    const selUi = safeSel + 1;
    t += `\nSel:     ${selUi}/${pointsCount}\n`;
    t += `To sel:  ${delta}`;
  }

  // (оставляем segmentsCount на всякий случай, если понадобится потом для дебага/баланса)
  void segmentsCount;

  return t;
}

function playerHasMapItem() {
  const inv = Array.isArray(state.inventory) ? state.inventory : [];
  return inv.some((it) => it && it.id === "map");
}

function computeRoutePoiText() {
  if (!playerHasMapItem()) return "";

  const cur = (typeof state.currentPointIndex === "number") ? state.currentPointIndex : 0;
  const sel = (typeof mapHudState.selectedPointIndex === "number")
    ? mapHudState.selectedPointIndex
    : null;

  if (sel == null || sel <= cur) return "Выберите точку впереди, чтобы увидеть здания по пути.";

  const segs = Array.isArray(window.segments) ? window.segments : [];
  const cum = Array.isArray(window.cumulativeDistances) ? window.cumulativeDistances : [];

  const lines = [];

  for (let i = cur; i < sel; i++) {
    const seg = segs[i];
    if (!seg) break;
    const dist = Number(seg.distance) || 0;
    const segStart = (cum[i] != null) ? Number(cum[i]) || 0 : 0;
    const fromCur = segStart - ((cum[cur] != null) ? Number(cum[cur]) || 0 : 0);

    const placePoi = (label, price, frac) => {
      const km = Math.round(fromCur + Math.max(1, dist * frac));
      const priceText = price ? `, цены: ${price}` : "";
      lines.push(`${label} (через ${km} км${priceText})`);
    };

    if (seg.hasGasStation) placePoi("Заправка", "10₽ за 10 топлива", 0.30);
    if (seg.hasDiner) placePoi("Закусочная", "10₽ за 40 сытости", 0.65);
    if (seg.hasMotel) placePoi("Мотель", "25₽, восстанавливает усталость", 0.85);
  }

  if (!lines.length) return "По пути к выбранной точке нет отмеченных зданий.";
  return lines.join("\n");
}

function setMapControlsText(text) {
  const s = String(text || "");
  mapHudState.controlsText = s || mapHudState.controlsTextDefault;
}

function resetMapControlsText() {
  mapHudState.controlsText = mapHudState.controlsTextDefault;
}

function showMapToast(text) {
  mapHudState.toastText = String(text || "");
  mapHudState.toastTimer = 1.8;
}

function initMapSceneUI() {
  mapHudState.selectedPointIndex = null;
  mapHudState.statsText = buildMapStatsText();
  mapHudState.infoText = computeRouteInfoText();
  mapHudState.poiText = "";
  mapHudState.controlsText = mapHudState.controlsTextDefault;
}
