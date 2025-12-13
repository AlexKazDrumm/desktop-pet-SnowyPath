// fuel-event.js — handling out-of-fuel event UI/logic

function triggerOutOfFuelEvent() {
  const container = qid("eventContainer");
  if (!container) return;

  container.innerHTML = "";

  const p = document.createElement("p");
  p.className = "event-text";
  p.textContent = "У вас кончилось топливо посреди дороги. Вы ждёте помощи.";

  const btns = document.createElement("div");
  btns.className = "event-buttons";

  const btnAskHelp = document.createElement("button");
  btnAskHelp.textContent = "Ждать машину и просить помощи";
  btnAskHelp.onclick = () => {
    const gainedFuel = 25;
    state.fuel += gainedFuel;
    state.lastMessage = `Добрый водитель дал вам ${gainedFuel} единиц топлива и дотащил до ближайшей остановки.`;
    const statusEl = qid("roadStatus");
    if (statusEl) statusEl.textContent = state.lastMessage;

    state.road.active = false;
    state.road.distanceTravelled = 0;
    state.mode = "stop";
    setScreen("screen-stop");
    renderStats();
  };

  btns.appendChild(btnAskHelp);
  container.appendChild(p);
  container.appendChild(btns);

  const btnContinue = qid("btnRoadContinue");
  if (btnContinue) {
    btnContinue.textContent = "Ничего не делать";
    btnContinue.onclick = () => {
      btnAskHelp.onclick();
    };
  }

  const statusEl = qid("roadStatus");
  if (statusEl) statusEl.textContent = "Вы заглохли.";
  renderStats();
}
