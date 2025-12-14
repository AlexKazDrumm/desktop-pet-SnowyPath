// src/scenes/scene-stop.js

/**
 * Тонкий вход сцены stop:
 * - бинды инпута один раз
 * - resize
 * - делегирование в модули stop/*
 */

/** @type {HTMLCanvasElement|null} */
var stopCanvas = null;
/** @type {CanvasRenderingContext2D|null} */
var stopCtx = null;

function handleStopCanvasClick(clientX, clientY) {
  if (!stopCanvas) return;

  const rect = stopCanvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (stopCanvas.width / rect.width);
  const y = (clientY - rect.top) * (stopCanvas.height / rect.height);

  const regions = typeof getStopHudHitRegions === "function" ? getStopHudHitRegions() : [];
  if (!regions || !regions.length) return;

  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      if (r.kind === "dialog_next") {
        advanceStopDialog();
        return;
      }

      if (r.kind === "dialog_choice") {
        const idx = r.payload && typeof r.payload.index === "number" ? r.payload.index : -1;
        if (idx >= 0 && stopDialogState.choices && stopDialogState.choices[idx]) {
          const c = stopDialogState.choices[idx];
          try {
            c.onPick && c.onPick();
          } catch (e) {
            console.error(e);
          }
        }
        return;
      }

      if (r.kind === "inv_item") {
        const it = r.payload && r.payload.item ? r.payload.item : null;
        if (!it) return;

        // Currently only sandwich has eat behavior
        if (it.id === "rotten_sandwich") {
          openStopDialogVN(["Что сделать с сэндвичем?"], [
            {
              id: "eat",
              label: "Съесть",
              onPick: () => {
                try {
                  removeInventoryItemById(it.id, 1);
                } catch (e) { console.error(e); }
                try { adjustResources({ hunger: 5 }); } catch (e) { console.error(e); }
                closeStopDialog();
              }
            },
            {
              id: "leave",
              label: "Не есть",
              onPick: () => { closeStopDialog(); }
            }
          ], { lockMovement: true });
        } else {
          if (it.id === "canister") {
            const car = getCurrentCarRect();
            const nearCar = car ? isNearCar(car) : false;
            if (!nearCar) {
              openStopDialogVN(["Нужно быть рядом с машиной, чтобы использовать канистру."], [
                { id: "ok", label: "Ок", onPick: () => closeStopDialog() }
              ], { lockMovement: true });
            } else {
              const moved = typeof transferCanisterToCar === "function" ? transferCanisterToCar() : 0;
              const msg = moved > 0
                ? `Перелито ${moved} топлива из канистры в бак.`
                : "Не удалось перелить: бак полон или канистра пуста.";
              openStopDialogVN([msg], [
                { id: "ok", label: "Ок", onPick: () => closeStopDialog() }
              ], { lockMovement: true });
            }
          } else {
            openStopDialogVN([_getHoverTextForItem(it) || "Предмет"], [
              { id: "ok", label: "Ок", onPick: () => closeStopDialog() }
            ], { lockMovement: true });
          }
        }
        return;
      }

      return;
    }
  }
}

function pickHudRegionAt(px, py) {
  if (typeof getStopHudHitRegions !== "function") return null;
  const regs = getStopHudHitRegions();
  if (!regs || !regs.length) return null;

  for (let i = 0; i < regs.length; i++) {
    const r = regs[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
      return r;
    }
  }
  return null;
}

function _getHoverTextForItem(it) {
  if (!it) return "";

  const desc = String(it.description || "").trim();
  if (desc) return desc;

  const name = String(it.name || "").trim();
  const id = String(it.id || "").trim();

  // если name совпадает с id — НЕ показываем, чтобы не светить “id”
  if (name && name !== id) return name;

  return "Без описания";
}

function handleStopHudHover(px, py) {
  const r = pickHudRegionAt(px, py);

  if (r && r.kind === "inv_item" && r.payload && r.payload.item) {
    const it = r.payload.item;
    const text = _getHoverTextForItem(it);
    if (typeof setStopControlsText === "function") setStopControlsText(text);
    return;
  }

  if (typeof resetStopControlsText === "function") resetStopControlsText();
}

function isPointInsideCanvas(clientX, clientY) {
  if (!stopCanvas) return false;
  const rect = stopCanvas.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function clientToCanvasPx(clientX, clientY) {
  if (!stopCanvas) return { px: 0, py: 0 };
  const rect = stopCanvas.getBoundingClientRect();
  const px = (clientX - rect.left) * (stopCanvas.width / rect.width);
  const py = (clientY - rect.top) * (stopCanvas.height / rect.height);
  return { px, py };
}

function ensureStopSceneBound() {
  if (ensureStopSceneBound._bound) return;
  ensureStopSceneBound._bound = true;

  window.addEventListener("resize", () => {
    if (state.mode === "stop") resizeStopCanvas();
  });

  window.addEventListener("keydown", (e) => {
    if (state.mode !== "stop") return;

    if (e.code === "KeyI") {
      e.preventDefault();
      toggleInventoryUI();
    }

    if (e.code === "KeyE") {
      e.preventDefault();
      handleHubInteract();
    }

    if (e.code === "Enter" || e.code === "Space") {
      if (stopDialogState.open) {
        const hasMore = stopDialogState.lineIndex < stopDialogState.lines.length - 1;
        if (hasMore) {
          e.preventDefault();
          advanceStopDialog();
        }
      }
    }
  });

  window.addEventListener("mousedown", (e) => {
    if (state.mode !== "stop") return;
    handleStopCanvasClick(e.clientX, e.clientY);
  });

  window.addEventListener("mousemove", (e) => {
    if (state.mode !== "stop") return;

    if (!isPointInsideCanvas(e.clientX, e.clientY)) {
      if (typeof resetStopControlsText === "function") resetStopControlsText();
      return;
    }

    const p = clientToCanvasPx(e.clientX, e.clientY);
    handleStopHudHover(p.px, p.py);
  });

  window.addEventListener("blur", () => {
    if (typeof resetStopControlsText === "function") resetStopControlsText();
  });
}
ensureStopSceneBound._bound = false;

ensureStopSceneBound();
