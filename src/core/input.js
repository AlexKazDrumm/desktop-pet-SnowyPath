// src/core/input.js
// input.js

function setupInput() {
  window.addEventListener("keydown", (e) => {
    keysPressed[e.code] = true;

    if (e.code === "KeyM") {
      // Тоггл карты:
      // - из хаба или дороги -> открыть карту
      // - из карты -> вернуться на остановку
      if (state.mode === "map") {
        setScreen("screen-stop");
      } else if (state.mode === "stop" || state.mode === "road") {
        setScreen("screen-map");
      }
      return;
    }

    if (e.code === "KeyI") {
      // Тоггл инвентаря в хабе
      if (state.mode === "stop" && state.ui) {
        state.ui.inventoryOpen = !state.ui.inventoryOpen;
        if (typeof renderStopUI === "function") {
          renderStopUI();
        }
      }
      return;
    }

    if (e.code === "KeyE") {
      if (state.mode === "stop") {
        handleHubInteract();
      }
      return;
    }

    if (e.code === "Enter" || e.code === "NumpadEnter" || e.key === "Enter") {
      if (state.mode === "map") {
        e.preventDefault();

        const fn = window.mapTryStartTravelToSelected;
        if (typeof fn === "function") {
          fn();
        } else {
          console.warn("[input] mapTryStartTravelToSelected is not defined");
        }
      }
      return;
    }
  });

  window.addEventListener("keyup", (e) => {
    keysPressed[e.code] = false;
  });

  const btnBackToStopFromMap = qid("btnBackToStopFromMap");
  if (btnBackToStopFromMap) {
    btnBackToStopFromMap.onclick = () => {
      setScreen("screen-stop");
    };
  }

  const btnStartSegmentEl = /** @type {HTMLButtonElement|null} */ (qid("btnStartSegment"));
  if (btnStartSegmentEl) {
    btnStartSegmentEl.onclick = () => {
      planTravelAndStart();
    };
  }

  const btnRoadContinue = /** @type {HTMLButtonElement|null} */ (qid("btnRoadContinue"));
  if (btnRoadContinue) {
    btnRoadContinue.onclick = () => {
      state.road.pausedForEvent = false;
      state.currentHitchhiker = null;
      state.mode = "road";
      renderRoadScene();
    };
  }

  const btnToggleInventory = qid("btnToggleInventory");
  if (btnToggleInventory) {
    btnToggleInventory.onclick = () => {
      if (!state.ui) return;
      state.ui.inventoryOpen = !state.ui.inventoryOpen;
      if (typeof renderStopUI === "function") {
        renderStopUI();
      }
    };
  }

  // MAP click
  const mapCanvasEl = /** @type {HTMLCanvasElement|null} */ (qid("mapCanvas"));
  if (mapCanvasEl) {
    mapCanvasEl.addEventListener("click", (ev) => {
      // не падаем, если handleMapClick не торчит в window
      const fn = window.handleMapClick;
      if (typeof fn === "function") {
        fn(ev);
      } else {
        // можно оставить молча, но лучше один раз подсветить проблему
        console.warn("[input] handleMapClick is not defined (window.handleMapClick missing)");
      }
    });
  }
}
