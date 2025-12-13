// scene-map.js

function _getMappedMapPoints(stage, cityLayout) {
  const pts = Array.isArray(mapPoints) ? mapPoints : [];
  const out = [];
  if (!pts.length) return out;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (typeof p.x === 'number') { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); }
    if (typeof p.y === 'number') { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  }
  if (!isFinite(minX) || !isFinite(maxX)) {
    minX = 0; maxX = 100;
  }
  if (!isFinite(minY) || !isFinite(maxY)) {
    minY = 0; maxY = 100;
  }

  const cols = cityLayout.cols;
  const rows = cityLayout.rows;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const nx = (maxX === minX) ? (i / Math.max(1, pts.length - 1)) : ((p.x - minX) / (maxX - minX));
    const ny = (maxY === minY) ? 0.5 : ((p.y - minY) / (maxY - minY));

    const cx = Math.max(0, Math.min(cols - 1, Math.round(nx * (cols - 1))));
    const cy = Math.max(0, Math.min(rows - 1, Math.round(ny * (rows - 1))));

    const r = cellToRect(cx, cy, cityLayout);
    const cxPx = r.x + r.w / 2;
    const cyPx = r.y + r.h / 2;

    out.push({ index: i, cx, cy, x: cxPx, y: cyPx });
  }
  return out;
}

function renderMap() {
  if (!mapCtx || !mapCanvas) return;
  const ctx = mapCtx;
  const w = mapCanvas.width;
  const h = mapCanvas.height;

  const stage = computeStageLayout(w, h);
  const cityLayout = deriveCityLayout(stage);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, w, h);

  // draw subtle grid for city area
  ctx.save();
  ctx.fillStyle = "#071026";
  ctx.fillRect(cityLayout.offsetX, cityLayout.offsetY, cityLayout.gridW, cityLayout.gridH);
  ctx.strokeStyle = "rgba(74,85,104,0.12)";
  ctx.lineWidth = 1;
  for (let cy = 0; cy < cityLayout.rows; cy++) {
    for (let cx = 0; cx < cityLayout.cols; cx++) {
      const r = cellToRect(cx, cy, cityLayout);
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }
  }
  ctx.restore();

  // map points mapped to grid
  const mapped = _getMappedMapPoints(stage, cityLayout);

  // Lines between points
  ctx.strokeStyle = "#4b5563";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < mapped.length - 1; i++) {
    const a = mapped[i];
    const b = mapped[i + 1];
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  // Draw points
  const current = state.currentPointIndex;
  const radius = Math.max(8, Math.floor(cityLayout.cellSize * 0.35));

  for (let i = 0; i < mapped.length; i++) {
    const p = mapped[i];

    let color = "#6b7280";
    let fill = "#020617";

    const distFromCurrent = i >= current ? distanceFromToPoints(current, i) : 0;
    const reachable = i > current && distFromCurrent <= state.fuel;
    const visited = i < current;
    const isCurrent = i === current;
    const isSelected = state.map.selectedPointIndex === i;

    if (visited) {
      color = "#9ca3af";
      fill = "#111827";
    }
    if (isCurrent) {
      color = "#22c55e";
      fill = "#064e3b";
    } else if (reachable) {
      color = "#3b82f6";
      fill = "#1d4ed8";
    } else if (i > current) {
      color = "#991b1b";
      fill = "#450a0a";
    }

    ctx.lineWidth = isSelected ? 3 : 2;

    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.font = `${Math.max(10, Math.floor(cityLayout.cellSize * 0.28))}px system-ui`;
    ctx.fillStyle = "#e5e7eb";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(String(i + 1), p.x, p.y + radius + 3);
  }

  // draw HUD area at bottom similar to stop
  try {
    const hudRect = getHudRect(stage);
    drawPanel(ctx, hudRect);

    const rInstructions = hudCellsToRect(stage, 1, 8, 1, 2);
    const rInfo = hudCellsToRect(stage, 9, 12, 1, 2);
    const rStats = hudCellsToRect(stage, 13, 16, 1, 2);

    drawPanel(ctx, rInstructions);
    drawPanel(ctx, rInfo);
    drawPanel(ctx, rStats);

    drawTextInRect(ctx, "Кликни по синей точке, чтобы выбрать цель. \nНажми 'Поехать', чтобы начать.", rInstructions, { fontSize: Math.max(10, Math.floor(stage.cellSize * 0.18)), color: "#e5e7eb", maxLines: 3, padding: 6 });

    // info: selected distance
    const selected = state.map.selectedPointIndex;
    let infoText = `Текущая точка: ${state.currentPointIndex + 1} \nТопливо: ${state.fuel}`;
    if (selected != null && selected > state.currentPointIndex) {
      const dist = distanceFromToPoints(state.currentPointIndex, selected);
      infoText = `Выбрана точка: ${selected + 1} (дистанция ${dist})`;
    } else {
      infoText += "\nВыбери достижимую точку";
    }
    drawTextInRect(ctx, infoText, rInfo, { fontSize: Math.max(10, Math.floor(stage.cellSize * 0.18)), color: "#e5e7eb", maxLines: 3, padding: 6 });

    // stats on right (reuse stop HUD text if available)
    const statsText = (typeof buildStopStatsText === 'function') ? buildStopStatsText() : `Money: ${state.money}\nFuel: ${state.fuel}\nHungr: ${state.hunger}\nFatig: ${state.fatigue}`;
    drawTextInRect(ctx, statsText, rStats, { fontSize: Math.max(9, Math.floor(stage.cellSize * 0.16)), color: "#e5e7eb", maxLines: 6, padding: 6 });
  } catch (e) {
    // ignore if helpers not available
  }
}

