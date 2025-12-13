// src/scenes/stop/stop-ui.js

/**
 * UI: title/hint, toast, inventory, init UI.
 * Состояние (stopInventoryOpen/stopUiInited/stopToastTimer/stopDialogState) — глобально, как и было.
 */

const STOP_BOTTOM_BAR_MIN_HEIGHT = 172;

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

function toggleInventoryUI(force) {
  if (typeof force === "boolean") stopInventoryOpen = force;
  else stopInventoryOpen = !stopInventoryOpen;

  const panel = qid("inventoryPanel");
  const btn = qid("btnToggleInventory");
  if (!panel || !btn) return;

  if (stopInventoryOpen) {
    panel.style.display = "flex";
    btn.textContent = "Инвентарь (I) ▴";
  } else {
    panel.style.display = "none";
    btn.textContent = "Инвентарь (I) ▾";
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
    if (it.iconKey && sprites[it.iconKey]) {
      icon.src = sprites[it.iconKey].src;
    }
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
    };
  }

  toggleInventoryUI(false);

  renderInventoryUI();
  renderStopDialog();
  ensureStopToastEl();

  const avatarEl = qid("playerAvatar");
  if (avatarEl) {
    // ВАЖНО: выбор персонажа в state — это characterId
    const cfg = typeof getCharacterById === "function"
      ? getCharacterById(state.characterId || "tourist")
      : null;

    if (cfg && cfg.avatarKey && sprites[cfg.avatarKey]) {
      avatarEl.src = sprites[cfg.avatarKey].src;
    }
  }

  renderStats();
}
