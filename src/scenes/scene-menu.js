// scene-menu.js

function highlightSelectedCharacterCard() {
  const ids = /** @type {CharacterId[]} */ (["tourist", "worker", "forester", "mechanic"]);
  ids.forEach((id) => {
    const btn = qid("character-card-" + id);
    if (!btn) return;
    if (id === selectedCharacterId) {
      btn.classList.add("selected");
    } else {
      btn.classList.remove("selected");
    }
  });
}

function initCharacterCards() {
  const ids = /** @type {CharacterId[]} */ (["tourist", "worker", "forester", "mechanic"]);

  ids.forEach((id) => {
    const cfg = getCharacterById(id);
    const btn = /** @type {HTMLButtonElement|null} */ (qid("character-card-" + id));
    if (btn) {
      btn.addEventListener("click", () => {
        setSelectedCharacter(id);
        highlightSelectedCharacterCard();
      });
    }

    const avatarImg = /** @type {HTMLImageElement|null} */ (qid("charCardAvatar-" + id));
    if (avatarImg) {
      const sprite = sprites[cfg.avatarKey];
      if (sprite) {
        avatarImg.src = sprite.src;
      }
      avatarImg.alt = cfg.name;
    }
  });

  highlightSelectedCharacterCard();
}

function showMenuPanel(panel) {
  const panels = {
    play: /** @type {HTMLElement|null} */ (qid("panelMenuPlay")),
    controls: /** @type {HTMLElement|null} */ (qid("panelMenuControls")),
    settings: /** @type {HTMLElement|null} */ (qid("panelMenuSettings"))
  };
  const buttons = {
    play: /** @type {HTMLButtonElement|null} */ (qid("btnMenuPlay")),
    controls: /** @type {HTMLButtonElement|null} */ (qid("btnMenuControls")),
    settings: /** @type {HTMLButtonElement|null} */ (qid("btnMenuSettings"))
  };

  Object.entries(panels).forEach(([key, el]) => {
    if (!el) return;
    if (key === panel) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });

  Object.entries(buttons).forEach(([key, btn]) => {
    if (!btn) return;
    if (key === panel) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function setupMenuScene() {
  initCharacterCards();

  const btnMenuStart = /** @type {HTMLButtonElement|null} */ (qid("btnMenuStart"));
  const btnMenuPlay = /** @type {HTMLButtonElement|null} */ (qid("btnMenuPlay"));
  const btnMenuControls = /** @type {HTMLButtonElement|null} */ (qid("btnMenuControls"));
  const btnMenuSettings = /** @type {HTMLButtonElement|null} */ (qid("btnMenuSettings"));
  const btnMenuExit = /** @type {HTMLButtonElement|null} */ (qid("btnMenuExit"));

  if (btnMenuPlay) btnMenuPlay.onclick = () => showMenuPanel("play");
  if (btnMenuControls) btnMenuControls.onclick = () => showMenuPanel("controls");
  if (btnMenuSettings) btnMenuSettings.onclick = () => showMenuPanel("settings");
  if (btnMenuExit) {
    btnMenuExit.onclick = () => {
      if (window.api && typeof window.api.exitApp === "function") {
        window.api.exitApp();
      } else {
        window.close();
      }
    };
  }

  const selectResolution = /** @type {HTMLSelectElement|null} */ (qid("resolutionSelect"));
  if (selectResolution) {
    selectResolution.onchange = () => {
      const val = selectResolution.value;
      const parts = val.split("x").map((v) => parseInt(v.trim(), 10));
      if (parts.length === 2 && parts.every((n) => Number.isFinite(n) && n > 0)) {
        if (window.api && typeof window.api.setWindowSize === "function") {
          window.api.setWindowSize(parts[0], parts[1]);
        }
      }
    };
  }

  const btnWindowed = /** @type {HTMLButtonElement|null} */ (qid("btnWindowed"));
  if (btnWindowed) {
    btnWindowed.onclick = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      if (window.api && typeof window.api.setFullscreen === "function") {
        window.api.setFullscreen(false);
      }
    };
  }

  const btnFullscreenToggle = /** @type {HTMLButtonElement|null} */ (qid("btnFullscreenToggle"));
  if (btnFullscreenToggle) {
    btnFullscreenToggle.onclick = () => {
      if (window.api && typeof window.api.setFullscreen === "function") {
        window.api.setFullscreen(true);
      } else if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
  }

  showMenuPanel("play");

  if (!btnMenuStart) return;

  btnMenuStart.onclick = () => {
    state = createInitialState();
    renderStats();

    if (stopCanvas) {
      state.hub.x = stopCanvas.width / 2;
      state.hub.y = stopCanvas.height / 2;
    }

    setScreen("screen-stop");
    if (typeof renderStopUI === "function") {
      renderStopUI();
    }
  };
}
