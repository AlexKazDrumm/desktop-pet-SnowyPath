// scene-road.js

function updateRoad(dt) {
  if (!roadCtx || !roadCanvas) return;
  if (!state.road.active) {
    renderRoadScene();
    return;
  }
  if (state.road.pausedForEvent) {
    renderRoadScene();
    return;
  }

  // Обновляем пройденное расстояние
  state.road.distanceTravelled += state.road.speed * dt;
  if (state.road.distanceTravelled > state.road.distanceTotal) {
    state.road.distanceTravelled = state.road.distanceTotal;
  }

  // Триггерим события автостопщиков
  for (const evt of state.road.hitchhikerEvents) {
    if (!evt.triggered && state.road.distanceTravelled >= evt.position) {
      evt.triggered = true;
      triggerHitchhikerEvent(evt.hitchhiker);
      break; // по одному событию за раз
    }
  }

  // Если доехали до конца
  if (state.road.distanceTravelled >= state.road.distanceTotal) {
    state.currentPointIndex = state.road.toPoint;
    state.road.active = false;

    // Если добрались до последней точки маршрута — победа
    if (state.currentPointIndex >= mapPoints.length - 1) {
      endSuccess();
      return;
    }

    setScreen("screen-stop");
    renderStats();
    return;
  }

  renderRoadScene();

  const progressEl = qid("roadProgress");
  if (progressEl) {
    const perc =
      (state.road.distanceTravelled / Math.max(state.road.distanceTotal, 1)) *
      100;
    progressEl.textContent = `Пройдено: ${state.road.distanceTravelled.toFixed(
      1
    )} / ${state.road.distanceTotal.toFixed(1)} (${perc.toFixed(0)}%)`;
  }
}

function renderRoadScene() {
  if (!roadCtx || !roadCanvas) return;
  const ctx = roadCtx;
  const w = roadCanvas.width;
  const h = roadCanvas.height;

  ctx.clearRect(0, 0, w, h);

  // Фон
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, w, h);

  // Дорога
  const roadWidth = 260;
  const roadX = (w - roadWidth) / 2;
  ctx.fillStyle = "#111827";
  ctx.fillRect(roadX, 0, roadWidth, h);

  // Разметка
  ctx.strokeStyle = "#6b7280";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(roadX + roadWidth / 2, 0);
  ctx.lineTo(roadX + roadWidth / 2, h);
  ctx.stroke();
  ctx.setLineDash([]);

  // Машина
  const carSprite = sprites.car;
  const carWidth = 32;
  const carHeight = 48;

  const laneCenter = roadX + roadWidth / 2;
  const baseCarY = h - 80;

  let carOffsetX = 0;
  if (keysPressed["KeyA"] || keysPressed["ArrowLeft"]) carOffsetX -= 40;
  if (keysPressed["KeyD"] || keysPressed["ArrowRight"]) carOffsetX += 40;

  const carX = laneCenter + carOffsetX;
  const carY = baseCarY;

  if (carSprite && carSprite.complete && carSprite.naturalWidth > 0) {
    ctx.drawImage(
      carSprite,
      carX - carWidth / 2,
      carY - carHeight / 2,
      carWidth,
      carHeight
    );
  } else {
    ctx.fillStyle = "#f97316";
    ctx.fillRect(carX - carWidth / 2, carY - carHeight / 2, carWidth, carHeight);
  }

  // "Обочина" для ощущения движения
  const t = state.road.distanceTravelled;
  ctx.fillStyle = "#22c55e";
  for (let i = 0; i < 5; i++) {
    const yPos = ((t * 20 + i * 100) % (h + 100)) - 100;
    ctx.fillRect(roadX - 30, yPos, 20, 40);
    ctx.fillRect(roadX + roadWidth + 10, yPos + 40, 20, 40);
  }

  // Если мы остановились возле автостопщика — показать его на обочине
  if (state.currentHitchhiker) {
    const hitchSprite = sprites.hitchhiker;
    const hitchWidth = 28;
    const hitchHeight = 40;
    const hitchX = roadX + roadWidth + 40; // справа от дороги
    const hitchY = h / 2;

    if (hitchSprite && hitchSprite.complete && hitchSprite.naturalWidth > 0) {
      ctx.drawImage(
        hitchSprite,
        hitchX - hitchWidth / 2,
        hitchY - hitchHeight / 2,
        hitchWidth,
        hitchHeight
      );
    } else {
      ctx.fillStyle = "#eab308";
      ctx.fillRect(
        hitchX - hitchWidth / 2,
        hitchY - hitchHeight / 2,
        hitchWidth,
        hitchHeight
      );
    }
  }
}

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
