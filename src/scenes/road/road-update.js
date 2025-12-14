// src/scenes/road/road-update.js

function _clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function _carHitHalf() {
  const frac = (typeof ROAD_CAR_HITBOX_FRAC === "number") ? ROAD_CAR_HITBOX_FRAC : 0.75;
  return Math.max(0.1, Math.min(0.95, frac)) * 0.5;
}

function _carBoundsX(carX) {
  const half = _carHitHalf();
  const center = (typeof carX === "number" ? carX : ROAD_CAR_START_X) + 0.5;
  return {
    center,
    half,
    left: center - half,
    right: center + half,
  };
}

function _clampCarX(carX) {
  const half = _carHitHalf();
  const minX = ROAD_X0 + half - 0.5;
  const maxX = ROAD_X1 + 0.5 - half;
  return _clamp(carX, minX, maxX);
}

function _finalizeBuildingChoice(building, afterAction) {
  try {
    if (building) {
      building.triggered = true;
      building._pending = false;
    }
    if (typeof afterAction === "function") afterAction();
    state.road._activeBuildingId = null;
    roadDialogClose();
    if (typeof renderStats === "function") renderStats();
  } catch (e) { /* ignore */ }
}

function _triggerBuildingInteraction(building) {
  if (!building || !state || !state.road) return;

  state.road._activeBuildingId = building.id || null;

  const lines = [building.hint || "Остановиться у здания?"];
  const choices = [];

  if (building.type === "gas") {
    const amount = 10;
    const cost = 10;
    choices.push({
      id: "refuel",
      label: `Заправиться (+${amount} топлива за ${cost}₽)`,
      onPick: () => {
        if (state.money < cost) {
          alert("Недостаточно денег для покупки топлива.");
          return;
        }
        _finalizeBuildingChoice(building, () => adjustResources({ fuel: amount, money: -cost }));
      }
    });
  } else if (building.type === "food") {
    const cost = 10;
    const hungerGain = 40;
    choices.push({
      id: "eat",
      label: `Поесть (+${hungerGain} сытости за ${cost}₽)`,
      onPick: () => {
        if (state.money < cost) {
          alert("Недостаточно денег для еды.");
          return;
        }
        _finalizeBuildingChoice(building, () => adjustResources({ money: -cost, hunger: hungerGain }));
      }
    });
  } else if (building.type === "hotel") {
    const cost = 25;
    choices.push({
      id: "sleep",
      label: `Поспать (до 100 бодрости за ${cost}₽, -10 сытости)`,
      onPick: () => {
        if (state.money < cost) {
          alert("Недостаточно денег для отдыха.");
          return;
        }
        _finalizeBuildingChoice(building, () => adjustResources({ money: -cost, hunger: -10, fatigue: 100 }));
      }
    });
  } else if (building.type === "work") {
    choices.push({
      id: "work",
      label: "Подработать (+30₽, -10 сытости, -10 бодрости)",
      onPick: () => _finalizeBuildingChoice(building, () => adjustResources({ money: 30, hunger: -10, fatigue: -10 }))
    });
  } else {
    choices.push({
      id: "inspect",
      label: "Осмотреть здание",
      onPick: () => _finalizeBuildingChoice(building)
    });
  }

  choices.push({
    id: "skip",
    label: "Проехать мимо",
    onPick: () => _finalizeBuildingChoice(building)
  });

  roadDialogOpen(lines, choices);
}

