// src/scenes/scene-road.js

function clientToCanvasPx(clientX, clientY) {
  if (!roadCanvas) return { px: 0, py: 0 };
  const rect = roadCanvas.getBoundingClientRect();
  const px = (clientX - rect.left) * (roadCanvas.width / rect.width);
  const py = (clientY - rect.top) * (roadCanvas.height / rect.height);
  return { px, py };
}

function isPointInsideCanvas(clientX, clientY) {
  if (!roadCanvas) return false;
  const rect = roadCanvas.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function pickHudRegionAt(px, py) {
  if (typeof getRoadHudHitRegions !== "function") return null;
  const regs = getRoadHudHitRegions();
  if (!regs || !regs.length) return null;
  for (let i = regs.length - 1; i >= 0; i--) {
    const r = regs[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r;
  }
  return null;
}

function handleRoadHudHover(px, py) {
  const r = pickHudRegionAt(px, py);
  // For now we only support hover text for inventory like stop scene
  if (r && r.kind === "inv_item" && r.payload && r.payload.item) {
    const it = r.payload.item;
    if (typeof setStopControlsText === "function") setStopControlsText(_getHoverTextForItem(it));
    return;
  }
  if (typeof resetStopControlsText === "function") resetStopControlsText();
}

function handleRoadCanvasClick(clientX, clientY) {
  if (!roadCanvas) return;
  const p = clientToCanvasPx(clientX, clientY);
  const r = pickHudRegionAt(p.px, p.py);
  if (!r) return;

  if (r.kind === "road_next") {
    if (typeof window.roadDialogAdvance === "function") window.roadDialogAdvance();
    return;
  }

  if (r.kind === "road_choice") {
    const idx = r.payload && typeof r.payload.index === "number" ? r.payload.index : -1;
    if (idx >= 0) {
      if (typeof window.roadDialogPick === "function") window.roadDialogPick(idx);
    }
    return;
  }

  if (r.kind === "inv_item") {
    const it = r.payload && r.payload.item ? r.payload.item : null;
    if (!it) return;
    // fallback behavior: open a simple dialog for items
    if (typeof window.roadDialogOpen === "function") {
      window.roadDialogOpen([_getHoverTextForItem(it) || "Предмет"], [{ id: "ok", label: "Ок", onPick: () => window.roadDialogClose && window.roadDialogClose() }]);
    }
    return;
  }
}

function ensureRoadSceneBound() {
  if (ensureRoadSceneBound._bound) return;
  ensureRoadSceneBound._bound = true;

  window.addEventListener("resize", () => {
    if (state && state.mode === "road") {
      if (typeof resizeRoadCanvas === "function") resizeRoadCanvas();
      if (typeof renderRoadScene === "function") renderRoadScene();
    }
  });

  // clicks / hover for road HUD (similar to stop scene)
  window.addEventListener("mousedown", (e) => {
    if (!state || state.mode !== "road") return;
    handleRoadCanvasClick(e.clientX, e.clientY);
  });

  window.addEventListener("mousemove", (e) => {
    if (!state || state.mode !== "road") return;
    if (!isPointInsideCanvas(e.clientX, e.clientY)) return;
    const p = clientToCanvasPx(e.clientX, e.clientY);
    handleRoadHudHover(p.px, p.py);
  });

  window.addEventListener("keydown", (e) => {
    if (!state || state.mode !== "road") return;
    if (e.code === "Enter" || e.code === "NumpadEnter" || e.key === "Enter" || e.code === "Space") {
      if (state.road && state.road.dialog && state.road.dialog.open) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.roadDialogAdvance === "function") window.roadDialogAdvance();
      }
    }
  });
}
ensureRoadSceneBound._bound = false;

function enterRoadScene() {
  const screen = document.getElementById("screen-road");
  if (!screen) return;

  roadCanvas = /** @type {HTMLCanvasElement|null} */ (document.getElementById("roadCanvas"));
  if (!roadCanvas) return;

  roadCtx = roadCanvas.getContext("2d");
  if (roadCtx) roadCtx.imageSmoothingEnabled = false;

  ensureRoadSceneBound();

  if (typeof resizeRoadCanvas === "function") resizeRoadCanvas();
  if (typeof renderRoadScene === "function") renderRoadScene();
}

if (typeof window !== "undefined") {
  window.enterRoadScene = enterRoadScene;
}
