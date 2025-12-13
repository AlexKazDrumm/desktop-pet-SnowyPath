// src/scenes/stop/stop-ui.js

/**
 * UI: title/hint, toast, inventory, init UI.
 * Состояние (stopInventoryOpen/stopUiInited/stopToastTimer/stopDialogState) — глобально, как и было.
 *
 * ВАЖНО:
 * - нижняя панель теперь GRID фиксированной высоты
 * - диалоговая зона (верхняя строка) фиксирована по высоте
 * - инвентарь и управление (нижняя строка): инвентарь прибит к верху, управление к низу
 * - инвентарь открывается/закрывается без изменения высоты HUD (без скачков)
 * - если рядом ничего нет — не показываем “битую” картинку
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

/* ===== UI helpers ===== */

function setStopObjectTitle(text) {
  const el = qid("stopObjectTitle");
  if (!el) return;
  el.textContent = text || "";
}

function setStopHint(text) {
  const el = qid("stopHint");
  if (!el) return;
  el.textContent = text || "";
}

/**
 * Детерминированный src для аватарок.
 * Правило:
 * - если avatarKey начинается с "avatar_" => assets/avatars/{avatarKey}.png
 * - иначе пробуем sprites[avatarKey].src
 *
 * @param {string|null} avatarKey
 * @returns {string}
 */
function getAvatarSrcByKey(avatarKey) {
  const key = String(avatarKey || "");
  if (!key) return "";

  if (key.startsWith("avatar_")) {
    return `assets/avatars/${key}.png`;
  }

  const img = (typeof sprites === "object" && sprites && sprites[key]) ? sprites[key] : null;
  if (img && img.src) return img.src;

  return "";
}

/**
 * Дефолтные аватарки по типу объекта (на случай, если ассет не подгрузился).
 *
 * @param {"npc"|"building"|"prop"|"trash"|"car"|"player"} kind
 * @returns {string}
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
  const img = qid("stopInteractAvatar");
  if (!img) return;

  const kind = payload && payload.kind ? payload.kind : "prop";
  const src = payload && payload.src ? payload.src : "";

  // Никогда не оставляем пустой src (иначе “битая картинка”)
  img.src = src || getDefaultAvatarSrc(kind);
}

/* ===== toast ===== */

function ensureStopToastEl() {
  const root = qid("screen-stop");
  if (!root) return null;

  let el = qid("stopToast");
  if (el) return el;

  el = document.createElement("div");
  el.id = "stopToast";
  el.className = "stop-toast hidden";
  root.appendChild(el);

  return el;
}

function showStopToast(text, kind) {
  const el = ensureStopToastEl();
  if (!el) return;

  el.textContent = String(text || "");
  el.classList.remove("hidden");

  el.classList.remove("good", "bad", "info");
  if (kind === "good") el.classList.add("good");
  else if (kind === "bad") el.classList.add("bad");
  else el.classList.add("info");

  stopToastTimer = 2.2;
}

function hideStopToast() {
  const el = qid("stopToast");
  if (!el) return;
  el.classList.add("hidden");
  el.textContent = "";
  stopToastTimer = 0;
}

/* ===== inventory ===== */

/**
 * Детерминированно получить src для иконки предмета.
 * - для item_* всегда берём assets/items/{iconKey}.png (НЕ через sprites[...] — у тебя это сейчас даёт одинаковую картинку)
 * - иначе fallback на sprites[iconKey].src
 *
 * @param {string} iconKey
 * @returns {string}
 */
function getInventoryIconSrc(iconKey) {
  const key = String(iconKey || "");
  if (!key) return "";

  if (key.startsWith("item_")) {
    return `assets/items/${key}.png`;
  }

  const img = (typeof sprites === "object" && sprites && sprites[key]) ? sprites[key] : null;
  if (img && img.src) return img.src;

  return "";
}

/**
 * Открыть/закрыть инвентарь БЕЗ изменения высоты HUD:
 * - panel всегда display:flex
 * - скрываем через класс .open на wrapper (visibility/opacity)
 */
function toggleInventoryUI(force) {
  if (typeof force === "boolean") stopInventoryOpen = force;
  else stopInventoryOpen = !stopInventoryOpen;

  const wrapper = qid("inventoryWrapper");
  const btn = qid("btnToggleInventory");
  if (!wrapper || !btn) return;

  if (stopInventoryOpen) {
    wrapper.classList.add("open");
    btn.textContent = "Инвентарь (I) ▴";
    btn.setAttribute("aria-expanded", "true");
  } else {
    wrapper.classList.remove("open");
    btn.textContent = "Инвентарь (I) ▾";
    btn.setAttribute("aria-expanded", "false");
  }
}

function renderInventoryUI() {
  const panel = qid("inventoryPanel");
  if (!panel) return;

  const inv = Array.isArray(state.inventory) ? state.inventory : [];

  panel.innerHTML = "";

  if (!inv.length) {
    const empty = document.createElement("div");
    empty.className = "inventory-empty";
    empty.textContent = "Пусто";
    panel.appendChild(empty);
    return;
  }

  for (const it of inv) {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "inventory-slot";
    slot.title = `${it.name || it.id || "Предмет"}${it.description ? ` — ${it.description}` : ""}`;

    const iconWrap = document.createElement("div");
    iconWrap.className = "inventory-slot-iconwrap";

    const icon = document.createElement("img");
    icon.className = "inventory-icon";
    icon.alt = it.name || it.id || "item";
    icon.width = 24;
    icon.height = 24;
    icon.style.imageRendering = "pixelated";

    const src = it.iconKey ? getInventoryIconSrc(it.iconKey) : "";
    icon.src = src || "";

    iconWrap.appendChild(icon);

    const name = document.createElement("div");
    name.className = "inventory-slot-name";
    name.textContent = it.name || it.id || "Предмет";

    slot.appendChild(iconWrap);
    slot.appendChild(name);

    panel.appendChild(slot);
  }
}

function initStopSceneUI() {
  const btn = qid("btnToggleInventory");
  if (btn) {
    btn.onclick = () => {
      toggleInventoryUI();
      // HUD высота фиксирована, но на всякий случай: если где-то шрифты/скролл меняют рендер —
      // ресайзим canvas под фиксированный bottomBar.
      if (typeof resizeStopCanvas === "function") resizeStopCanvas();
    };
  }

  toggleInventoryUI(false);
  renderInventoryUI();
  renderStopDialog();
  ensureStopToastEl();

  // player avatar
  const avatarEl = qid("playerAvatar");
  if (avatarEl) {
    const cfg = typeof getCharacterById === "function"
      ? getCharacterById(state.characterId || "tourist")
      : null;

    const src = cfg && cfg.avatarKey ? getAvatarSrcByKey(cfg.avatarKey) : "";
    avatarEl.src = src || getDefaultAvatarSrc("player");
  }

  // interact avatar default (нейтральный проп)
  setStopInteractAvatar({ kind: "prop", src: getDefaultAvatarSrc("prop") });

  // если пока нет объекта — не показываем текст “Объект” (в HTML alt не трогаем)
  setStopObjectTitle("");
  setStopHint("");

  renderStats();
}
