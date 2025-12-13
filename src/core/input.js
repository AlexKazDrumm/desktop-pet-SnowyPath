// src/core/input.js
// Делает ввод идемпотентным: можно безопасно подключить/перезагрузить скрипт без падения.
// ВАЖНО: не используем top-level `const keysPressed = {}` чтобы не ловить "already been declared".

(function () {
  if (typeof window === "undefined") return;

  // Глобальный контейнер для ввода
  if (!window.__rtInput) {
    window.__rtInput = {
      inited: false,
      keysPressed: {},
    };
  }

  // Переиспользуем один и тот же объект, чтобы updateRoad видел те же ссылки.
  // Синхронизируем с любым существующим глобальным `keysPressed`, чтобы
  // разные скрипты не имели своих копий объекта.
  let keysPressed = window.__rtInput.keysPressed;
  if (typeof window.keysPressed !== "undefined" && window.keysPressed && window.keysPressed !== keysPressed) {
    keysPressed = window.keysPressed;
    window.__rtInput.keysPressed = keysPressed;
  } else {
    window.keysPressed = keysPressed;
  }

  // Helper to call screen switcher whether it's defined as a global function
  // or attached to window (some bundlers don't expose top-level functions on window).
  function callSetScreen(screenId) {
    if (typeof setScreen === "function") {
      try { setScreen(screenId); } catch (e) { console.error(e); }
    } else if (typeof window.setScreen === "function") {
      try { window.setScreen(screenId); } catch (e) { console.error(e); }
    }
  }

  function setupInput() {
    // Если уже биндили события — не биндим повторно
    if (window.__rtInput.inited) return;
    window.__rtInput.inited = true;

    window.addEventListener("keydown", (e) => {
      keysPressed[e.code] = true;
      const curState = (typeof state !== 'undefined') ? state : (window.state || null);

      // ===== ROAD: диалог внутри сетки (1-4 / Enter) =====
      if (
        curState &&
        curState.mode === "road" &&
        curState.road &&
        curState.road.dialog &&
        curState.road.dialog.open
      ) {
        const n =
          e.code === "Digit1" || e.code === "Numpad1" ? 1 :
          e.code === "Digit2" || e.code === "Numpad2" ? 2 :
          e.code === "Digit3" || e.code === "Numpad3" ? 3 :
          e.code === "Digit4" || e.code === "Numpad4" ? 4 : 0;

        if (n) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof window.roadDialogPick === "function") {
            window.roadDialogPick(n - 1);
          }
          return;
        }

        const isEnter =
          e.code === "Enter" ||
          e.code === "NumpadEnter" ||
          e.key === "Enter" ||
          e.code === "Space";

        if (isEnter) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof window.roadDialogAdvance === "function") {
            window.roadDialogAdvance();
          }
          return;
        }
      }

      // M — карта
      if (e.code === "KeyM") {
        try {
          console.log("[input] KeyM pressed, state.mode=", curState && curState.mode, "typeof setScreen=", typeof setScreen, "typeof window.setScreen=", typeof window.setScreen);
        } catch (ex) { /* ignore */ }

        if (curState && curState.mode === "map") {
          callSetScreen("screen-stop");
        } else if (curState && (curState.mode === "stop" || curState.mode === "road")) {
          callSetScreen("screen-map");
        }
        return;
      }

      // I — инвентарь в хабе
      if (e.code === "KeyI") {
        if (curState && curState.mode === "stop" && curState.ui) {
          curState.ui.inventoryOpen = !curState.ui.inventoryOpen;
          if (typeof window.renderStopUI === "function") {
            window.renderStopUI();
          }
        }
        return;
      }

      // E — интеракт в хабе
      if (e.code === "KeyE") {
        if (curState && curState.mode === "stop") {
          if (typeof window.handleHubInteract === "function") window.handleHubInteract();
        }
        return;
      }

      // Enter — старт сегмента с карты
      if (e.code === "Enter" || e.code === "NumpadEnter" || e.key === "Enter") {
        if (curState && curState.mode === "map") {
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

    // Кнопки (если вдруг остались в DOM в каких-то версиях)
    if (typeof window.qid === "function") {
      const btnBackToStopFromMap = window.qid("btnBackToStopFromMap");
      if (btnBackToStopFromMap) {
        btnBackToStopFromMap.onclick = () => {
          if (typeof window.setScreen === "function") window.setScreen("screen-stop");
        };
      }

      const btnStartSegmentEl = /** @type {HTMLButtonElement|null} */ (window.qid("btnStartSegment"));
      if (btnStartSegmentEl) {
        btnStartSegmentEl.onclick = () => {
          if (typeof window.planTravelAndStart === "function") window.planTravelAndStart();
        };
      }

      const btnToggleInventory = window.qid("btnToggleInventory");
      if (btnToggleInventory) {
        btnToggleInventory.onclick = () => {
          if (!window.state || !window.state.ui) return;
          window.state.ui.inventoryOpen = !window.state.ui.inventoryOpen;
          if (typeof window.renderStopUI === "function") {
            window.renderStopUI();
          }
        };
      }

      // MAP click
      const mapCanvasEl = /** @type {HTMLCanvasElement|null} */ (window.qid("mapCanvas"));
      if (mapCanvasEl) {
        mapCanvasEl.addEventListener("click", (ev) => {
          const fn = window.handleMapClick;
          if (typeof fn === "function") {
            fn(ev);
          } else {
            console.warn("[input] handleMapClick is not defined (window.handleMapClick missing)");
          }
        });
      }
    }
  }

  // Экспортируем в window и функцию инициализации
  window.keysPressed = keysPressed;
  window.setupInput = setupInput;
})();
