// src/scenes/road/road-update.js

function _clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
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
  if (typeof state.road.carX !== "number") state.road.carX = ROAD_X1;
  if (typeof state.road.carScreenRow !== "number") state.road.carScreenRow = ROAD_CAR_SCREEN_ROW;

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
  state.road.carX = _clamp(state.road.carX, ROAD_X0, ROAD_X1);

  // если упёрлись в край — сообщаем (но не спамим каждый кадр)
  if (prevX !== state.road.carX) {
    const hitLeft = state.road.carX === ROAD_X0 && vx < 0;
    const hitRight = state.road.carX === ROAD_X1 && vx > 0;
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
  for (const ent of entities) {
    if (!ent || ent.triggered) continue;

    // триггер только если на строке сущности и в зоне x == ent.xZone
    // используем proximity, чтобы не требовать точного попадания в целую ячейку
    const zoneX = (typeof ent.xZone === 'number') ? ent.xZone : ROAD_INTERACT_X;
    if (ent.row === carWorldRow && Math.abs((state.road.carX || 0) - zoneX) < 0.6) {
      ent.triggered = true;

      if (ent.kind === "hitchhiker") {
        triggerHitchhikerEvent(ent.hitchhiker);
      } else {
        // npc: don't open a blocking dialog in road view; just mark triggered
        ent.triggered = true;
      }

      break;
    }
  }

  if (typeof renderRoadScene === "function") renderRoadScene();
}

if (typeof window !== "undefined") {
  window.updateRoad = updateRoad;
}
