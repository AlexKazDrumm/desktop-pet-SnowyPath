// src/scenes/stop/stop-render.js

/**
 * Отрисовка сцены stop (хаб).
 * Здесь только render-loop + draw-функции.
 */

const HUB_DEBUG_DRAW_GRID = true;

function drawTile(ctx, img, x, y, s) {
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, y, s, s);
  } else {
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(x, y, s, s);
  }
}

function drawRotatedTile(ctx, img, x, y, s, rot) {
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2);
    ctx.rotate(rot);
    ctx.drawImage(img, -s / 2, -s / 2, s, s);
    ctx.restore();
  } else {
    ctx.fillStyle = "#111827";
    ctx.fillRect(x, y, s, s);
  }
}

function drawRotatedSprite(ctx, img, x, y, w, h, angle) {
  if (!img || !img.complete || img.naturalWidth <= 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(250,204,21,0.6)";
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
    return;
  }
  if (!angle) {
    ctx.drawImage(img, x, y, w, h);
    return;
  }
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/**
 * Получить текущий конфиг хаба
 * @returns {ReturnType<typeof getHubGridConfig>}
 */
function getCurrentHubGridConfig() {
  return getHubGridConfig(state.currentPointIndex || 0);
}

/**
 * Подготовка src аватарки интеракт-объекта с поддержкой themed-override.
 *
 * Правила:
 * 1) Если themeKey есть:
 *    - сначала пытаемся найти themed-версию:
 *      - для avatar_*: assets/avatars/{themeKey}_{avatarKey}.png
 *      - для спрайтов: sprites[`${themeKey}_${avatarKey}`]
 * 2) Потом обычную:
 *    - для avatar_*: assets/avatars/{avatarKey}.png
 *    - для спрайтов: sprites[avatarKey]
 *
 * @param {string|null} avatarKey
 * @param {"npc"|"building"|"prop"|"trash"|"car"} kind
 * @param {string} themeKey
 * @returns {{src:string, kind:"npc"|"building"|"prop"|"trash"|"car"}}
 */
function makeInteractAvatarPayload(avatarKey, kind, themeKey) {
  const key = String(avatarKey || "");
  const tk = String(themeKey || "");
  let src = "";

  if (key) {
    // 1) themed first
    if (tk) {
      if (key.startsWith("avatar_")) {
        // themed avatar as file
        src = `assets/avatars/${tk}_${key}.png`;
      } else if (typeof sprites === "object" && sprites) {
        const themedKey = `${tk}_${key}`;
        if (sprites[themedKey] && sprites[themedKey].src) {
          src = sprites[themedKey].src;
        }
      }
    }

    // 2) fallback to base
    if (!src) {
      if (key.startsWith("avatar_")) {
        src = `assets/avatars/${key}.png`;
      } else if (typeof sprites === "object" && sprites && sprites[key] && sprites[key].src) {
        src = sprites[key].src;
      }
    }
  }

  return { src, kind };
}

function renderStopHub(dt) {
  if (!stopCtx || !stopCanvas) return;

  if (!stopUiInited) {
    initStopSceneUI();
    stopUiInited = true;

    // после инициализации UI — подгоняем canvas под фиксированный HUD
    if (typeof resizeStopCanvas === "function") resizeStopCanvas();
  }

  if (stopToastTimer > 0) {
    stopToastTimer -= dt;
    if (stopToastTimer <= 0) hideStopToast();
  }

  if (stopInteractCooldown > 0) {
    stopInteractCooldown -= dt;
    if (stopInteractCooldown < 0) stopInteractCooldown = 0;
  }

  const ctx = stopCtx;
  const w = stopCanvas.width;
  const h = stopCanvas.height;

  const hubCfg = getCurrentHubGridConfig();
  const layout = computeGridLayout(w, h);

  if (!hubCfg || !hubCfg.grid || hubCfg.grid.length !== layout.rows) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, w, h);
    return;
  }

  const parsed = parseHubAscii(hubCfg);
  const buildings = computeHubBuildingsFromCells(layout, parsed.buildings);
  const car = computeHubCarFromCell(parsed.carCell, layout);
  const props = computeHubProps(hubCfg, layout);

  // при смене точки — спавним в машине
  if (state.hub.hubPointIndex !== hubCfg.pointIndex) {
    if (car) {
      state.hub.x = car.x + car.w / 2;
      state.hub.y = car.y + car.h / 2;
      state.hub.inCar = true;
    } else {
      state.hub.x = layout.offsetX + layout.gridW / 2;
      state.hub.y = layout.offsetY + layout.gridH / 2;
      state.hub.inCar = false;
    }
    state.hub.hubPointIndex = hubCfg.pointIndex;

    state.hub.xNorm = (state.hub.x - layout.offsetX) / layout.gridW;
    state.hub.yNorm = (state.hub.y - layout.offsetY) / layout.gridH;

    stopLocalFlags.hub0ExitHintShown = false;
  }

  const isHub0 = (hubCfg.pointIndex === 0);

  if (isHub0 && !stopLocalFlags.introShownAtHub0 && state.hub.inCar) {
    stopLocalFlags.introShownAtHub0 = true;
    showStopToast("Нажми E у машины, чтобы выйти. Рядом местный — он объяснит правила.", "info");
  }

  if (isHub0 && !stopLocalFlags.hub0ExitHintShown && !state.hub.inCar) {
    stopLocalFlags.hub0ExitHintShown = true;
    showStopToast("Подойди к местному у заправки и нажми E, чтобы поговорить.", "info");
  }

  const movementLocked = stopDialogState.open && stopDialogState.lockMovement;

  const speed = state.hub.speed;
  let vx = 0;
  let vy = 0;

  if (!state.hub.inCar && !movementLocked) {
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

    state.hub.dirX = vx;
    state.hub.dirY = vy;
    state.hub.angle = snapAngleTo8Directions(Math.atan2(vy, vx));
  }

  const margin = Math.max(6, Math.floor(layout.cellSize * 0.20));
  const minX = layout.offsetX + margin;
  const maxX = layout.offsetX + layout.gridW - margin;
  const minY = layout.offsetY + margin;
  const maxY = layout.offsetY + layout.gridH - margin;

  state.hub.x = clamp(state.hub.x, minX, maxX);
  state.hub.y = clamp(state.hub.y, minY, maxY);

  const cell = pixelToCell(state.hub.x, state.hub.y, layout);

  if (cell.cx < 0 || cell.cx >= layout.cols || cell.cy < 0 || cell.cy >= layout.rows) {
    state.hub.x = prevX;
    state.hub.y = prevY;
  } else {
    if (!state.hub.inCar) {
      const walkable = isCellWalkable(hubCfg, cell.cx, cell.cy);
      if (!walkable) {
        state.hub.x = prevX;
        state.hub.y = prevY;
      }
    }
  }

  if (!state.hub.inCar && car && collidesWithCar(state.hub.x, state.hub.y, car)) {
    state.hub.x = prevX;
    state.hub.y = prevY;
  }

  if (!state.hub.inCar && props && props.length) {
    for (const p of props) {
      if (!p.solid) continue;
      if (pointInRect(state.hub.x, state.hub.y, p)) {
        state.hub.x = prevX;
        state.hub.y = prevY;
        break;
      }
    }
  }

  state.hub.xNorm = (state.hub.x - layout.offsetX) / layout.gridW;
  state.hub.yNorm = (state.hub.y - layout.offsetY) / layout.gridH;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, w, h);

  const themeKey = hubCfg.themeKey || "";

  for (let y = 0; y < layout.rows; y++) {
    for (let x = 0; x < layout.cols; x++) {
      const ch = getMapChar(hubCfg.grid, x, y);
      const r = cellToRect(x, y, layout);

      let tileBase = "tile_snow";
      if (isSidewalkChar(ch)) tileBase = "tile_sidewalk";
      if (isGrassChar(ch)) tileBase = "tile_grass";
      if (isSnowChar(ch)) tileBase = "tile_snow";
      if (isRoadChar(ch)) tileBase = "tile_sidewalk";

      const baseSpr = getThemedSprite(themeKey, tileBase);
      drawTile(ctx, baseSpr.img, r.x, r.y, r.w);

      if (isRoadChar(ch)) {
        const rv = computeRoadVariant(hubCfg.grid, x, y);
        const roadSpr = getThemedSprite(themeKey, rv.variant);
        drawRotatedTile(ctx, roadSpr.img, r.x, r.y, r.w, rv.rot);
      }
    }
  }

  if (HUB_DEBUG_DRAW_GRID) {
    ctx.save();
    ctx.strokeStyle = "rgba(148,163,184,0.55)";
    ctx.lineWidth = 1;
    for (let y = 0; y <= layout.rows; y++) {
      const yy = layout.offsetY + y * layout.cellSize;
      ctx.beginPath();
      ctx.moveTo(layout.offsetX, yy);
      ctx.lineTo(layout.offsetX + layout.gridW, yy);
      ctx.stroke();
    }
    for (let x = 0; x <= layout.cols; x++) {
      const xx = layout.offsetX + x * layout.cellSize;
      ctx.beginPath();
      ctx.moveTo(xx, layout.offsetY);
      ctx.lineTo(xx, layout.offsetY + layout.gridH);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (props && props.length) {
    for (const p of props) {
      const img = p.spriteKey ? sprites[p.spriteKey] : null;
      drawRotatedSprite(ctx, img, p.x, p.y, p.w, p.h, p.angle || 0);
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let currentHint = "";
  let currentTitle = "";

  /** @type {{src:string, kind:"npc"|"building"|"prop"|"trash"|"car"}|null} */
  let currentAvatar = null;

  buildings.forEach((poi) => {
    const isInsideBand = isNearPOI(poi);

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = "rgba(148,163,184,0.9)";
    ctx.lineWidth = 1;
    if (poi.interactW > 0 && poi.interactH > 0) {
      ctx.strokeRect(poi.interactX, poi.interactY, poi.interactW, poi.interactH);
    }
    ctx.restore();

    if (isInsideBand && !state.hub.inCar && poi.interactW > 0 && poi.interactH > 0) {
      ctx.fillStyle = "rgba(34,197,94,0.16)";
      ctx.fillRect(poi.interactX, poi.interactY, poi.interactW, poi.interactH);
    }

    const sprite = poi.spriteKey ? sprites[poi.spriteKey] : null;
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, poi.x, poi.y, poi.w, poi.h);
    } else {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(poi.x, poi.y, poi.w, poi.h);
    }

    // подписи зданий на сетке НЕ рисуем

    if (isInsideBand && !state.hub.inCar) {
      currentHint = poi.hint || "";
      currentTitle = poi.label || "";
      currentAvatar = makeInteractAvatarPayload(poi.avatarKey || null, "building", themeKey);
    }
  });

  if (!state.hub.inCar && props && props.length) {
    const nearProp = props.find((p) => isNearProp(p));
    if (nearProp) {
      ctx.save();
      ctx.fillStyle = "rgba(34,197,94,0.14)";
      ctx.fillRect(nearProp.x, nearProp.y, nearProp.w, nearProp.h);
      ctx.restore();

      if (nearProp.label) currentTitle = nearProp.label;
      if (nearProp.hint) currentHint = nearProp.hint;

      let kind = "prop";
      if (nearProp.kind === "npc") kind = "npc";
      if (nearProp.kind === "trash") kind = "trash";

      currentAvatar = makeInteractAvatarPayload(nearProp.avatarKey || null, kind, themeKey);
    }
  }

  if (car) {
    const carSprite = getSelectedCarSprite();
    if (carSprite && carSprite.complete && carSprite.naturalWidth > 0) {
      ctx.drawImage(carSprite, car.x, car.y, car.w, car.h);
    } else {
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(car.x, car.y, car.w, car.h);
    }

    if (isNearCar(car)) {
      currentTitle = "Машина";
      currentHint = state.hub.inCar ? "E — выйти из машины" : "E — сесть в машину";
      currentAvatar = makeInteractAvatarPayload("avatar_car", "car", themeKey);
    }
  }

  if (!state.hub.inCar) {
    const px = state.hub.x;
    const py = state.hub.y;

    const drawSize = Math.max(6, Math.floor(layout.cellSize * 0.25));
    const playerSprite = sprites.player;
    const angle = state.hub.angle ?? -Math.PI / 2;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);

    if (playerSprite && playerSprite.complete && playerSprite.naturalWidth > 0) {
      ctx.drawImage(playerSprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    } else {
      ctx.fillStyle = "#f97316";
      ctx.fillRect(-drawSize / 2, -drawSize / 2, drawSize, drawSize);
    }

    ctx.restore();
  }

  // текст слева: если рядом ничего — пусто (никаких “Объект”)
  setStopObjectTitle(currentTitle || "");
  setStopHint(currentHint || "");

  // аватарка интеракт-объекта:
  // - если ничего рядом — ставим нейтральный дефолт prop (и не даём пустому src “сломаться”)
  if (typeof setStopInteractAvatar === "function") {
    if (currentAvatar) setStopInteractAvatar(currentAvatar);
    else setStopInteractAvatar({ kind: "prop", src: "assets/avatars/default_prop.png" });
  }
}
