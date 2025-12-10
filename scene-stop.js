// scene-stop.js

// Нормализованные координаты (в долях от ширины/высоты канваса)
const hubLayoutNormalized = [
  {
    id: "gas",
    relX: 0.12,
    relY: 0.26,
    relW: 0.17,
    relH: 0.20,
    label: "Заправка",
    hint: "E — купить 10 топлива за 10₽."
  },
  {
    id: "food",
    relX: 0.42,
    relY: 0.18,
    relW: 0.18,
    relH: 0.18,
    label: "Еда",
    hint: "E — поесть (+40 сытости за 10₽)."
  },
  {
    id: "hotel",
    relX: 0.12,
    relY: 0.60,
    relW: 0.19,
    relH: 0.22,
    label: "Гостиница",
    hint: "E — поспать (до 100 бодрости за 25₽, -10 сытости)."
  },
  {
    id: "work",
    relX: 0.45,
    relY: 0.60,
    relW: 0.19,
    relH: 0.22,
    label: "Подработка",
    hint: "E — поработать (+30₽, -10 сытости, -10 бодрости)."
  }
];

/**
 * Возвращает реальные координаты зданий под текущий размер канваса
 */
function computeHubPOIs() {
  if (!stopCanvas) return [];
  const w = stopCanvas.width;
  const h = stopCanvas.height;
  return hubLayoutNormalized.map((poi) => ({
    id: poi.id,
    label: poi.label,
    hint: poi.hint,
    x: poi.relX * w,
    y: poi.relY * h,
    w: poi.relW * w,
    h: poi.relH * h
  }));
}

/**
 * Проверка, что игрок рядом с POI
 * @param {{x:number,y:number,w:number,h:number}} poiRect
 */
function isNearPOI(poiRect) {
  return (
    state.hub.x > poiRect.x - 10 &&
    state.hub.x < poiRect.x + poiRect.w + 10 &&
    state.hub.y > poiRect.y - 10 &&
    state.hub.y < poiRect.y + poiRect.h + 10
  );
}

/**
 * Квантование угла в 8 направлений (по 45°)
 * @param {number} angleRad
 */
function snapAngleTo8Directions(angleRad) {
  const sectorAngle = Math.PI / 4; // 45°
  const sectorIndex = Math.round(angleRad / sectorAngle);
  return sectorIndex * sectorAngle;
}

/**
 * Рендер хаба (остановки)
 * @param {number} dt
 */
