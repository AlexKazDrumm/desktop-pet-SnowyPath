// hitchhiker-event.js — UI and logic for hitchhiker events

function triggerHitchhikerEvent(h) {
  state.currentHitchhiker = h;
  state.road.pausedForEvent = true;
  renderHitchhikerEvent(h);
}

function renderHitchhikerEvent(h) {
  const container = qid("eventContainer");
  if (!container) return;

  container.innerHTML = "";

  const title = document.createElement("div");
  title.className = "event-text";
  title.innerHTML = `<strong>Автостопщик:</strong> ${h.name}`;

  const desc = document.createElement("p");
  desc.className = "event-text";
  desc.textContent = h.description;

  const tags = document.createElement("div");
  if (h.dangerLevel === "suspicious") {
    const tag = document.createElement("span");
    tag.className = "event-tag";
    tag.textContent = "кажется подозрительным";
    tags.appendChild(tag);
  } else {
    const tag = document.createElement("span");
    tag.className = "event-tag";
    tag.textContent = "выглядит обычным";
    tags.appendChild(tag);
  }

  const info = document.createElement("p");
  info.className = "event-text";
  info.textContent = `Он предлагает заплатить около ${h.basePay}₽ за поездку.`;

  const btns = document.createElement("div");
  btns.className = "event-buttons";

  const btnSkip = document.createElement("button");
  btnSkip.textContent = "Проехать мимо";
  btnSkip.onclick = () => {
    state.currentHitchhiker = null;
    state.road.pausedForEvent = false;
    state.mode = "road";
    renderRoadScene();
  };

  const btnAccept = document.createElement("button");
  btnAccept.textContent = "Взять без торга";
  btnAccept.onclick = () => {
    acceptHitchhiker(h, "base");
  };

  const btnBargainUp = document.createElement("button");
  btnBargainUp.textContent = "Поторговаться (больше денег)";
  btnBargainUp.onclick = () => {
    bargaining(h, "up");
  };

  const btnDiscount = document.createElement("button");
  btnDiscount.textContent = "Сделать скидку (меньше денег)";
  btnDiscount.onclick = () => {
    bargaining(h, "down");
  };

  btns.appendChild(btnSkip);
  btns.appendChild(btnAccept);
  btns.appendChild(btnBargainUp);
  btns.appendChild(btnDiscount);

  container.appendChild(title);
  container.appendChild(desc);
  container.appendChild(tags);
  container.appendChild(info);
  container.appendChild(btns);

  const btnContinue = qid("btnRoadContinue");
  if (btnContinue) {
    btnContinue.textContent = "Пропустить событие";
    btnContinue.onclick = () => {
      state.currentHitchhiker = null;
      state.road.pausedForEvent = false;
      state.mode = "road";
      renderRoadScene();
    };
  }

  const statusEl = qid("roadStatus");
  if (statusEl) statusEl.textContent = "Вы остановились возле автостопщика.";
}

function acceptHitchhiker(h, mode) {
  let pay = h.basePay;
  if (mode === "min") pay = h.minPay;
  if (mode === "max") pay = h.maxPay;
  adjustResources({ money: pay });
  state.lastMessage = `Вы подвезли пассажира и получили ${pay}₽.`;
  const statusEl = qid("roadStatus");
  if (statusEl) statusEl.textContent = state.lastMessage;
  state.currentHitchhiker = null;
  state.road.pausedForEvent = false;
  state.mode = "road";
  renderStats();
}

function bargaining(h, direction) {
  const rnd = Math.random();
  if (direction === "up") {
    if (rnd < 0.6) {
      const pay = randInt(h.basePay, h.maxPay);
      adjustResources({ money: pay });
      state.lastMessage = `Торг прошёл успешно. Вы получили ${pay}₽.`;
    } else if (rnd < 0.8) {
      const pay = h.minPay;
      adjustResources({ money: pay });
      state.lastMessage = `Пассажир сбил цену. Вы получили только ${pay}₽.`;
    } else {
      state.lastMessage = "Пассажир обиделся на торг и ушёл.";
      const statusEl2 = qid("roadStatus");
      if (statusEl2) statusEl2.textContent = state.lastMessage;
      state.currentHitchhiker = null;
      state.road.pausedForEvent = false;
      state.mode = "road";
      return;
    }
    const statusEl = qid("roadStatus");
    if (statusEl) statusEl.textContent = state.lastMessage;
    state.currentHitchhiker = null;
    state.road.pausedForEvent = false;
    state.mode = "road";
    renderStats();
  } else if (direction === "down") {
    const pay = randInt(h.minPay, h.basePay);
    adjustResources({ money: pay });
    state.lastMessage = `Вы дали скидку и получили ${pay}₽.`;
    const statusEl = qid("roadStatus");
    if (statusEl) statusEl.textContent = state.lastMessage;
    state.currentHitchhiker = null;
    state.road.pausedForEvent = false;
    state.mode = "road";
    renderStats();
  }
}