function renderMapInfo() {
  const infoEl = qid("mapInfo");
  if (!infoEl) return;

  const current = state.currentPointIndex;
  const selected = state.map.selectedPointIndex;

  let text = `Текущая точка: ${current + 1}. Топливо: ${state.fuel.toFixed(
    0
  )}.`;

  if (selected != null && selected > current) {
    const dist = distanceFromToPoints(current, selected);
    const canReach = dist <= state.fuel;
    text += ` Выбрана точка ${selected + 1} (дистанция ${dist}). ${
      canReach ? "Достижима." : "Недостижима — мало топлива."
    }`;
  } else {
    text += " Кликни по достижимой точке (синей), чтобы выбрать её.";
  }

  infoEl.textContent = text;

  const btnStart = /** @type {HTMLButtonElement|null} */ (qid("btnStartSegment"));
  if (btnStart) {
    const shouldDisable =
      selected == null ||
      selected <= current ||
      distanceFromToPoints(current, selected) > state.fuel;

    btnStart.disabled = shouldDisable;
  }
}

function handleMapClick(ev) {
  if (!mapCanvas) return;
  const rect = mapCanvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;

  const current = state.currentPointIndex;
  let clickedIndex = -1;
  // map click detection using mapped grid positions
  const stage = computeStageLayout(mapCanvas.width, mapCanvas.height);
  const cityLayout = deriveCityLayout(stage);
  const mapped = _getMappedMapPoints(stage, cityLayout);
  const radius = Math.max(12, Math.floor(cityLayout.cellSize * 0.4));

  for (let i = 0; i < mapped.length; i++) {
    const p = mapped[i];
    const dx = x - p.x;
    const dy = y - p.y;
    if (dx * dx + dy * dy <= radius * radius) {
      clickedIndex = i;
      break;
    }
  }

  if (clickedIndex === -1) return;
  if (clickedIndex <= current) {
    // нельзя ехать назад в этой версии
    return;
  }

  const dist = distanceFromToPoints(current, clickedIndex);
  if (dist > state.fuel) {
    // недостижимо
    return;
  }

  state.map.selectedPointIndex = clickedIndex;
  renderMap();
  renderMapInfo();
}

function planTravelAndStart() {
  const from = state.currentPointIndex;
  const to = state.map.selectedPointIndex;

  if (to == null || to <= from) return;

  const dist = distanceFromToPoints(from, to);
  if (dist > state.fuel) {
    alert("Недостаточно топлива для выбранной точки.");
    return;
  }

  // Суммарные базовые потери голода/бодрости
  let totalHungerLoss = 0;
  let totalFatigueLoss = 0;
  for (let segIdx = from; segIdx < to; segIdx++) {
    const seg = segments[segIdx];
    totalHungerLoss += seg.hungerLoss;
    totalFatigueLoss += seg.fatigueLoss;
  }

  const char =
    state.characterConfig ||
    getCharacterById(state.characterId || selectedCharacterId);

  const hungerLoss = totalHungerLoss * char.hungerLossMultiplier;
  const fatigueLoss = totalFatigueLoss * char.fatigueLossMultiplier;

  // Сразу применяем потери при выезде
  adjustResources({
    fuel: -dist,
    hunger: -hungerLoss,
    fatigue: -fatigueLoss
  });

  if (state.fuel < 0) {
    state.fuel = 0;
    triggerOutOfFuelEvent();
    return;
  }
  if (checkFailConditions()) return;

  // Настраиваем режим дороги
  state.road.active = true;
  state.road.fromPoint = from;
  state.road.toPoint = to;
  state.road.distanceTotal = dist;
  state.road.distanceTravelled = 0;
  state.road.pausedForEvent = false;
  state.road.hitchhikerEvents = [];

  // Собираем автостопщиков для всех сегментов между from..to-1
  for (let segIdx = from; segIdx < to; segIdx++) {
    const seg = segments[segIdx];
    const segDistance = seg.distance;
    const segOffset = cumulativeDistances[segIdx] - cumulativeDistances[from];

    const segHhs = hitchhikers.filter((h) => h.segmentIndex === segIdx);
    segHhs.forEach((hh) => {
      const localPos = segDistance * (0.1 + Math.random() * 0.8);
      const worldPos = segOffset + localPos;
      state.road.hitchhikerEvents.push({
        position: worldPos,
        hitchhiker: hh,
        triggered: false
      });
    });
  }

  state.currentHitchhiker = null;
  const statusEl = qid("roadStatus");
  state.lastMessage = `Вы выехали с точки ${from + 1} к точке ${to + 1}.`;
  if (statusEl) statusEl.textContent = state.lastMessage;

  setScreen("screen-road");
}

