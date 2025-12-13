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

  // разрешаем только следующий шаг (cur+1)
  if (sel !== cur + 1) {
    if (sel <= cur) showMapToast("You are already there");
    else showMapToast("Locked: only next point is available");
    return;
  }

  try {
    state.road = state.road || {};
    state.road.segmentIndex = cur;

    // переход на road делаем через твой роутер экранов
    if (typeof setScreen === "function") {
      setScreen("screen-road");
    } else {
      // fallback на случай если кто-то сломал screens-core
      state.mode = "road";
    }

    // если есть инициализация/первый рендер дороги — дернем
    if (typeof renderRoadScene === "function") {
      renderRoadScene();
    } else if (typeof enterRoadScene === "function") {
      enterRoadScene();
    }
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

      // M — назад (обычно в stop)
      if (e.code === "KeyM" || e.key === "m" || e.key === "M") {
        e.preventDefault();
        state.mode = "stop";
        // если есть роутинг экранов — поможем
        if (typeof window.showScreen === "function") window.showScreen("screen-stop");
        if (typeof window.enterStopScene === "function") window.enterStopScene();
        return;
      }

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