// src/scenes/stop/stop-ui.js

/**
 * UI-слой для stop, но теперь HUD рисуется В КАНВАСЕ.
 * Тут храним состояние HUD/инвентаря/диалогов и даём утилиты, которые читает stop-render.js.
 */

let stopInventoryOpen = false;
let stopUiInited = false;

let stopToastTimer = 0;

/** локальные флаги сцены (не трогаем глобальный state) */
const stopLocalFlags = {
  introShownAtHub0: false,
  hub0ExitHintShown: false,
  hub0NpcIntroDialogShown: false,
  trashSearchedOnce: false
};

/** локальное состояние диалога */
let stopDialogState = {
  open: false,
  lines: [],
  lineIndex: 0,
  text: "",
  choices: [],
  lockMovement: true,
  onClose: null
};

/** ===== HUD state (теперь не DOM) ===== */
const stopHudState = {
  interactTitle: "",
  interactHint: "",
  /** @type {{src:string, kind:"npc"|"building"|"prop"|"trash"|"car"}|null} */
  interactAvatar: null,
  playerAvatarSrc: "",
  toastText: "",
  toastKind: "info", // good|bad|info
  statsText: "",
  controlsTextDefault: "WASD/стрелки — ходьба • E — взаимодействие • M — карта",
  controlsText: "WASD/стрелки — ходьба • E — взаимодействие • M — карта",

  // для авто-обновления статов
  _lastStats: { money: null, fuel: null, hunger: null, fatigue: null }
  ,
  // flash state per stat: { timer:number, dir:number } dir: +1 increase, -1 decrease
  _statFlash: {
    money: { timer: 0, dir: 0 },
    fuel: { timer: 0, dir: 0 },
    hunger: { timer: 0, dir: 0 },
    fatigue: { timer: 0, dir: 0 }
  }
};

/** ===== helpers ===== */

function setStopObjectTitle(text) {
  stopHudState.interactTitle = String(text || "");
}

function setStopHint(text) {
  stopHudState.interactHint = String(text || "");
}

function setStopControlsText(text) {
  const t = String(text || "");
  stopHudState.controlsText = t || stopHudState.controlsTextDefault;
}

function resetStopControlsText() {
  stopHudState.controlsText = stopHudState.controlsTextDefault;
}

/**
 * Дефолтные аватарки по типу объекта (на случай, если ассет не подгрузился).
 * @param {"npc"|"building"|"prop"|"trash"|"car"|"player"} kind
 */
function getDefaultAvatarSrc(kind) {
  if (kind === "npc") return "assets/avatars/default_npc.png";
  if (kind === "building") return "assets/avatars/default_building.png";
  if (kind === "trash") return "assets/avatars/default_trash.png";
  if (kind === "car") return "assets/avatars/default_car.png";
  if (kind === "player") return "assets/avatars/default_player.png";
  return "assets/avatars/default_prop.png";
}

/**
 * Установить аватарку текущего объекта взаимодействия.
 * @param {{src?: string; kind?: "npc"|"building"|"prop"|"trash"|"car"}|null} payload
 */
function setStopInteractAvatar(payload) {
  const kind = payload && payload.kind ? payload.kind : "prop";
  const src = payload && payload.src ? payload.src : "";
  stopHudState.interactAvatar = { kind, src: src || getDefaultAvatarSrc(kind) };
}

/**
 * Детерминированный src для аватарок персонажа/прочего.
 * @param {string|null} avatarKey
 */
function getAvatarSrcByKey(avatarKey) {
  const key = String(avatarKey || "");
  if (!key) return "";

  // 1) приоритет: то, что реально есть в sprites
  const img = (typeof sprites === "object" && sprites && sprites[key]) ? sprites[key] : null;
  if (img && img.src) return img.src;

  // 2) если вдруг когда-нибудь появятся файлы именно в assets/avatars/avatar_*.png
  if (key.startsWith("avatar_")) {
    return `assets/avatars/${key}.png`;
  }

  // 3) fallback
  return `assets/avatars/${key}.png`;
}

/**
 * Детерминированно получить src для иконки предмета.
 * - для item_* всегда берём assets/items/{iconKey}.png
 * - иначе fallback на sprites[iconKey].src
 * @param {string} iconKey
 */
function getInventoryIconSrc(iconKey) {
  const key = String(iconKey || "");
  if (!key) return "";
  if (key.startsWith("item_")) return `assets/items/${key}.png`;

  const img = (typeof sprites === "object" && sprites && sprites[key]) ? sprites[key] : null;
  if (img && img.src) return img.src;

  return "";
}

