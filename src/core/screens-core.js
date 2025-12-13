// screens-core.js

function renderStats() {
  const statsBar = qid("statsBar");
  if (!statsBar) return;
  statsBar.innerHTML = "";

  const addStat = (label, value) => {
    const div = document.createElement("div");
    div.className = "stat-item";
    const l = document.createElement("div");
    l.className = "stat-label";
    l.textContent = label;
    const v = document.createElement("div");
    v.className = "stat-value";
    v.textContent = value;
    div.appendChild(l);
    div.appendChild(v);
    statsBar.appendChild(div);
  };

  addStat("Точка", `${state.currentPointIndex + 1} / ${segments.length + 1}`);
  addStat("Топливо", state.fuel.toFixed(0));
  addStat("Деньги", state.money.toFixed(0) + "₽");
  addStat("Сытость", state.hunger.toFixed(0));
  addStat("Бодрость", state.fatigue.toFixed(0));

  // Обновляем панель персонажа/инвентаря в хабе
  if (typeof renderStopUI === "function") {
    renderStopUI();
  }
}

/**
 * Переключение экранов
 * @param {"screen-menu"|"screen-stop"|"screen-map"|"screen-road"|"screen-end"} screenId
 */
function setScreen(screenId) {
  const ids = ["screen-menu", "screen-stop", "screen-map", "screen-road", "screen-end"];

  for (const id of ids) {
    const el = qid(id);
    if (!el) continue;

    if (id === screenId) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  }

  if (screenId === "screen-map") {
    state.mode = "map";
    if (typeof enterMapScene === "function") {
      enterMapScene();
    }
    if (typeof renderMap === "function") {
      renderMap();
    }
    if (typeof renderMapInfo === "function") {
      renderMapInfo();
    }
  } else if (screenId === "screen-stop") {
    state.mode = "stop";
    if (typeof resizeStopCanvas === "function") {
      resizeStopCanvas();
    }
  } else if (screenId === "screen-road") {
    state.mode = "road";
    if (typeof enterRoadScene === "function") {
      enterRoadScene();
    }
    if (typeof resizeRoadCanvas === "function") {
      resizeRoadCanvas();
    }
    if (typeof renderRoadScene === "function") {
      renderRoadScene();
    }
  } else if (screenId === "screen-end") {
    state.mode = "end";
  } else if (screenId === "screen-menu") {
    state.mode = "menu";
  }

  const statsBar = qid("statsBar");
  if (statsBar) {
    // В меню и в хабе верхняя статистика скрыта — она уехала в нижнюю панель
    statsBar.classList.toggle(
      "hidden",
      screenId === "screen-menu" || screenId === "screen-stop" || screenId === "screen-map"
    );
  }

  renderStats();
}

/**
 * Рендер нижней панели хаба: аватар, статы, инвентарь
 */
function renderStopUI() {
  const playerPanel = qid("stopPlayerPanel");
  const statsContainer = qid("stopStats");
  const avatarImg = /** @type {HTMLImageElement|null} */ (qid("playerAvatar"));
  const inventoryWrapper = qid("inventoryWrapper");
  const inventoryPanel = qid("inventoryPanel");
  const btnToggleInventory = qid("btnToggleInventory");

  if (state.mode !== "stop") {
    if (playerPanel) playerPanel.classList.add("hidden");
    if (inventoryWrapper) inventoryWrapper.classList.add("hidden");
    return;
  }

  if (playerPanel) playerPanel.classList.remove("hidden");
  if (inventoryWrapper) inventoryWrapper.classList.remove("hidden");

  const char =
    state.characterConfig ||
    getCharacterById(state.characterId || selectedCharacterId);

  // Аватар
  if (avatarImg) {
    const sprite = sprites[char.avatarKey];
    if (sprite) {
      avatarImg.src = sprite.src;
    } else {
      avatarImg.removeAttribute("src");
    }
    avatarImg.alt = char.name;
  }

  // Локальная панель статов
  if (statsContainer) {
    statsContainer.innerHTML = "";
    const addRow = (label, value) => {
      const row = document.createElement("div");
      row.className = "stop-stat-row";
      const l = document.createElement("span");
      l.className = "stop-stat-label";
      l.textContent = label;
      const v = document.createElement("span");
      v.className = "stop-stat-value";
      v.textContent = value;
      row.appendChild(l);
      row.appendChild(v);
      statsContainer.appendChild(row);
    };

    addRow("Точка", `${state.currentPointIndex + 1} / ${segments.length + 1}`);
    addRow("Топливо", state.fuel.toFixed(0));
    addRow("Деньги", state.money.toFixed(0) + "₽");
    addRow("Сытость", state.hunger.toFixed(0));
    addRow("Бодрость", state.fatigue.toFixed(0));
  }

  // Инвентарь
  if (inventoryWrapper && state.ui) {
    inventoryWrapper.classList.toggle("inventory-collapsed", !state.ui.inventoryOpen);
  }
  if (btnToggleInventory && state.ui) {
    btnToggleInventory.textContent = state.ui.inventoryOpen
      ? "Инвентарь (I) ▾"
      : "Инвентарь (I) ▸";
  }

  if (inventoryPanel) {
    inventoryPanel.innerHTML = "";
    const items = state.inventory || [];

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "inventory-empty";
      empty.textContent = "Инвентарь пуст.";
      inventoryPanel.appendChild(empty);
    } else {
      items.forEach((item) => {
        const cell = document.createElement("div");
        cell.className = "inventory-item";

        const iconWrap = document.createElement("div");
        iconWrap.className = "inventory-item-icon";
        const img = document.createElement("img");
        const sprite = sprites[item.iconKey];
        if (sprite) {
          img.src = sprite.src;
        }
        img.alt = item.name;
        iconWrap.appendChild(img);

        const label = document.createElement("div");
        label.className = "inventory-item-label";
        label.textContent = item.name;

        cell.title = item.description || item.name;
        cell.appendChild(iconWrap);
        cell.appendChild(label);
        inventoryPanel.appendChild(cell);
      });
    }
  }
}

function checkFailConditions() {
  if (state.hunger <= 0) {
    endGame(
      "Вы умерли от голода.",
      "Вы игнорировали необходимость есть. В следующей попытке следите за сытостью."
    );
    return true;
  }
  if (state.fatigue <= 0) {
    endGame(
      "Вы вымотались до бессознательного состояния.",
      "Вы не давали себе отдохнуть и уснули за рулём. Делайте остановки для сна."
    );
    return true;
  }
  return false;
}

function endGame(title, description) {
  state.alive = false;
  const t = qid("endTitle");
  const d = qid("endDescription");
  if (t) t.textContent = title;
  if (d) d.textContent = description;
  setScreen("screen-end");
}

function endSuccess() {
  state.finished = true;
  const t = qid("endTitle");
  const d = qid("endDescription");
  if (t) t.textContent = "Вы доехали до финальной точки!";
  if (d) d.textContent =
    "Несмотря на рискованных попутчиков и нехватку ресурсов, вы добрались до конца маршрута.";
  setScreen("screen-end");
}
