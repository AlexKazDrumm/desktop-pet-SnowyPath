// road-update.js — update loop logic for the road scene

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
