// src/scenes/stop/stop-dialog-vn.js

/**
 * VN dialog engine: open/advance/close/render
 * Использует глобальный stopDialogState (задаём его в stop-ui.js / scene-stop.js).
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

  renderStopDialog();
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

  renderStopDialog();

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
    renderStopDialog();
    return;
  }

  if (stopDialogState.choices && stopDialogState.choices.length) {
    return;
  }

  closeStopDialog();
}

function renderStopDialog() {
  const dlg = qid("stopDialog");
  const txt = qid("stopDialogText");
  const chs = qid("stopDialogChoices");
  if (!dlg || !txt || !chs) return;

  if (!stopDialogState.open) {
    dlg.classList.add("hidden");
    txt.textContent = "";
    chs.innerHTML = "";
    return;
  }

  dlg.classList.remove("hidden");
  txt.textContent = stopDialogState.text;

  chs.innerHTML = "";

  const hasMore = stopDialogState.lineIndex < stopDialogState.lines.length - 1;
  if (hasMore) {
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "primary";
    nextBtn.textContent = "Далее";
    nextBtn.addEventListener("click", () => advanceStopDialog());
    chs.appendChild(nextBtn);
  }

  const isLastLine = stopDialogState.lineIndex >= stopDialogState.lines.length - 1;
  if (isLastLine && stopDialogState.choices && stopDialogState.choices.length) {
    for (const c of stopDialogState.choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "primary";
      btn.textContent = c.label;
      btn.addEventListener("click", () => {
        try { c.onPick && c.onPick(); } catch (e) { console.error(e); }
      });
      chs.appendChild(btn);
    }
  }
}
