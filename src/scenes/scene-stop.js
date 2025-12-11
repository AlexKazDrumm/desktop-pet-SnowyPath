/**
 * Типы зданий в хабе
 * @typedef {'gas'|'food'|'hotel'|'work'} HubBuildingType
 */

/**
 * @typedef {{
 *   id?: string;
 *   type: HubBuildingType;
 *   label: string;
 *   hint: string;
 *   relX: number;
 *   relY: number;
 *   relW: number;
 *   relH: number;
 *   spriteKey?: string; // опциональный ключ спрайта для конкретного здания
 * }} HubBuildingConfig
 */

/**
 * @typedef {{
 *   relX: number;
 *   relY: number;
 *   relW: number;
 *   relH: number;
 * }} HubCarConfig
 */

/**
 * @typedef {{
 *   pointIndex: number;
 *   backgroundKey?: string; // фон хаба
 *   car?: HubCarConfig;     // позиция машины игрока
 *   buildings: HubBuildingConfig[];
 * }} HubConfig
 */

/**
 * Получить конфиг текущего хаба по индексу точки
 * @returns {HubConfig}
 */
function getCurrentHubConfig() {
  const idx = clamp(state.currentPointIndex || 0, 0, hubConfigs.length - 1);
  return hubConfigs[idx];
}

// Дефолтные спрайты по типу, если для здания не задан свой spriteKey
const poiSpriteDefaults = {
  gas: "hubGas",
  food: "hubFood",
  hotel: "hubHotel",
  work: "hubWork"
};

/**
 * Реальные координаты машины на хабе
 * @returns {null | {
 *   x: number;
 *   y: number;
 *   w: number;
 *   h: number;
 *   interactX: number;
 *   interactY: number;
 *   interactW: number;
 *   interactH: number;
 * }}
 */
function computeHubCar() {
  if (!stopCanvas) return null;
  const hub = getCurrentHubConfig();
  if (!hub.car) return null;

  const w = stopCanvas.width;
  const h = stopCanvas.height;

  const boxX = hub.car.relX * w;
  const boxY = hub.car.relY * h;
  const boxW = hub.car.relW * w;
  const boxH = hub.car.relH * h;

  const carSprite = sprites.car;
  let drawW = boxW;
  let drawH = boxH;
  let drawX = boxX;
  let drawY = boxY;

  if (
    carSprite &&
    carSprite.complete &&
    carSprite.naturalWidth > 0 &&
    carSprite.naturalHeight > 0
  ) {
    const aspect = carSprite.naturalWidth / carSprite.naturalHeight;
    drawW = boxW;
    drawH = drawW / aspect;
    if (drawH > boxH) {
      drawH = boxH;
      drawW = drawH * aspect;
    }
    drawX = boxX + (boxW - drawW) / 2;
    drawY = boxY + (boxH - drawH) / 2;
  }

  const x = drawX;
  const y = drawY;
  const width = drawW;
  const height = drawH;

  // Зона взаимодействия немного больше машины, чтобы было удобно попасть
  const padding = Math.max(8, Math.min(w, h) * 0.02);

  const interactX = x - padding;
  const interactY = y - padding;
  const interactW = width + padding * 2;
  const interactH = height + padding * 2;

  return {
    x,
    y,
    w: width,
    h: height,
    interactX,
    interactY,
    interactW,
    interactH
  };
}

/**
 * Реальные координаты зданий под текущий размер канваса.
 * ВАЖНО: x,y,w,h соответствуют ИМЕННО СПРАЙТУ (после вписывания по аспекту).
 * Зона взаимодействия снизу — по ширине = ширине спрайта.
 *
 * @returns {Array<{
 *   id: string;
 *   type: HubBuildingType;
 *   label: string;
 *   hint: string;
 *   spriteKey: string | null;
 *   x: number;
 *   y: number;
 *   w: number;
 *   h: number;
 *   interactX: number;
 *   interactY: number;
 *   interactW: number;
 *   interactH: number;
 * }>}
 */
