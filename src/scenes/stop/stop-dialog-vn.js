// src/scenes/stop/stop-dialog-vn.js

/**
 * VN dialog engine: open/advance/close
 * Использует глобальный stopDialogState (stop-ui.js / scene-stop.js).
 *
 * ВАЖНО: Теперь диалог рисуется в CANVAS (stop-render.js).
 */

/* global stopDialogState */

function openStopDialogVN(lines, choices, opts) {
  const safeLines = Array.isArray(lines) ? lines.map((x) => String(x ?? "")) : [String(lines ?? "")];

  stopDialogState.open = true;
  stopDialogState.lines = safeLines.filter((x) => x.length > 0);
  if (!stopDialogState.lines.length) stopDialogState.lines = [""];
  stopDialogState.lineIndex = 0;
  stopDialogState.text = stopDialogState.lines[0] || "";
  stopDialogState.choices = Array.isArray(choices) ? choices : [];
  stopDialogState.lockMovement = opts && typeof opts.lockMovement === "boolean" ? opts.lockMovement : true;
  stopDialogState.onClose = opts && typeof opts.onClose === "function" ? opts.onClose : null;
}

function closeStopDialog() {
  const onClose = stopDialogState.onClose;

  stopDialogState.open = false;
  stopDialogState.lines = [];
  stopDialogState.lineIndex = 0;
  stopDialogState.text = "";
  stopDialogState.choices = [];
  stopDialogState.lockMovement = true;
  stopDialogState.onClose = null;

  if (onClose) {
    try { onClose(); } catch (e) { console.error(e); }
  }
}

function advanceStopDialog() {
  if (!stopDialogState.open) return;

  const hasMore = stopDialogState.lineIndex < stopDialogState.lines.length - 1;
  if (hasMore) {
    stopDialogState.lineIndex += 1;
    stopDialogState.text = stopDialogState.lines[stopDialogState.lineIndex] || "";
    return;
  }

  if (stopDialogState.choices && stopDialogState.choices.length) {
    return;
  }

  closeStopDialog();
}