function updateRoad(dt) {
  if (!state || state.mode !== "road") return;

  if (!state.road || !state.road.active) {
    if (typeof renderRoadScene === "function") renderRoadScene();
    return;
  }

  // если диалог/событие — не едем
  if (state.road.pausedForEvent || (state.road.dialog && state.road.dialog.open)) {
    if (typeof renderRoadScene === "function") renderRoadScene();
    return;
  }

  // ===== ИНИТ =====
  if (typeof state.road.carX !== "number") state.road.carX = ROAD_CAR_START_X;
  if (typeof state.road.carScreenRow !== "number") state.road.carScreenRow = ROAD_CAR_SCREEN_ROW;
  state.road.carX = _clampCarX(state.road.carX);

  // угол руления (радианы): 0 = прямо; отриц = влево; полож = вправо
  if (typeof state.road.carAngle !== "number") state.road.carAngle = 0;

  // скорости
  const forwardSpeed = 1.0; // тайл/сек по "пути" (скролл)
  const maxAngle = Math.PI * 0.28; // ~50°: назад не даём, но вбок достаточно
  const steerSpeed = Math.PI * 1.10; // рад/сек, как быстро крутится руль
  const autoCenter = Math.PI * 0.85; // рад/сек, возврат руля к 0 когда не жмём

  // ===== INPUT =====
  const left = keysPressed["KeyA"] || keysPressed["ArrowLeft"];
  const right = keysPressed["KeyD"] || keysPressed["ArrowRight"];

  // ===== РУЛЁЖКА (угол) =====
  if (left && !right) {
    state.road.carAngle -= steerSpeed * dt;
  } else if (right && !left) {
    state.road.carAngle += steerSpeed * dt;
  } else {
    // авто-центровка
    if (state.road.carAngle > 0) {
      state.road.carAngle = Math.max(0, state.road.carAngle - autoCenter * dt);
    } else if (state.road.carAngle < 0) {
      state.road.carAngle = Math.min(0, state.road.carAngle + autoCenter * dt);
    }
  }

  // ограничение — назад “нельзя” (мы просто не позволяем углу стать слишком большим)
  state.road.carAngle = _clamp(state.road.carAngle, -maxAngle, maxAngle);

  // ===== БОКОВОЕ СМЕЩЕНИЕ (диагональ) =====
  // Идея: движение — это вектор скорости, повернутый на угол руля.
  // Компоненты: vx = forward * sin(angle), vy = forward * cos(angle)
  const driftMultiplier = 1.0; // 1.0 — соответствие углу
  const angle = state.road.carAngle || 0;
  const vx = Math.sin(angle) * forwardSpeed * driftMultiplier; // боковая скорость (ячейки/сек)
  const vy = Math.cos(angle) * forwardSpeed; // продольная скорость (ячейки/сек)

  const prevX = state.road.carX;
  state.road.carX += vx * dt;

  // коллизия: с дороги съезжать нельзя (дорога x=6..9)
  const minCarX = ROAD_X0 + _carHitHalf() - 0.5;
  const maxCarX = ROAD_X1 + 0.5 - _carHitHalf();
  state.road.carX = _clamp(state.road.carX, minCarX, maxCarX);

  // если упёрлись в край — сообщаем (но не спамим каждый кадр)
  if (prevX !== state.road.carX) {
    const hitLeft = state.road.carX <= minCarX + 1e-4 && vx < 0;
    const hitRight = state.road.carX >= maxCarX - 1e-4 && vx > 0;
    if (hitLeft || hitRight) {
      if (!state.road._edgeMsgCooldown || state.road._edgeMsgCooldown <= 0) {
        state.lastMessage = "Съезжать с дороги нельзя.";
        state.road._edgeMsgCooldown = 0.7;
      }
    }
  }
  if (typeof state.road._edgeMsgCooldown === "number") {
    state.road._edgeMsgCooldown = Math.max(0, state.road._edgeMsgCooldown - dt);
  }

  // ===== ДВИЖЕНИЕ ВПЕРЁД: скролл =====
  if (typeof state.road.scroll !== "number") state.road.scroll = 0;

  // интегрируем продольную компоненту скорости напрямую — даём плавный float-scroll
  state.road.scroll += vy * dt;

  // конец пути?
  if (state.road.scroll >= state.road.distanceTotal) {
    state.road.scroll = state.road.distanceTotal;

    state.currentPointIndex = state.road.toPoint;
    state.road.active = false;

    if (state.currentPointIndex >= mapPoints.length - 1) {
      endSuccess();
      return;
    }

    setScreen("screen-stop");
    renderStats();
    return;
  }

  // ===== ИНТЕРАКТ: только если въехали в зелёную зону =====
  const worldTopRow = Math.floor(state.road.scroll);
  const carScreenRow = (typeof state.road.carScreenRow === "number")
    ? state.road.carScreenRow
    : ROAD_CAR_SCREEN_ROW;
  const viewRows = (typeof ROAD_VIEW_ROWS === "number") ? ROAD_VIEW_ROWS : 6;
  const carWorldRow = worldTopRow + (viewRows - 1 - carScreenRow);
  const carCellX = Math.round(state.road.carX);

  const entities = Array.isArray(state.road.entities) ? state.road.entities : [];
  const carWorldFloat = state.road.scroll + (viewRows - 1 - carScreenRow);
  state.road._activeBuildingId = null;
  for (const ent of entities) {
    if (!ent || ent.triggered || ent._pending) continue;

    // trigger when the camera/car is near the entity's world-row and within X proximity
    const side = ent.side === "left" ? "left" : "right";
    const zoneX = (typeof ent.xZone === 'number')
      ? ent.xZone
      : (side === "left" ? ROAD_LEFT_INTERACT_X : ROAD_RIGHT_INTERACT_X);
    const rowDist = Math.abs((ent.row || 0) - carWorldFloat);
    // require a *real* overlap: compute fractional overlap between
    // car cell [carX, carX+1) and the interact zone which sits near
    // the road edge of the `zoneX` cell.
    const zoneFrac = (typeof ROAD_INTERACT_FRAC === 'number') ? ROAD_INTERACT_FRAC : 0.28;
    const zoneStart = side === "left" ? zoneX : zoneX + (1 - zoneFrac);
    const zoneEnd = side === "left" ? zoneX + zoneFrac : zoneX + 1;
    const carBox = _carBoundsX(state.road.carX);
    const carLeft = carBox.left;
    const carRight = carBox.right;

    const overlapsX = (carRight > zoneStart) && (carLeft < zoneEnd);

    if (rowDist < 1.3 && overlapsX) {
      if (ent.kind === "hitchhiker") {
        // keep drawing the hitchhiker until player chooses; mark pending
        ent._pending = true;
        state.road._activeEntityId = ent.id || null;
        triggerHitchhikerEvent(ent.hitchhiker);
      } else {
        // npc: mark triggered immediately (non-blocking)
        ent.triggered = true;
      }

      break;
    }
  }

  // detect nearby buildings (для HUD/подсветки зон)
  const buildings = Array.isArray(state.road.buildings) ? state.road.buildings : [];
  for (const b of buildings) {
    if (!b || b.triggered || b._pending) continue;
    const side = b.side === "left" ? "left" : "right";
    const zoneX = (typeof b.interactX === 'number')
      ? b.interactX
      : (side === "left" ? ROAD_LEFT_INTERACT_X : ROAD_RIGHT_INTERACT_X);
    const zoneFrac = (typeof ROAD_INTERACT_FRAC === 'number') ? ROAD_INTERACT_FRAC : 0.28;
    const zoneStart = side === "left" ? zoneX : zoneX + (1 - zoneFrac);
    const zoneEnd = side === "left" ? zoneX + zoneFrac : zoneX + 1;
    const carBox = _carBoundsX(state.road.carX);
    const carLeft = carBox.left;
    const carRight = carBox.right;
    const overlapsX = (carRight > zoneStart) && (carLeft < zoneEnd);
    const withinRows = carWorldFloat >= (b.y0 - 0.25) && carWorldFloat <= (b.y1 + 0.25);

    if (withinRows && overlapsX) {
      // стопаемся сразу, не даём “проскочить кадр”
      b._pending = true;

      // фиксируем состояние остановки (на всякий случай — одинаково для всех ивентов)
      state.road.pausedForEvent = true;

      if (!state.road.dialog || !state.road.dialog.open) _triggerBuildingInteraction(b);
      break;
    }
  }

  if (typeof renderRoadScene === "function") renderRoadScene();
}

if (typeof window !== "undefined") {
  window.updateRoad = updateRoad;
}
