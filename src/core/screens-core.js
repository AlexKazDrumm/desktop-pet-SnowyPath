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
  addStat("Бензин", state.fuel.toFixed(0));
  addStat("Деньги", state.money.toFixed(0));
  addStat("Голод", state.hunger.toFixed(0));
  addStat("Усталость", state.fatigue.toFixed(0));

  if (typeof renderStopUI === "function") {
    renderStopUI();
  }
}

/**
 * Переключение экранов
 * @param {"screen-menu"|"screen-stop"|"screen-map"|"screen-road"|"screen-end"|"screen-lose"} screenId
 */
function setScreen(screenId) {
  const ids = ["screen-menu", "screen-stop", "screen-map", "screen-road", "screen-end", "screen-lose"];

  for (const id of ids) {
    const el = qid(id);
    if (!el) continue;
    if (id === screenId) el.classList.remove("hidden");
    else el.classList.add("hidden");
  }

  if (screenId === "screen-map") {
    state.mode = "map";
    if (typeof enterMapScene === "function") enterMapScene();
    if (typeof renderMap === "function") renderMap();
    if (typeof renderMapInfo === "function") renderMapInfo();
  } else if (screenId === "screen-stop") {
    state.mode = "stop";
    if (typeof resizeStopCanvas === "function") resizeStopCanvas();
  } else if (screenId === "screen-road") {
    state.mode = "road";
    if (typeof enterRoadScene === "function") enterRoadScene();
    if (typeof resizeRoadCanvas === "function") resizeRoadCanvas();
    if (typeof renderRoadScene === "function") renderRoadScene();
  } else if (screenId === "screen-end") {
    state.mode = "end";
  } else if (screenId === "screen-lose") {
    state.mode = "lose";
  } else if (screenId === "screen-menu") {
    state.mode = "menu";
  }

  const statsBar = qid("statsBar");
  if (statsBar) {
    statsBar.classList.toggle(
      "hidden",
      screenId === "screen-menu" || screenId === "screen-stop" || screenId === "screen-map" || screenId === "screen-lose"
    );
  }

  renderStats();
}
