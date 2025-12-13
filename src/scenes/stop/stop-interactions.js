// src/scenes/stop/stop-interactions.js

/**
 * Взаимодействие (E): машина, props, здания.
 * Здесь только интеракты и проверки близости/валидности.
 */

let stopInteractCooldown = 0;
const STOP_INTERACT_COOLDOWN_SEC = 0.22;

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

function collidesWithCar(px, py, car) {
  return (
    px >= car.x &&
    px <= car.x + car.w &&
    py >= car.y &&
    py <= car.y + car.h
  );
}

function isNearPOI(poi) {
  if (!poi || poi.interactW <= 0 || poi.interactH <= 0) return false;
  const px = state.hub.x;
  const py = state.hub.y;
  return (
    px >= poi.interactX &&
    px <= poi.interactX + poi.interactW &&
    py >= poi.interactY &&
    py <= poi.interactY + poi.interactH
  );
}

function isNearProp(p) {
  const px = state.hub.x;
  const py = state.hub.y;

  const padX = Math.max(6, p.w * 0.45);
  const padY = Math.max(6, p.h * 0.55);

  return pointInRect(px, py, {
    x: p.x - padX,
    y: p.y - padY,
    w: p.w + padX * 2,
    h: p.h + padY * 2
  });
}

/**
 * Проверка "точка стояния" валидна:
 * - в пределах сетки ГОРОДА (16x6)
 * - попадает в walkable клетку
 * - не коллизится с машиной
 * - не попадает в solid props
 */
function isValidStandPoint(hubCfg, cityLayout, x, y, car, props) {
  const cell = pixelToCell(x, y, cityLayout);
  if (cell.cx < 0 || cell.cx >= cityLayout.cols || cell.cy < 0 || cell.cy >= cityLayout.rows) return false;
  if (!isCellWalkable(hubCfg, cell.cx, cell.cy)) return false;
  if (car && collidesWithCar(x, y, car)) return false;

  if (Array.isArray(props)) {
    for (const p of props) {
      if (!p.solid) continue;
      if (pointInRect(x, y, p)) return false;
    }
  }

  return true;
}

function addInventoryItemById(itemId, count) {
  if (!itemId) return false;

  const safeCount = Math.max(1, Number.isFinite(count) ? count : 1);

  state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
  const existing = state.inventory.find((x) => x && x.id === itemId);

  if (existing) {
    // если стакуемый — увеличим count (если count вообще есть)
    if (typeof existing.count === "number") {
      existing.count = Math.max(1, existing.count + safeCount);
    }
    return true;
  }

  // пробуем нормальный путь через createInventoryItem
  if (typeof window.createInventoryItem === "function") {
    const inst = window.createInventoryItem(itemId, safeCount);
    if (inst) {
      state.inventory.push(inst);
      return true;
    }
  }

  // fallback (если вдруг items не подключены)
  state.inventory.push({
    id: itemId,
    name: itemId,
    iconKey: `item_${itemId}`,
    description: "",
    count: safeCount,
    tags: []
  });
  return true;
}

function openTrashFoundDialog() {
  const foundId = "rotten_sandwich";
  const title = "Испорченный сэндвич";
  const text = "В мусорке лежит испорченный сэндвич. Взять его с собой?";

  openStopDialogVN([text], [
    {
      id: "take",
      label: "Взять",
      onPick: () => {
        if (!stopLocalFlags.trashSandwichTaken) {
          addInventoryItemById(foundId, 1);
          stopLocalFlags.trashSandwichTaken = true;
        }
        closeStopDialog();
      }
    },
    {
      id: "leave",
      label: "Оставить",
      onPick: () => {
        closeStopDialog();
      }
    }
  ], { lockMovement: true });
}

function openTrashEmptyDialog() {
  openStopDialogVN(["Ты уже шарил тут. Ничего полезного больше нет."], [
    { id: "ok", label: "Ок", onPick: () => closeStopDialog() }
  ], { lockMovement: true });
}

