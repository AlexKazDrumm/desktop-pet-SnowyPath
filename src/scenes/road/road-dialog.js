// src/scenes/road/road-dialog.js

const ROAD_HUD_HIT_REGIONS = [];

function getRoadHudHitRegions() {
  return ROAD_HUD_HIT_REGIONS;
}

function roadDialogOpen(lines, choices) {
  if (!state.road) return;

  const safeLines = Array.isArray(lines) ? lines.map((x) => String(x ?? "")) : [String(lines ?? "")];
  const safe = safeLines.filter((x) => x.length > 0);
  const finalLines = safe.length ? safe : [""];

  state.road.dialog = {
    open: true,
    lines: finalLines,
    lineIndex: 0,
    text: finalLines[0] || "",
    choices: Array.isArray(choices) ? choices : [],
  };

  state.road.pausedForEvent = true;
}

function roadDialogClose() {
  if (!state.road) return;
  state.road.dialog = { open: false, lines: [], lineIndex: 0, text: "", choices: [] };
  state.road.pausedForEvent = false;
}

function roadDialogAdvance() {
  if (!state.road || !state.road.dialog || !state.road.dialog.open) return;
  const d = state.road.dialog;

  if (d.choices && d.choices.length) {
    return;
  }

  const hasMore = d.lineIndex < d.lines.length - 1;
  if (hasMore) {
    d.lineIndex += 1;
    d.text = d.lines[d.lineIndex] || "";
    return;
  }

  roadDialogClose();
}

function roadDialogPick(choiceIndex) {
  if (!state.road || !state.road.dialog || !state.road.dialog.open) return;
  const d = state.road.dialog;
  if (!d.choices || !d.choices[choiceIndex]) return;

  const c = d.choices[choiceIndex];
  try {
    if (c && typeof c.onPick === "function") c.onPick();
  } catch (e) {
    console.error(e);
  }
}

if (typeof window !== "undefined") {
  window.getRoadHudHitRegions = getRoadHudHitRegions;
  window.roadDialogOpen = roadDialogOpen;
  window.roadDialogClose = roadDialogClose;
  window.roadDialogAdvance = roadDialogAdvance;
  window.roadDialogPick = roadDialogPick;
}