function computeHubBuildings() {
  if (!stopCanvas) return [];
  const w = stopCanvas.width;
  const h = stopCanvas.height;

  const hub = getCurrentHubConfig();
  const interactBandHeight = Math.max(16, h * 0.04); // высота полосы взаимодействия

  return hub.buildings.map((b, index) => {
    // Базовая "рамка" под здание из нормализованных координат
    const boxX = b.relX * w;
    const boxY = b.relY * h;
    const boxW = b.relW * w;
    const boxH = b.relH * h;

    // Ключ спрайта: либо кастомный, либо дефолт по типу
    const spriteKey = b.spriteKey || poiSpriteDefaults[b.type] || null;
    const sprite = spriteKey ? sprites[spriteKey] : null;

    let drawW = boxW;
    let drawH = boxH;
    let drawX = boxX;
    let drawY = boxY;

    if (
      sprite &&
      sprite.complete &&
      sprite.naturalWidth > 0 &&
      sprite.naturalHeight > 0
    ) {
      const aspect = sprite.naturalWidth / sprite.naturalHeight;
      drawW = boxW;
      drawH = drawW / aspect;
      if (drawH > boxH) {
        drawH = boxH;
        drawW = drawH * aspect;
      }
      drawX = boxX + (boxW - drawW) / 2;
      drawY = boxY + (boxH - drawH) / 2;
    }

    const x = drawX;
    const y = drawY;
    const width = drawW;
    const height = drawH;

    // Полоса взаимодействия — строго по ширине спрайта, ВПРИТЫК под ним
    let interactX = x;
    let interactW = width;
    let interactY = y + height; // БЕЗ зазора
    let interactH = interactBandHeight;

    if (interactY + interactH > h - 8) {
      interactY = h - interactH - 8;
    }

    return {
      id: b.id || `${b.type}_${hub.pointIndex}_${index}`,
      type: b.type,
      label: b.label,
      hint: b.hint,
      spriteKey,
      x,
      y,
      w: width,
      h: height,
      interactX,
      interactY,
      interactW,
      interactH
    };
  });
}

/**
 * Проверка, что игрок в зоне взаимодействия здания
 * @param {{
 *   interactX:number;
 *   interactY:number;
 *   interactW:number;
 *   interactH:number;
 * }} poi
 */
function isNearPOI(poi) {
  const px = state.hub.x;
  const py = state.hub.y;
  return (
    px >= poi.interactX &&
    px <= poi.interactX + poi.interactW &&
    py >= poi.interactY &&
    py <= poi.interactY + poi.interactH
  );
}

/**
 * Проверка, что игрок рядом с машиной
 * @param {{interactX:number;interactY:number;interactW:number;interactH:number}} car
 */
function isNearCar(car) {
  const px = state.hub.x;
  const py = state.hub.y;
  return (
    px >= car.interactX &&
    px <= car.interactX + car.interactW &&
    py >= car.interactY &&
    py <= car.interactY + car.interactH
  );
}

/**
 * Проверка, что позиция игрока врезалась в какое-либо здание
 * (коллизия по прямоугольникам СПРАЙТОВ)
 *
 * @param {number} px
 * @param {number} py
 * @param {ReturnType<typeof computeHubBuildings>} buildings
 */
