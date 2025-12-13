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
  controlsTextDefault: "ЛКМ — выбрать точку • Enter — ехать • M — назад",
  controlsText: "ЛКМ — выбрать точку • Enter — ехать • M — назад"
};

function buildMapStatsText() {
  const money = (typeof state.money === "number") ? state.money : 0;
  const fuel = (typeof state.fuel === "number") ? state.fuel : 0;
  const hunger = (typeof state.hunger === "number") ? state.hunger : 0;
  const fatigue = (typeof state.fatigue === "number") ? state.fatigue : 0;
  return `Money: ${money}\nFuel:  ${fuel}\nHungr: ${hunger}\nFatig: ${fatigue}`;
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
  mapHudState.controlsText = mapHudState.controlsTextDefault;
}
