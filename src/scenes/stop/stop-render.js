// src/scenes/stop/stop-render.js

/**
 * Отрисовка сцены stop (хаб).
 * Теперь: единый canvas 16x8:
 * - верх 16x6: город
 * - низ 16x2: HUD (меню)
 */

const HUB_DEBUG_DRAW_GRID = false; // сетку города не рисуем
const HUB_DEBUG_DRAW_HUD_GRID = false;

const STOP_HUD_HIT_REGIONS = []; // пересчитывается каждый кадр

/** простейший кеш Image по src для HUD-аватарок/иконок */
const STOP_HUD_IMG_CACHE = {};
function getHudImageBySrc(src) {
  const key = String(src || "");
  if (!key) return null;
  if (STOP_HUD_IMG_CACHE[key]) return STOP_HUD_IMG_CACHE[key];
  const img = new Image();
  img.src = key;
  STOP_HUD_IMG_CACHE[key] = img;
  return img;
}

function getSelectedCarAvatarSrc() {
  const id = String(state.characterId || "tourist");
  return `assets/avatars/cars/car_${id}.png`;
}

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

function getCurrentHubGridConfig() {
  return getHubGridConfig(state.currentPointIndex || 0);
}

function makeInteractAvatarPayload(avatarKey, kind, themeKey) {
  const key = String(avatarKey || "");
  const tk = String(themeKey || "");
  let src = "";

  if (key) {
    if (tk) {
      if (key.startsWith("avatar_")) {
        src = `assets/avatars/${tk}_${key}.png`;
      } else if (typeof sprites === "object" && sprites) {
        const themedKey = `${tk}_${key}`;
        if (sprites[themedKey] && sprites[themedKey].src) src = sprites[themedKey].src;
      }
    }

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

/**
 * Улучшенный перенос:
 * - переносит по словам
 * - если слово длиннее maxWidth — режем по символам
 * - учитывает высоту прямоугольника (не пытается рисовать больше строк, чем влезает)
 */
function drawTextInRect(ctx, text, r, opts) {
  const t = String(text || "");
  if (!t) return;

  const padding = opts && typeof opts.padding === "number" ? opts.padding : 8;
  let fontSize = opts && typeof opts.fontSize === "number" ? opts.fontSize : 12;
  const color = opts && opts.color ? opts.color : "#e5e7eb";
  const align = opts && opts.align ? opts.align : "left"; // left|center
  const baseline = opts && opts.baseline ? opts.baseline : "top"; // top|middle
  let lineHeight = opts && typeof opts.lineHeight === "number" ? opts.lineHeight : Math.floor(fontSize * 1.25);
  const maxLinesOpt = opts && typeof opts.maxLines === "number" ? opts.maxLines : 3;

  const maxWidth = Math.max(0, r.w - padding * 2);
  const maxHeight = Math.max(0, r.h - padding * 2);

  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();

  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  const x = align === "center" ? (r.x + r.w / 2) : (r.x + padding);
  let y = r.y + padding;

  // реальное количество строк по высоте
  const fitLinesByHeight = Math.max(1, Math.floor(maxHeight / Math.max(1, lineHeight)));
  const maxLines = Math.max(1, Math.min(maxLinesOpt, fitLinesByHeight));

  // поддержка явных переносов строк
  const paragraphs = t.replace(/\r/g, "").split("\n");

  const outLines = [];

  function pushLine(line) {
    if (outLines.length < maxLines) outLines.push(line);
  }

  function breakLongWord(word) {
    // режем по символам так, чтобы влезало
    let cur = "";
    for (let i = 0; i < word.length; i++) {
      const test = cur + word[i];
      const m = ctx.measureText(test);
      if (m.width <= maxWidth || !cur) {
        cur = test;
      } else {
        pushLine(cur);
        cur = word[i];
        if (outLines.length >= maxLines) return;
      }
    }
    if (cur && outLines.length < maxLines) pushLine(cur);
  }

  // сначала выставим font (после вычисления lineHeight тоже нужно)
  ctx.font = `${fontSize}px monospace`;

  for (let p = 0; p < paragraphs.length; p++) {
    const raw = paragraphs[p].trim();
    if (!raw) {
      // пустая строка = перенос
      pushLine("");
      if (outLines.length >= maxLines) break;
      continue;
    }

    const words = raw.split(/\s+/).filter(Boolean);
    let cur = "";

    for (const w of words) {
      if (outLines.length >= maxLines) break;

      const test = cur ? `${cur} ${w}` : w;
      const mw = ctx.measureText(test).width;

      if (mw <= maxWidth) {
        cur = test;
        continue;
      }

      // текущая строка заполнена — пушим
      if (cur) {
        pushLine(cur);
        cur = "";
        if (outLines.length >= maxLines) break;
      }

      // слово само по себе длиннее maxWidth — режем
      const ww = ctx.measureText(w).width;
      if (ww > maxWidth) {
        breakLongWord(w);
      } else {
        cur = w;
      }
    }

    if (cur && outLines.length < maxLines) pushLine(cur);

    // разделяем абзацы
    if (p < paragraphs.length - 1 && outLines.length < maxLines) {
      // имитируем перенос строки
      // (если хочешь прям пустую строку — раскомментируй)
      // pushLine("");
    }
  }

  // рисуем
  for (let i = 0; i < outLines.length; i++) {
    ctx.fillText(outLines[i], x, y);
    y += lineHeight;
    if (y > r.y + r.h) break;
  }

  ctx.restore();
}

function drawPanel(ctx, r) {
  ctx.save();
  ctx.fillStyle = "rgba(2, 6, 23, 0.92)";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = "rgba(55, 65, 81, 0.95)";
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  ctx.restore();
}

function drawAvatarInRect(ctx, img, r) {
  drawPanel(ctx, r);

  const inset = Math.max(2, Math.floor(Math.min(r.w, r.h) * 0.08));
  const box = { x: r.x + inset, y: r.y + inset, w: r.w - inset * 2, h: r.h - inset * 2 };

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
  }
}

function drawButton(ctx, r, label, pressed) {
  ctx.save();
  ctx.fillStyle = pressed ? "rgba(148,163,184,0.25)" : "rgba(11,18,32,0.75)";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = "rgba(55, 65, 81, 0.95)";
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

  ctx.fillStyle = "#e5e7eb";
  const fs = Math.max(10, Math.floor(Math.min(r.h, r.w) * 0.22));
  ctx.font = `700 ${fs}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(label || ""), r.x + r.w / 2, r.y + r.h / 2);
  ctx.restore();
}

function addHudHitRegion(kind, rect, payload) {
  STOP_HUD_HIT_REGIONS.push({
    kind,
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    payload: payload || null
  });
}

function renderStopHub(dt) {
  if (!stopCtx || !stopCanvas) return;

  if (!stopUiInited) {
    initStopSceneUI();
    stopUiInited = true;
    if (typeof resizeStopCanvas === "function") resizeStopCanvas();
  }

  // ВАЖНО: теперь реально существует и будет обновлять stopHudState.statsText
  if (typeof syncStopStatsIfNeeded === "function") syncStopStatsIfNeeded();

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
  const stage = computeStageLayout(w, h);
  const cityLayout = deriveCityLayout(stage);

  if (!hubCfg || !hubCfg.grid || hubCfg.grid.length !== cityLayout.rows) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, w, h);
    return;
  }

  const parsed = parseHubAscii(hubCfg);
  const buildings = computeHubBuildingsFromCells(cityLayout, parsed.buildings);
  const car = computeHubCarFromCell(parsed.carCell, cityLayout);
  const props = computeHubProps(hubCfg, cityLayout);

  // при смене точки — спавним в машине
  if (state.hub.hubPointIndex !== hubCfg.pointIndex) {
    if (car) {
      state.hub.x = car.x + car.w / 2;
      state.hub.y = car.y + car.h / 2;
      state.hub.inCar = true;
    } else {
      state.hub.x = cityLayout.offsetX + cityLayout.gridW / 2;
      state.hub.y = cityLayout.offsetY + cityLayout.gridH / 2;
      state.hub.inCar = false;
    }
    state.hub.hubPointIndex = hubCfg.pointIndex;

    state.hub.xNorm = (state.hub.x - cityLayout.offsetX) / cityLayout.gridW;
    state.hub.yNorm = (state.hub.y - cityLayout.offsetY) / cityLayout.gridH;

    stopLocalFlags.hub0ExitHintShown = false;
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

  const margin = Math.max(6, Math.floor(cityLayout.cellSize * 0.20));
  const minX = cityLayout.offsetX + margin;
  const maxX = cityLayout.offsetX + cityLayout.gridW - margin;
  const minY = cityLayout.offsetY + margin;
  const maxY = cityLayout.offsetY + cityLayout.gridH - margin;

  state.hub.x = clamp(state.hub.x, minX, maxX);
  state.hub.y = clamp(state.hub.y, minY, maxY);

  const cell = pixelToCell(state.hub.x, state.hub.y, cityLayout);

  if (cell.cx < 0 || cell.cx >= cityLayout.cols || cell.cy < 0 || cell.cy >= cityLayout.rows) {
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

  state.hub.xNorm = (state.hub.x - cityLayout.offsetX) / cityLayout.gridW;
  state.hub.yNorm = (state.hub.y - cityLayout.offsetY) / cityLayout.gridH;

  // ===== draw background =====
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, w, h);

  const themeKey = hubCfg.themeKey || "";

  // ===== draw city tiles (16x6) =====
  for (let y = 0; y < cityLayout.rows; y++) {
    for (let x = 0; x < cityLayout.cols; x++) {
      const ch = getMapChar(hubCfg.grid, x, y);
      const r = cellToRect(x, y, cityLayout);

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

  // ===== props =====
  if (props && props.length) {
    for (const p of props) {
      const img = p.spriteKey ? sprites[p.spriteKey] : null;
      drawRotatedSprite(ctx, img, p.x, p.y, p.w, p.h, p.angle || 0);
    }
  }

  let currentHint = "";
  let currentTitle = "";
  /** @type {{src:string, kind:"npc"|"building"|"prop"|"trash"|"car"}|null} */
  let currentAvatar = null;

  // ===== buildings =====
  buildings.forEach((poi) => {
    const isInsideBand = isNearPOI(poi);
    const sprite = poi.spriteKey ? sprites[poi.spriteKey] : null;

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, poi.x, poi.y, poi.w, poi.h);
    } else {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(poi.x, poi.y, poi.w, poi.h);
    }

    if (poi && poi.interactW > 0 && poi.interactH > 0) {
      ctx.save();

      if (isInsideBand && !state.hub.inCar) {
        ctx.fillStyle = "rgba(34, 197, 94, 0.16)";
        ctx.fillRect(poi.interactX, poi.interactY, poi.interactW, poi.interactH);
      }

      ctx.strokeStyle = "rgba(34, 197, 94, 0.70)";
      ctx.lineWidth = 1;

      const dash = Math.max(2, Math.floor(cityLayout.cellSize * 0.12));
      const gap = Math.max(2, Math.floor(cityLayout.cellSize * 0.10));
      ctx.setLineDash([dash, gap]);

      ctx.strokeRect(
        poi.interactX + 0.5,
        poi.interactY + 0.5,
        poi.interactW - 1,
        poi.interactH - 1
      );

      ctx.restore();
    }

    if (isInsideBand && !state.hub.inCar) {
      currentHint = poi.hint || "";
      currentTitle = poi.label || "";
      currentAvatar = makeInteractAvatarPayload(poi.avatarKey || null, "building", themeKey);
    }
  });

  // ===== near prop => HUD =====
  if (!state.hub.inCar && props && props.length) {
    const nearProp = props.find((p) => isNearProp(p));
    if (nearProp) {
      if (nearProp.label) currentTitle = nearProp.label;
      if (nearProp.hint) currentHint = nearProp.hint;

      let kind = "prop";
      if (nearProp.kind === "npc") kind = "npc";
      if (nearProp.kind === "trash") kind = "trash";

      currentAvatar = makeInteractAvatarPayload(nearProp.avatarKey || null, kind, themeKey);
    }
  }

  // ===== car =====
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
      currentAvatar = { kind: "car", src: getSelectedCarAvatarSrc() };
    }
  }

  // ===== player =====
  if (!state.hub.inCar) {
    const px = state.hub.x;
    const py = state.hub.y;

    const drawSize = Math.max(6, Math.floor(cityLayout.cellSize * 0.25));
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

  // ===== HUD state push =====
  setStopObjectTitle(currentTitle || "");
  setStopHint(currentHint || "");

  if (currentAvatar) setStopInteractAvatar(currentAvatar);
  else setStopInteractAvatar({ kind: "prop", src: "assets/avatars/default_prop.png" });

  // ===== draw HUD 16x2 =====
  STOP_HUD_HIT_REGIONS.length = 0;

  const hudRect = getHudRect(stage);
  drawPanel(ctx, hudRect);

  // layout
  const rInteractAvatar = hudCellsToRect(stage, 1, 2, 1, 2);
  const rInteractText = hudCellsToRect(stage, 3, 4, 1, 2);
  const rDialog = hudCellsToRect(stage, 5, 12, 1, 1);
  const rBottomCenter = hudCellsToRect(stage, 5, 12, 2, 2);
  const rStats = hudCellsToRect(stage, 13, 14, 1, 2);
  const rPlayerAvatar = hudCellsToRect(stage, 15, 16, 1, 2);

  const ia = (stopHudState && stopHudState.interactAvatar) ? stopHudState.interactAvatar : null;
  const iaImg = ia ? getHudImageBySrc(ia.src) : null;
  drawAvatarInRect(ctx, iaImg, rInteractAvatar);

  const paSrc = (stopHudState && stopHudState.playerAvatarSrc) ? stopHudState.playerAvatarSrc : "";
  const paImg = paSrc ? getHudImageBySrc(paSrc) : null;
  drawAvatarInRect(ctx, paImg, rPlayerAvatar);

  // ===== левый текст: теперь реально 2 строки под заголовок и 3 под подсказку =====
  drawPanel(ctx, rInteractText);

  const titleRect = {
    x: rInteractText.x + 8,
    y: rInteractText.y + 6,
    w: rInteractText.w - 16,
    h: Math.floor(rInteractText.h * 0.46)
  };

  const hintRect = {
    x: rInteractText.x + 8,
    y: titleRect.y + titleRect.h + 2,
    w: rInteractText.w - 16,
    h: rInteractText.y + rInteractText.h - (titleRect.y + titleRect.h + 10)
  };

  drawTextInRect(ctx, stopHudState.interactTitle, titleRect, {
    fontSize: Math.max(10, Math.floor(stage.cellSize * 0.18)),
    color: "#f8fafc",
    maxLines: 2,
    lineHeight: Math.max(12, Math.floor(stage.cellSize * 0.22)),
    padding: 2
  });

  drawTextInRect(ctx, stopHudState.interactHint, hintRect, {
    fontSize: Math.max(9, Math.floor(stage.cellSize * 0.16)),
    color: "#e5e7eb",
    maxLines: 3,
    lineHeight: Math.max(11, Math.floor(stage.cellSize * 0.20)),
    padding: 2
  });

  // ===== stats =====
  drawPanel(ctx, rStats);
  drawTextInRect(ctx, stopHudState.statsText, rStats, {
    fontSize: Math.max(10, Math.floor(stage.cellSize * 0.18)),
    color: "#e5e7eb",
    maxLines: 6,
    lineHeight: Math.max(12, Math.floor(stage.cellSize * 0.22)),
    padding: 10
  });

  // ===== dialog =====
  drawPanel(ctx, rDialog);

  if (stopDialogState.open) {
    const dlgInner = {
      x: rDialog.x + 10,
      y: rDialog.y + 10,
      w: rDialog.w - 20,
      h: rDialog.h - 20
    };

    const isLastLine = stopDialogState.lineIndex >= (stopDialogState.lines.length - 1);
    const hasChoices = isLastLine && stopDialogState.choices && stopDialogState.choices.length;

    let textBox = dlgInner;
    let buttonsBox = null;

    if (hasChoices) {
      const btnH = Math.max(18, Math.floor(stage.cellSize * 0.42));
      buttonsBox = {
        x: dlgInner.x,
        y: dlgInner.y + dlgInner.h - btnH,
        w: dlgInner.w,
        h: btnH
      };
      textBox = {
        x: dlgInner.x,
        y: dlgInner.y,
        w: dlgInner.w,
        h: dlgInner.h - btnH - 6
      };
    }

    drawTextInRect(ctx, stopDialogState.text, textBox, {
      fontSize: Math.max(11, Math.floor(stage.cellSize * 0.20)),
      color: "#e5e7eb",
      align: "center",
      maxLines: 3,
      padding: 6
    });

    if (!hasChoices) {
      const hasMore = stopDialogState.lineIndex < stopDialogState.lines.length - 1;
      if (hasMore) {
        const btnR = {
          x: rDialog.x + rDialog.w - Math.max(90, Math.floor(stage.cellSize * 2.2)) - 10,
          y: rDialog.y + rDialog.h - Math.max(22, Math.floor(stage.cellSize * 0.5)) - 10,
          w: Math.max(90, Math.floor(stage.cellSize * 2.2)),
          h: Math.max(22, Math.floor(stage.cellSize * 0.5))
        };
        drawButton(ctx, btnR, "Далее", false);
        addHudHitRegion("dialog_next", btnR, null);
      }
    } else if (buttonsBox) {
      const choices = stopDialogState.choices.slice(0, 4);
      const gap = 8;
      const btnW = Math.floor((buttonsBox.w - gap * (choices.length - 1)) / choices.length);
      const btnH = buttonsBox.h;

      for (let i = 0; i < choices.length; i++) {
        const c = choices[i];
        const br = {
          x: buttonsBox.x + i * (btnW + gap),
          y: buttonsBox.y,
          w: btnW,
          h: btnH
        };
        drawButton(ctx, br, c.label, false);
        addHudHitRegion("dialog_choice", br, { index: i });
      }
    }
  }

  // ===== bottom center row2 col5-12: inventory + controls text =====
  drawPanel(ctx, rBottomCenter);

  const pad = 8;
  const textH = Math.max(18, Math.floor(stage.cellSize * 0.34));

  const rInv = {
    x: rBottomCenter.x + pad,
    y: rBottomCenter.y + pad,
    w: rBottomCenter.w - pad * 2,
    h: Math.max(0, rBottomCenter.h - pad * 2 - textH - 6)
  };

  const rText = {
    x: rBottomCenter.x + pad,
    y: rBottomCenter.y + rBottomCenter.h - textH - pad,
    w: rBottomCenter.w - pad * 2,
    h: textH
  };

  if (rInv.h >= 10) {
    ctx.save();
    ctx.fillStyle = "rgba(11, 18, 32, 0.70)";
    ctx.fillRect(rInv.x, rInv.y, rInv.w, rInv.h);
    ctx.strokeStyle = "rgba(55, 65, 81, 0.95)";
    ctx.strokeRect(rInv.x + 0.5, rInv.y + 0.5, rInv.w - 1, rInv.h - 1);
    ctx.restore();

    const inv = Array.isArray(state.inventory) ? state.inventory : [];
    if (!inv.length) {
      drawTextInRect(ctx, "Пусто", rInv, {
        fontSize: Math.max(10, Math.floor(stage.cellSize * 0.18)),
        color: "#9ca3af",
        align: "center",
        maxLines: 1
      });
    } else {
      const slotGap = Math.max(6, Math.floor(stage.cellSize * 0.12));
      const slotSize = Math.max(28, Math.floor(Math.min(rInv.h, stage.cellSize * 0.78)));

      const maxSlots = Math.max(1, Math.floor((rInv.w + slotGap) / (slotSize + slotGap)));
      const show = inv.slice(0, Math.min(inv.length, maxSlots));

      const totalW = show.length * slotSize + (show.length - 1) * slotGap;
      const startX = rInv.x + Math.max(8, Math.floor((rInv.w - totalW) / 2));
      const y0 = rInv.y + Math.max(6, Math.floor((rInv.h - slotSize) / 2));

      ctx.save();
      ctx.beginPath();
      ctx.rect(rInv.x + 1, rInv.y + 1, rInv.w - 2, rInv.h - 2);
      ctx.clip();

      for (let i = 0; i < show.length; i++) {
        const it = show[i];
        const sr = { x: startX + i * (slotSize + slotGap), y: y0, w: slotSize, h: slotSize };

        ctx.save();
        ctx.fillStyle = "rgba(2, 6, 23, 0.35)";
        ctx.fillRect(sr.x, sr.y, sr.w, sr.h);
        ctx.strokeStyle = "rgba(55,65,81,0.85)";
        ctx.strokeRect(sr.x + 0.5, sr.y + 0.5, sr.w - 1, sr.h - 1);
        ctx.restore();

        const iconSrc = it && it.iconKey ? getInventoryIconSrc(it.iconKey) : "";
        const iconImg = iconSrc ? getHudImageBySrc(iconSrc) : null;

        if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
          const inset = Math.max(3, Math.floor(sr.w * 0.18));
          ctx.drawImage(iconImg, sr.x + inset, sr.y + inset, sr.w - inset * 2, sr.h - inset * 2);
        }

        addHudHitRegion("inv_item", sr, { item: it || null });
      }

      ctx.restore();

      if (inv.length > show.length) {
        ctx.save();
        ctx.fillStyle = "#9ca3af";
        ctx.font = `700 ${Math.max(12, Math.floor(stage.cellSize * 0.22))}px monospace`;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText("…", rInv.x + rInv.w - 6, rInv.y + rInv.h - 4);
        ctx.restore();
      }
    }
  }

  drawTextInRect(ctx, stopHudState.controlsText, rText, {
    fontSize: Math.max(10, Math.floor(stage.cellSize * 0.16)),
    color: "#9ca3af",
    align: "center",
    maxLines: 1,
    padding: 4
  });

  // toast отключили полностью
}

/**
 * Получить hit-rects HUD (для кликов в scene-stop.js)
 */
function getStopHudHitRegions() {
  return STOP_HUD_HIT_REGIONS;
}
