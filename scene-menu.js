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

  // Подсветить выбранного по умолчанию
  highlightSelectedCharacterCard();
}

function setupMenuScene() {
  const btnMenuStart = /** @type {HTMLButtonElement|null} */ (qid("btnMenuStart"));
  if (!btnMenuStart) return;

  // Инициализируем выбор персонажа
  initCharacterCards();

  btnMenuStart.onclick = () => {
    // Новый забег с выбранным персонажем
    state = createInitialState();
    renderStats();

    // Центруем персонажа, если канвас уже готов
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