function collidesWithAnyBuilding(px, py, buildings) {
  for (const b of buildings) {
    if (
      px >= b.x &&
      px <= b.x + b.w &&
      py >= b.y &&
      py <= b.y + b.h
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Проверка, что позиция игрока врезалась в машину
 * @param {number} px
 * @param {number} py
 * @param {{x:number;y:number;w:number;h:number}} car
 */
function collidesWithCar(px, py, car) {
  return (
    px >= car.x &&
    px <= car.x + car.w &&
    py >= car.y &&
    py <= car.y + car.h
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

  const hubConfig = getCurrentHubConfig();

  // Конфиг текущего хаба
  const buildings = computeHubBuildings();
  const car = computeHubCar();

  // Если зашли в НОВЫЙ хаб — всегда начинаем В МАШИНЕ
  if (state.hub.hubPointIndex !== hubConfig.pointIndex) {
    if (car) {
      state.hub.x = car.x + car.w / 2;
      state.hub.y = car.y + car.h / 2;
      state.hub.inCar = true;
    } else {
      state.hub.x = w / 2;
      state.hub.y = h / 2;
      state.hub.inCar = false;
    }
    state.hub.hubPointIndex = hubConfig.pointIndex;
    if (w > 0 && h > 0) {
      state.hub.xNorm = state.hub.x / w;
      state.hub.yNorm = state.hub.y / h;
    }
  }

  // Обновляем позицию игрока ТОЛЬКО если он не в машине
  const speed = state.hub.speed;
  let vx = 0;
  let vy = 0;

  if (!state.hub.inCar) {
    if (keysPressed["KeyW"] || keysPressed["ArrowUp"]) vy -= 1;
    if (keysPressed["KeyS"] || keysPressed["ArrowDown"]) vy += 1;
    if (keysPressed["KeyA"] || keysPressed["ArrowLeft"]) vx -= 1;
    if (keysPressed["KeyD"] || keysPressed["ArrowRight"]) vx += 1;
  }

  const prevX = state.hub.x;
  const prevY = state.hub.y;

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

  // Ограничения по краям "площадки" хаба
  const margin = 40;
  state.hub.x = clamp(state.hub.x, margin, w - margin);
  state.hub.y = clamp(state.hub.y, margin, h - margin);

  // Коллизии со зданиями: если врезались — откатываем позицию
  if (collidesWithAnyBuilding(state.hub.x, state.hub.y, buildings)) {
    state.hub.x = prevX;
    state.hub.y = prevY;
  }

  // Коллизия с машиной (только если игрок пешком и машина есть)
  if (!state.hub.inCar && car && collidesWithCar(state.hub.x, state.hub.y, car)) {
    state.hub.x = prevX;
    state.hub.y = prevY;
  }

  // Обновляем нормализованные координаты игрока для корректного ресайза
  if (w > 0 && h > 0) {
    state.hub.xNorm = state.hub.x / w;
    state.hub.yNorm = state.hub.y / h;
  }

  // Рендер сцены
  ctx.clearRect(0, 0, w, h);

  // Фон города
  const bgSpriteKey = hubConfig.backgroundKey || null;
  const bgSprite = bgSpriteKey ? sprites[bgSpriteKey] : null;

  if (bgSprite && bgSprite.complete && bgSprite.naturalWidth > 0) {
    ctx.drawImage(bgSprite, 0, 0, w, h);
  } else {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, w, h);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let currentHint = "";

  // Сначала здания
  buildings.forEach((poi) => {
    const isNear = isNearPOI(poi);

    // Всегда рисуем рамку зоны взаимодействия (пунктир)
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "rgba(148,163,184,0.9)"; // сероватый
    ctx.lineWidth = 1;
    ctx.strokeRect(
      poi.interactX,
      poi.interactY,
      poi.interactW,
      poi.interactH
    );
    ctx.restore();

    // Если игрок в зоне — мягкая заливка поверх рамки (только пешком)
    if (isNear && !state.hub.inCar) {
      ctx.fillStyle = "rgba(34,197,94,0.16)";
      ctx.fillRect(
        poi.interactX,
        poi.interactY,
        poi.interactW,
        poi.interactH
      );
    }

    // Спрайт здания
    const spriteKey = poi.spriteKey;
    const sprite = spriteKey ? sprites[spriteKey] : null;

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, poi.x, poi.y, poi.w, poi.h);
    } else {
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

    if (isNear && !state.hub.inCar) {
      currentHint = poi.hint;
    }
  });

  // Машина игрока
  if (car) {
    const carSprite = sprites.car;
    if (carSprite && carSprite.complete && carSprite.naturalWidth > 0) {
      ctx.drawImage(carSprite, car.x, car.y, car.w, car.h);
    } else {
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(car.x, car.y, car.w, car.h);
    }

    // Если рядом с машиной — подсказка по машине
    if (isNearCar(car)) {
      currentHint = state.hub.inCar
        ? "E — выйти из машины"
        : "E — сесть в машину";
    }
  }

  // Игрок: МЕНЬШЕ исходный масштаб
  const px = state.hub.x;
  const py = state.hub.y;
  const playerSize = Math.max(8, Math.round(h * 0.025)); // было ~0.035

  const playerSprite = sprites.player;
  const angle = state.hub.angle ?? -Math.PI / 2; // по умолчанию вверх

  if (!state.hub.inCar) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);

    if (
      playerSprite &&
      playerSprite.complete &&
      playerSprite.naturalWidth > 0
    ) {
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
  }

  const hintEl = qid("stopHint");
  if (hintEl) {
    hintEl.textContent =
      currentHint ||
      (state.hub.inCar
        ? "Подойди к машине и нажми E, чтобы выйти. M — открыть карту маршрута."
        : "Подойди к зданию и нажми E. M — открыть карту маршрута.");
  }
}

/**
 * Взаимодействие на хабе (E)
 */
function handleHubInteract() {
  if (!stopCanvas) return;

  const car = computeHubCar();
  const buildings = computeHubBuildings();
  const nearCar = car ? isNearCar(car) : false;

  // Если рядом с машиной — приоритетно обрабатываем посадку/выход
  if (nearCar && car) {
    if (state.hub.inCar) {
      // ВЫХОД ИЗ МАШИНЫ — пытаемся появиться СБОКУ,
      // избегая телепорта внутрь зданий
      const centerX = car.x + car.w / 2;
      const centerY = car.y + car.h / 2;

      const exitOffsets = [
        { dx: car.w * 0.7, dy: 0 },           // справа
        { dx: -car.w * 0.7, dy: 0 },          // слева
        { dx: 0, dy: car.h * 0.9 },           // снизу (fallback)
        { dx: 0, dy: -car.h * 0.9 }           // сверху (на всякий)
      ];

      let foundPos = null;
      for (const off of exitOffsets) {
        const candX = centerX + off.dx;
        const candY = centerY + off.dy;
        if (!collidesWithAnyBuilding(candX, candY, buildings)) {
          foundPos = { x: candX, y: candY };
          break;
        }
      }

      // На всякий случай, если вдруг всё занято
      if (!foundPos) {
        foundPos = {
          x: centerX,
          y: car.y + car.h + Math.max(4, car.h * 0.2)
        };
      }

      state.hub.inCar = false;
      state.hub.x = foundPos.x;
      state.hub.y = foundPos.y;
    } else {
      // СЕСТЬ В МАШИНУ — центр по машине
      state.hub.inCar = true;
      state.hub.x = car.x + car.w / 2;
      state.hub.y = car.y + car.h / 2;
    }
    return;
  }

  // В машине нельзя интерактить здания
  if (state.hub.inCar) return;

  const nearPoi = buildings.find((poi) => isNearPOI(poi));
  if (!nearPoi) return;

  // Логика завязана на тип здания
  if (nearPoi.type === "gas") {
    const amount = 10;
    const cost = amount * 1;
    if (state.money < cost) {
      alert("Недостаточно денег для покупки топлива.");
      return;
    }
    adjustResources({ fuel: amount, money: -cost });
    renderStats();
  } else if (nearPoi.type === "food") {
    const cost = 10;
    if (state.money < cost) {
      alert("Недостаточно денег для еды.");
      return;
    }
    adjustResources({ money: -cost, hunger: 40 });
    renderStats();
  } else if (nearPoi.type === "hotel") {
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
  } else if (nearPoi.type === "work") {
    adjustResources({ money: 30, hunger: -10, fatigue: -10 });
    if (checkFailConditions()) return;
    renderStats();
  }
}

/**
 * Ресайз канваса остановки
 * — подгоняем под высоту контейнера минус нижнюю панель
 * — сохраняем относительную позицию игрока, чтобы он не телепортировался
 *   и не оказывался под меню
 */
function resizeStopCanvas() {
  if (!stopCanvas) return;

  const container = stopCanvas.parentElement;
  /** @type {HTMLElement|null} */
  const bottomBarEl = document.querySelector(".stop-bottom-bar");

  const bottomBarHeight =
    (bottomBarEl && bottomBarEl.clientHeight) ? bottomBarEl.clientHeight : 172;

  const prevW =
    stopCanvas.width ||
    (container ? container.clientWidth : stopCanvas.clientWidth) ||
    1;

  const prevH =
    stopCanvas.height ||
    (container ? container.clientHeight - bottomBarHeight : stopCanvas.clientHeight - bottomBarHeight) ||
    1;

  const width = container ? container.clientWidth : stopCanvas.clientWidth;
  let height =
    (container ? container.clientHeight : stopCanvas.clientHeight) -
    bottomBarHeight;

  if (height < 100) height = 100;

  if (width > 0 && height > 0) {
    stopCanvas.width = width;
    stopCanvas.height = height;
  }

  if (state.mode === "stop") {
    // Если уже есть нормализованные координаты — рескейлим
    if (
      typeof state.hub.xNorm === "number" &&
      typeof state.hub.yNorm === "number"
    ) {
      state.hub.x = state.hub.xNorm * width;
      state.hub.y = state.hub.yNorm * height;
    } else {
      const normX = state.hub.x / prevW;
      const normY = state.hub.y / prevH;
      state.hub.x = normX * width;
      state.hub.y = normY * height;
    }

    if (width > 0 && height > 0) {
      state.hub.xNorm = state.hub.x / width;
      state.hub.yNorm = state.hub.y / height;
    }
  }
}
