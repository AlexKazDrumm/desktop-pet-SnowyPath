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
  controlsText: "WASD/стрелки — ходьба • E — взаимодействие • M — карта"
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

  // 1) приоритет: то, что реально есть в sprites (это твой случай: avatar_tourist -> assets/avatars/tourist.png)
  const img = (typeof sprites === "object" && sprites && sprites[key]) ? sprites[key] : null;
  if (img && img.src) return img.src;

  // 2) если вдруг когда-нибудь появятся файлы именно в assets/avatars/avatar_*.png
  if (key.startsWith("avatar_")) {
    return `assets/avatars/${key}.png`;
  }

  // 3) fallback: прямой путь в avatars (редко, но пусть будет)
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
function buildStopStatsText() {
  const money = typeof state.money === "number" ? state.money : 0;
  const fuel = typeof state.fuel === "number" ? state.fuel : 0;
  const hunger = typeof state.hunger === "number" ? state.hunger : 0;
  const fatigue = typeof state.fatigue === "number" ? state.fatigue : 0;

  // компактно, чтобы влезало в 2 колонки
  return `₽${money}\n⛽ ${fuel}\n🍖 ${hunger}\n😴 ${fatigue}`;
}

function renderStats() {
  stopHudState.statsText = buildStopStatsText();

  // верхняя панель (как было) может продолжать жить — если она есть в проекте
  // (не ломаем старую механику)
  const statsBar = qid("statsBar");
  if (statsBar) {
    statsBar.textContent = `₽${state.money} • ⛽${state.fuel} • 🍖${state.hunger} • 😴${state.fatigue}`;
  }
  const stopStats = qid("stopStats");
  if (stopStats) {
    stopStats.innerHTML = String(stopHudState.statsText || "").replace(/\n/g, "<br/>");
  }
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

  renderStats();
}
