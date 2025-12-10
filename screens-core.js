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
    renderMap();
    renderMapInfo();
  } else if (screenId === "screen-stop") {
    state.mode = "stop";
    resizeStopCanvas();
  } else if (screenId === "screen-road") {
    state.mode = "road";
  } else if (screenId === "screen-end") {
    state.mode = "end";
  } else if (screenId === "screen-menu") {
    state.mode = "menu";
  }

  const statsBar = qid("statsBar");
  if (statsBar) {
    statsBar.classList.toggle("hidden", screenId === "screen-menu");
  }

  renderStats();
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
