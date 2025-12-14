// src/scenes/scene-map.js

/** @type {HTMLCanvasElement|null} */
var mapCanvas = null;
/** @type {CanvasRenderingContext2D|null} */
var mapCtx = null;

function mapClientToCanvasPx(clientX, clientY) {
  if (!mapCanvas) return { px: 0, py: 0 };
  const rect = mapCanvas.getBoundingClientRect();
  const px = (clientX - rect.left) * (mapCanvas.width / rect.width);
  const py = (clientY - rect.top) * (mapCanvas.height / rect.height);
  return { px, py };
}

function mapPickRegionAt(px, py) {
  if (typeof getMapHitRegions !== "function") return null;
  const regs = getMapHitRegions();
  if (!regs || !regs.length) return null;

  for (let i = regs.length - 1; i >= 0; i--) {
    const r = regs[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r;
  }
  return null;
}

function handleMapCanvasClick(clientX, clientY) {
  if (!mapCanvas) return;
  const p = mapClientToCanvasPx(clientX, clientY);
  const r = mapPickRegionAt(p.px, p.py);
  if (!r) return;

  if (r.kind === "map_point" && r.payload && typeof r.payload.index === "number") {
    mapHudState.selectedPointIndex = r.payload.index;
    showMapToast(`Selected point: ${r.payload.index + 1}`);
  }
}

/**
 * ЭТО ИМЕННО ТО, ЧТО ЖДЁТ input.js:
 * input.js вызывает window.handleMapClick(event)
 * @param {MouseEvent} ev
 */
function handleMapClick(ev) {
  if (!ev) return;
  // Клик обрабатываем только когда реально на карте
  if (!state || state.mode !== "map") return;
  handleMapCanvasClick(ev.clientX, ev.clientY);
}

function tryStartTravelToSelected() {
  const cur = (typeof state.currentPointIndex === "number") ? state.currentPointIndex : 0;
  const sel = (typeof mapHudState.selectedPointIndex === "number") ? mapHudState.selectedPointIndex : null;

  if (sel == null) {
    showMapToast("Select a point first");
    return;
  }

  if (!state.hub || !state.hub.inCar) {
    showMapToast("Сядьте в машину, чтобы выехать");
    return;
  }

  // allow only forward travel
  if (sel <= cur) {
    showMapToast("You are already there");
    return;
  }

  const dist = distanceFromToPoints(cur, sel);
  if (dist > state.fuel) {
    showMapToast("Недостаточно топлива для выбранной точки.");
    return;
  }

  try {
    // compute hunger/fatigue losses for all segments between cur..sel-1
    let totalHungerLoss = 0;
    let totalFatigueLoss = 0;
    for (let segIdx = cur; segIdx < sel; segIdx++) {
      const seg = segments[segIdx];
      if (seg) {
        totalHungerLoss += (typeof seg.hungerLoss === 'number') ? seg.hungerLoss : 0;
        totalFatigueLoss += (typeof seg.fatigueLoss === 'number') ? seg.fatigueLoss : 0;
      }
    }

    const char = state.characterConfig || (typeof getCharacterById === 'function' ? getCharacterById(state.characterId || selectedCharacterId) : null);
    const hungerLoss = totalHungerLoss * (char && char.hungerLossMultiplier ? char.hungerLossMultiplier : 1);
    const fatigueLoss = totalFatigueLoss * (char && char.fatigueLossMultiplier ? char.fatigueLossMultiplier : 1);

    // apply immediate costs
    adjustResources({ fuel: -dist, hunger: -hungerLoss, fatigue: -fatigueLoss });

    if (state.fuel < 0) state.fuel = 0;
    if (checkFailConditions && checkFailConditions()) return;

    // init road state
    state.road = state.road || {};
    state.road.active = true;
    state.road.fromPoint = cur;
    state.road.toPoint = sel;
    state.road.distanceTotal = dist;
    state.road.distanceTravelled = 0;
    state.road.pausedForEvent = false;
    state.road.hitchhikerEvents = [];
    state.road.carX = ROAD_CAR_START_X;
    state.road.carScreenRow = ROAD_CAR_SCREEN_ROW;
    state.road.carAngle = 0;
    state.road.scroll = 0;

    // build world rows and roadside entities for the selected route
    try {
      // copy segments and keep original index so road templates/entities match the real map leg
      const routeSegs = Array.isArray(segments)
        ? segments.slice(cur, sel).map((seg, idx) => ({
            ...seg,
            _globalIndex: cur + idx,
            pointIndex: cur + idx,
          }))
        : [];
      if (typeof buildRoadWorldRows === "function") {
        state.road.worldRows = buildRoadWorldRows(routeSegs);
      }
      if (typeof buildRoadEntities === "function") {
        state.road.entities = buildRoadEntities(routeSegs);
      }
      if (typeof buildRoadBuildings === "function") {
        state.road.buildings = buildRoadBuildings(routeSegs);
      }
    } catch (e) {
      console.warn("Failed to build road rows/entities:", e);
      state.road.worldRows = state.road.worldRows || [];
      state.road.entities = state.road.entities || [];
      state.road.buildings = state.road.buildings || [];
    }

    // collect hitchhiker events between segments
    for (let segIdx = cur; segIdx < sel; segIdx++) {
      const seg = segments[segIdx];
      if (!seg) continue;
      const segDistance = seg.distance || 0;
      const segOffset = cumulativeDistances[segIdx] - cumulativeDistances[cur];
      const segHhs = hitchhikers.filter((h) => h.segmentIndex === segIdx);
      segHhs.forEach((hh) => {
        const localPos = segDistance * (0.1 + Math.random() * 0.8);
        const worldPos = segOffset + localPos;
        state.road.hitchhikerEvents.push({ position: worldPos, hitchhiker: hh, triggered: false });
      });
    }

    state.currentHitchhiker = null;
    state.lastMessage = `Вы выехали с точки ${cur + 1} к точке ${sel + 1}.`;

    if (typeof setScreen === "function") setScreen("screen-road"); else state.mode = "road";
    if (typeof renderRoadScene === "function") renderRoadScene();
    renderStats && renderStats();
  } catch (e) {
    console.error(e);
  }
}

function ensureMapSceneBound() {
  if (ensureMapSceneBound._bound) return;
  ensureMapSceneBound._bound = true;

  window.addEventListener("resize", () => {
    if (state.mode === "map") resizeMapCanvas();
  });

  // ВАЖНО:
  // клики по canvas у тебя уже привязаны в src/core/input.js
  // поэтому тут второй биндинг mousedown НЕ НУЖЕН и может давать двойную обработку.
  // (оставляем только клавиатуру)

    window.addEventListener(
    "keydown",
    (e) => {
      if (!state || state.mode !== "map") return;

      // Enter / NumpadEnter — ехать
      const isEnter =
        e.code === "Enter" ||
        e.code === "NumpadEnter" ||
        e.key === "Enter";

      if (isEnter) {
        e.preventDefault();
        e.stopPropagation();
        tryStartTravelToSelected();
        return;
      }
    },
    true // CAPTURE — чтобы не проиграть input.js
  );
}
ensureMapSceneBound._bound = false;

function enterMapScene() {
  const screen = document.getElementById("screen-map");
  if (!screen) return;

  mapCanvas = /** @type {HTMLCanvasElement|null} */ (document.getElementById("mapCanvas"));
  if (!mapCanvas) return;

  mapCtx = mapCanvas.getContext("2d");
  if (mapCtx) mapCtx.imageSmoothingEnabled = false;

  ensureMapSceneBound();
  resizeMapCanvas();

  // reset UI once per enter
  mapUiInited = false;
}

// Экспорт обработчика для input.js
if (typeof window !== "undefined") {
  window.handleMapClick = handleMapClick;
}

window.mapTryStartTravelToSelected = tryStartTravelToSelected;
