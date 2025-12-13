// src/scenes/road/road-resize.js

function resizeRoadCanvas() {
  if (!roadCanvas || !roadCtx) return;

  const parent = roadCanvas.parentElement;
  const w = parent ? parent.clientWidth : window.innerWidth;
  const h = parent ? parent.clientHeight : window.innerHeight;

  const dpr = window.devicePixelRatio || 1;
  roadCanvas.width = Math.max(1, Math.floor(w * dpr));
  roadCanvas.height = Math.max(1, Math.floor(h * dpr));
  roadCanvas.style.width = w + "px";
  roadCanvas.style.height = h + "px";

  roadCtx.imageSmoothingEnabled = false;
}

if (typeof window !== "undefined") {
  window.resizeRoadCanvas = resizeRoadCanvas;
}