function renderStopHub(dt) {
  if (!stopCtx || !stopCanvas) return;
  const ctx = stopCtx;
  const w = stopCanvas.width;
  const h = stopCanvas.height;

  // Обновление позиции игрока
  const speed = state.hub.speed;
  let vx = 0;
  let vy = 0;

  if (keysPressed["KeyW"] || keysPressed["ArrowUp"]) vy -= 1;
  if (keysPressed["KeyS"] || keysPressed["ArrowDown"]) vy += 1;
  if (keysPressed["KeyA"] || keysPressed["ArrowLeft"]) vx -= 1;
  if (keysPressed["KeyD"] || keysPressed["ArrowRight"]) vx += 1;

  if (vx !== 0 || vy !== 0) {
    const len = Math.sqrt(vx * vx + vy * vy) || 1;
    vx /= len;
    vy /= len;

    state.hub.x += vx * speed * dt;
    state.hub.y += vy * speed * dt;

    // 8 направлений: запоминаем направление и угол
    state.hub.dirX = vx;
    state.hub.dirY = vy;
    const rawAngle = Math.atan2(vy, vx);
    state.hub.angle = snapAngleTo8Directions(rawAngle);
  }

  // Ограничения по краям
  const margin = 40;
  state.hub.x = clamp(state.hub.x, margin, w - margin);
  state.hub.y = clamp(state.hub.y, margin, h - margin);

  // Рендер
  ctx.clearRect(0, 0, w, h);

  // Фон
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, w, h);

  // Здания (POI)
  const pois = computeHubPOIs();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let currentHint = "";

  const poiSpriteMap = {
    gas: "hubGas",
    food: "hubFood",
    hotel: "hubHotel",
    work: "hubWork"
  };

  pois.forEach((poi) => {
    const isNear = isNearPOI(poi);

    // Мягкая подсветка зоны, только если мы в радиусе
    if (isNear) {
      ctx.fillStyle = "rgba(34,197,94,0.16)";
      ctx.fillRect(
        poi.x - 8,
        poi.y - 8,
        poi.w + 16,
        poi.h + 16
      );
    }

    // Спрайт здания
    const spriteKey = poiSpriteMap[poi.id] || null;
    const sprite = spriteKey ? sprites[spriteKey] : null;

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      const aspect = sprite.naturalWidth / sprite.naturalHeight;

      // вписываем спрайт в прямоугольник poi, сохраняя пропорции
      let drawW = poi.w;
      let drawH = drawW / aspect;
      if (drawH > poi.h) {
        drawH = poi.h;
        drawW = drawH * aspect;
      }

      const drawX = poi.x + (poi.w - drawW) / 2;
      const drawY = poi.y + (poi.h - drawH) / 2;

      ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
    } else {
      // Фолбек — прямоугольник
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(poi.x, poi.y, poi.w, poi.h);
    }

    // Подпись под зданием
    ctx.font = "13px system-ui";
    ctx.fillStyle = "#e5e7eb";
    ctx.textBaseline = "top";
    ctx.fillText(
      poi.label,
      poi.x + poi.w / 2,
      poi.y + poi.h + 6
    );

    // Если мы рядом — выводим над зданием короткую подсказку
    if (isNear) {
      ctx.font = "11px system-ui";
      ctx.fillStyle = "#a5f3fc";
      ctx.textBaseline = "bottom";
      ctx.fillText(
        poi.hint,
        poi.x + poi.w / 2,
        poi.y - 6
      );
      currentHint = poi.hint;
    }
  });

  // Игрок
  const px = state.hub.x;
  const py = state.hub.y;
  const playerSize = 16;

  const playerSprite = sprites.player;
  const angle = state.hub.angle ?? -Math.PI / 2; // по умолчанию вверх

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);

  if (playerSprite && playerSprite.complete && playerSprite.naturalWidth > 0) {
    ctx.drawImage(
      playerSprite,
      -playerSize,
      -playerSize,
      playerSize * 2,
      playerSize * 2
    );
  } else {
    ctx.fillStyle = "#f97316";
    ctx.fillRect(-playerSize, -playerSize, playerSize * 2, playerSize * 2);
  }

  ctx.restore();

  const hintEl = qid("stopHint");
  if (hintEl) {
    hintEl.textContent =
      currentHint ||
      "Подойди к зданию и нажми E. M — открыть карту маршрута.";
  }
}

/**
 * Взаимодействие на хабе (E)
 */
function handleHubInteract() {
  if (!stopCanvas) return;
  const pois = computeHubPOIs();
  const nearPoi = pois.find((poi) => isNearPOI(poi));
  if (!nearPoi) return;

  if (nearPoi.id === "gas") {
    // Покупаем фиксированные 10 топлива за 10₽
    const amount = 10;
    const cost = amount * 1;
    if (state.money < cost) {
      alert("Недостаточно денег для покупки топлива.");
      return;
    }
    adjustResources({ fuel: amount, money: -cost });
    renderStats();
  } else if (nearPoi.id === "food") {
    const cost = 10;
    if (state.money < cost) {
      alert("Недостаточно денег для еды.");
      return;
    }
    adjustResources({ money: -cost, hunger: 40 });
    renderStats();
  } else if (nearPoi.id === "hotel") {
    const cost = 25;
    if (state.money < cost) {
      alert("Недостаточно денег на гостиницу.");
      return;
    }
    state.money -= cost;
    state.fatigue = 100;
    state.hunger = clamp(state.hunger - 10, 0, 100);
    if (checkFailConditions()) return;
    renderStats();
  } else if (nearPoi.id === "work") {
    adjustResources({ money: 30, hunger: -10, fatigue: -10 });
    if (checkFailConditions()) return;
    renderStats();
  }
}

/**
 * Ресайз канваса остановки
 */
function resizeStopCanvas() {
  if (!stopCanvas) return;
  const width = stopCanvas.clientWidth;
  const height = stopCanvas.clientHeight;
  if (width > 0 && height > 0) {
    stopCanvas.width = width;
    stopCanvas.height = height;
  }

  // При первом ресайзе центрируем персонажа
  if (state.mode === "stop" && state.hub.x === 400 && state.hub.y === 225) {
    state.hub.x = width / 2;
    state.hub.y = height / 2;
  }
}