function toggleInventoryUI(force) {
  if (typeof force === "boolean") stopInventoryOpen = force;
  else stopInventoryOpen = !stopInventoryOpen;
}

/** ===== toast ===== */

function showStopToast(text, kind) {
  stopHudState.toastText = String(text || "");
  stopHudState.toastKind = (kind === "good" || kind === "bad" || kind === "info") ? kind : "info";
  stopToastTimer = 2.2;
}

function hideStopToast() {
  stopHudState.toastText = "";
  stopToastTimer = 0;
}

/** ===== stats text (используется stop-render.js) ===== */

/**
 * ВАЖНО:
 * - без эмодзи и спец-символов, чтобы 100% рисовалось в canvas на любом monospace.
 * - компактно (4 строки) под область 13-14.
 */
function buildStopStatsText() {
  const money = typeof state.money === "number" ? state.money : 0;
  const fuel = typeof state.fuel === "number" ? state.fuel : 0;
  const hunger = typeof state.hunger === "number" ? state.hunger : 0;
  const fatigue = typeof state.fatigue === "number" ? state.fatigue : 0;
  const canLine = (typeof hasCanister === "function" && hasCanister())
    ? `Canis: ${typeof getCanisterFuel === "function" ? getCanisterFuel() : 0}/${typeof CANISTER_CAPACITY === "number" ? CANISTER_CAPACITY : 20}`
    : null;

  let lines = [
    `Money: ${money}`,
    `Fuel:  ${fuel}`,
    `Hungr: ${hunger}`,
    `Fatig: ${fatigue}`
  ];
  if (canLine) lines.push(canLine);
  return lines.join("\n");
}

function renderStats() {
  // ВАЖНО: HUD в canvas
  stopHudState.statsText = buildStopStatsText();

  // сверху (если есть) — не ломаем
  try {
    const statsBar = (typeof qid === "function") ? qid("statsBar") : null;
    if (statsBar) {
      // тут можно оставить эмодзи — это DOM, он нормально живёт
      statsBar.textContent = `Money ${state.money} • Fuel ${state.fuel} • Hunger ${state.hunger} • Fatigue ${state.fatigue}`;
    }

    const stopStats = (typeof qid === "function") ? qid("stopStats") : null;
    if (stopStats) {
      stopStats.innerHTML = String(stopHudState.statsText || "").replace(/\n/g, "<br/>");
    }
  } catch (e) {
    // не валим рендер сцены, если DOM уже выключен/перестроен
    console.error(e);
  }
}

/**
 * renderStopHub() зовёт syncStopStatsIfNeeded()
 */
function syncStopStatsIfNeeded() {
  const money = typeof state.money === "number" ? state.money : 0;
  const fuel = typeof state.fuel === "number" ? state.fuel : 0;
  const hunger = typeof state.hunger === "number" ? state.hunger : 0;
  const fatigue = typeof state.fatigue === "number" ? state.fatigue : 0;

  const last = stopHudState._lastStats;

  const changed =
    last.money !== money ||
    last.fuel !== fuel ||
    last.hunger !== hunger ||
    last.fatigue !== fatigue ||
    !stopHudState.statsText; // если вдруг пусто — форсим

  if (!changed) return;

  stopHudState._lastStats = { money, fuel, hunger, fatigue };
  renderStats();
}

/** ===== init ===== */

function initStopSceneUI() {
  // если HTML-нижнее меню есть — скрываем, потому что HUD теперь в canvas
  const bottomBarEl = document.querySelector(".stop-bottom-bar");
  if (bottomBarEl) bottomBarEl.style.display = "none";

  toggleInventoryUI(false);

  // player avatar
  const cfg = typeof getCharacterById === "function"
    ? getCharacterById(state.characterId || "tourist")
    : null;

  stopHudState.playerAvatarSrc = (cfg && cfg.avatarKey) ? getAvatarSrcByKey(cfg.avatarKey) : "";
  if (!stopHudState.playerAvatarSrc) stopHudState.playerAvatarSrc = getDefaultAvatarSrc("player");

  // interact avatar default
  setStopInteractAvatar({ kind: "prop", src: getDefaultAvatarSrc("prop") });

  // пустые тексты
  setStopObjectTitle("");
  setStopHint("");

  // первый рендер статов
  renderStats();
}