function handleHubInteract() {
  if (!stopCanvas) return;

  if (stopInteractCooldown > 0) return;
  stopInteractCooldown = STOP_INTERACT_COOLDOWN_SEC;

  if (stopDialogState.open) {
    const hasMore = stopDialogState.lineIndex < stopDialogState.lines.length - 1;
    const hasChoices = stopDialogState.choices && stopDialogState.choices.length;
    if (hasMore) {
      advanceStopDialog();
      return;
    }
    if (!hasChoices) {
      closeStopDialog();
      return;
    }
    return;
  }

  const hubCfg = getCurrentHubGridConfig();
  const stage = computeStageLayout(stopCanvas.width, stopCanvas.height);
  const cityLayout = deriveCityLayout(stage);

  const parsed = parseHubAscii(hubCfg);

  const buildings = computeHubBuildingsFromCells(cityLayout, parsed.buildings);
  const car = computeHubCarFromCell(parsed.carCell, cityLayout);
  const props = computeHubProps(hubCfg, cityLayout);

  const nearCar = car ? isNearCar(car) : false;

  // ===== машина =====
  if (nearCar && car) {
    if (state.hub.inCar) {
      const rPlayer = getPlayerRadius(cityLayout);
      const gap = Math.max(3, Math.floor(cityLayout.cellSize * 0.08));

      const candidates = [
        { name: "right", x: car.x + car.w + gap + rPlayer, y: car.y + car.h / 2 },
        { name: "left",  x: car.x - gap - rPlayer,        y: car.y + car.h / 2 },
        { name: "down",  x: car.x + car.w / 2,            y: car.y + car.h + gap + rPlayer },
        { name: "up",    x: car.x + car.w / 2,            y: car.y - gap - rPlayer }
      ];

      let chosen = null;

      for (const c of candidates) {
        if (!isValidStandPoint(hubCfg, cityLayout, c.x, c.y, car, props)) continue;
        chosen = { x: c.x, y: c.y };
        break;
      }

      if (!chosen) {
        const carCell = parsed.carCell;

        if (carCell) {
          const neighbors = [
            { cx: carCell.cx + 1, cy: carCell.cy, dir: "right" },
            { cx: carCell.cx - 1, cy: carCell.cy, dir: "left" },
            { cx: carCell.cx, cy: carCell.cy + 1, dir: "down" },
            { cx: carCell.cx, cy: carCell.cy - 1, dir: "up" }
          ];

          for (const n of neighbors) {
            if (n.cx < 0 || n.cx >= cityLayout.cols || n.cy < 0 || n.cy >= cityLayout.rows) continue;
            if (!isCellWalkable(hubCfg, n.cx, n.cy)) continue;

            const rr = cellToRect(n.cx, n.cy, cityLayout);

            let x = rr.x + rr.w / 2;
            let y = rr.y + rr.h / 2;

            const edgePad = Math.max(3, Math.floor(cityLayout.cellSize * 0.12));

            if (n.dir === "right") x = rr.x + edgePad;
            if (n.dir === "left")  x = rr.x + rr.w - edgePad;
            if (n.dir === "down")  y = rr.y + edgePad;
            if (n.dir === "up")    y = rr.y + rr.h - edgePad;

            if (!isValidStandPoint(hubCfg, cityLayout, x, y, car, props)) continue;

            chosen = { x, y };
            break;
          }
        }
      }

      if (!chosen) {
        chosen = { x: car.x + car.w / 2, y: car.y + car.h + Math.max(6, cityLayout.cellSize * 0.2) };
      }

      state.hub.inCar = false;
      state.hub.x = chosen.x;
      state.hub.y = chosen.y;
    } else {
      state.hub.inCar = true;
      state.hub.x = car.x + car.w / 2;
      state.hub.y = car.y + car.h / 2;
    }
    return;
  }

  if (state.hub.inCar) return;

  // ===== props =====
  if (props && props.length) {
    const nearProp = props.find((p) => isNearProp(p));
    if (nearProp) {
      if (nearProp.id === "trash_near_cafe" || nearProp.kind === "trash") {
        // ВАЖНО: предмет НЕ добавляем до согласия
        if (!stopLocalFlags.trashSearchedOnce) {
          stopLocalFlags.trashSearchedOnce = true;
          openTrashFoundDialog();
        } else {
          openTrashEmptyDialog();
        }
        return;
      }

      if (nearProp.id === "npc_instructor_gas" || nearProp.kind === "npc") {
        const isHub0 = (hubCfg.pointIndex === 0);

        if (isHub0 && !stopLocalFlags.hub0NpcIntroDialogShown) {
          stopLocalFlags.hub0NpcIntroDialogShown = true;
          openHub0NpcIntroDialog();
          return;
        }

        openNpcGenericDialog();
        return;
      }

      if (nearProp.hint) {
        openStopDialogVN([nearProp.hint], [
          { id: "ok", label: "Ок", onPick: () => closeStopDialog() }
        ]);
        return;
      }
    }
  }

  // ===== здания =====
  const nearPoi = buildings.find((b) => isNearPOI(b));
  if (!nearPoi) return;

  if (nearPoi.type === "gas") {
    const amount = 10;
    const cost = amount * 1;
    if (state.money < cost) {
      alert("Недостаточно денег для покупки топлива.");
      return;
    }
    adjustResources({ fuel: amount, money: -cost });
    return;
  }

  if (nearPoi.type === "food") {
    const cost = 10;
    if (state.money < cost) {
      alert("Недостаточно денег для еды.");
      return;
    }
    adjustResources({ money: -cost, hunger: 40 });
    return;
  }

  if (nearPoi.type === "hotel") {
    const cost = 25;
    if (state.money < cost) {
      alert("Недостаточно денег на гостиницу.");
      return;
    }
    state.money -= cost;
    state.fatigue = 100;
    state.hunger = clamp(state.hunger - 10, 0, 100);
    if (checkFailConditions()) return;
    return;
  }

  if (nearPoi.type === "work") {
    adjustResources({ money: 30, hunger: -10, fatigue: -10 });
    if (checkFailConditions()) return;
    return;
  }
}
