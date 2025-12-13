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

  // ===== рулёжка: плавно (вектор по X), без телепорта =====
  const left = keysPressed["KeyA"] || keysPressed["ArrowLeft"];
  const right = keysPressed["KeyD"] || keysPressed["ArrowRight"];

  const turnSpeed = 4.0; // тайлов/сек по X
  let vx = 0;
  if (left) vx -= turnSpeed;
  if (right) vx += turnSpeed;

  if (typeof state.road.carX !== "number") state.road.carX = 8.5;

  const prevX = state.road.carX;
  state.road.carX += vx * dt;

  // коллизия: с дороги съезжать нельзя (дорога x=6..9)
  state.road.carX = _clamp(state.road.carX, ROAD_X0, ROAD_X1);

  if (prevX !== state.road.carX && (prevX < ROAD_X0 || prevX > ROAD_X1)) {
    state.lastMessage = "Съезжать с дороги нельзя.";
  }

  // ===== движение вперёд: 1 тайл/сек (скролл) =====
  if (typeof state.road.scroll !== "number") state.road.scroll = 0;
  if (typeof state.road._scrollAcc !== "number") state.road._scrollAcc = 0;

  state.road._scrollAcc += dt * 1.0; // 1 тайл/сек

  while (state.road._scrollAcc >= 1.0) {
    state.road._scrollAcc -= 1.0;
    state.road.scroll += 1.0;

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
  }

  // ===== интеракт: только если въехали в зелёную зону =====
  const worldTopRow = Math.floor(state.road.scroll);
  const carScreenRow = (typeof state.road.carScreenRow === "number") ? state.road.carScreenRow : 4;
  const carWorldRow = worldTopRow + carScreenRow;
  const carCellX = Math.round(state.road.carX);

  const entities = Array.isArray(state.road.entities) ? state.road.entities : [];
  for (const ent of entities) {
    if (!ent || ent.triggered) continue;

    // триггер только если на строке сущности и в зоне x=ROAD_INTERACT_X
    if (ent.row === carWorldRow && carCellX === ROAD_INTERACT_X) {
      ent.triggered = true;

      if (ent.kind === "hitchhiker") {
        triggerHitchhikerEvent(ent.hitchhiker);
      } else {
        // npc
        roadDialogOpen(
          ["NPC", "Вы остановились у человека на обочине."],
          [{ id: "ok", label: "Ок", onPick: () => roadDialogClose() }]
        );
      }

      break;
    }
  }

  if (typeof renderRoadScene === "function") renderRoadScene();
}

if (typeof window !== "undefined") {
  window.updateRoad = updateRoad;
}
