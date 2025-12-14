// game-state.js

/** @type {CharacterId} */
let selectedCharacterId = "tourist";

const STAT_KEYS = ["money", "fuel", "hunger", "fatigue"];
const STAT_LOW_THRESHOLD = 26;
const STAT_HIGH_THRESHOLD = 85;
const CANISTER_CAPACITY = 20;

function _ensureStatFlashState() {
  if (typeof stopHudState !== "object" || !stopHudState) return null;
  stopHudState._statFlash = stopHudState._statFlash || {};
  for (const k of STAT_KEYS) {
    if (!stopHudState._statFlash[k]) {
      stopHudState._statFlash[k] = { timer: 0, dir: 0 };
    }
  }
  return stopHudState._statFlash;
}

function triggerStatFlash(deltas, durationSec) {
  const sf = _ensureStatFlashState();
  if (!sf) return;
  const dur = typeof durationSec === "number" && durationSec > 0 ? durationSec : 1;
  for (const k of STAT_KEYS) {
    const dv = deltas && typeof deltas[k] === "number" ? deltas[k] : 0;
    if (!dv) continue;
    sf[k] = { timer: dur, dir: Math.sign(dv) || 0 };
  }
}

function tickStatFlash(dt) {
  const sf = _ensureStatFlashState();
  if (!sf || !dt) return;
  for (const k of STAT_KEYS) {
    if (sf[k] && typeof sf[k].timer === "number" && sf[k].timer > 0) {
      sf[k].timer = Math.max(0, sf[k].timer - dt);
    }
  }
}

function getStatColor(key, value) {
  const v = typeof value === "number" ? value : 0;
  let base = "#e5e7eb";
  if (v < STAT_LOW_THRESHOLD) base = "#ef4444";
  else if (v > STAT_HIGH_THRESHOLD) base = "#22c55e";

  const sf = _ensureStatFlashState();
  if (sf && sf[key] && sf[key].timer > 0) {
    const dir = sf[key].dir || 0;
    if (dir > 0) return "#22c55e";
    if (dir < 0) return "#ef4444";
  }

  return base;
}

function applyStatDeltas({ fuel = 0, money = 0, hunger = 0, fatigue = 0 }, opts) {
  const options = opts || {};
  const prev = {
    fuel: typeof state.fuel === "number" ? state.fuel : 0,
    money: typeof state.money === "number" ? state.money : 0,
    hunger: typeof state.hunger === "number" ? state.hunger : 0,
    fatigue: typeof state.fatigue === "number" ? state.fatigue : 0
  };

  const applied = { fuel: 0, money: 0, hunger: 0, fatigue: 0 };

  if (fuel !== 0) {
    state.fuel += fuel;
    applied.fuel = state.fuel - prev.fuel;
  }
  if (money !== 0) {
    state.money += money;
    applied.money = state.money - prev.money;
  }
  if (hunger !== 0) {
    state.hunger = clamp(state.hunger + hunger, 0, 100);
    applied.hunger = state.hunger - prev.hunger;
  }
  if (fatigue !== 0) {
    state.fatigue = clamp(state.fatigue + fatigue, 0, 100);
    applied.fatigue = state.fatigue - prev.fatigue;
  }

  if (!options.skipFlash) triggerStatFlash(applied, options.flashDuration || 1);
  if (!options.skipRender && typeof renderStats === "function") {
    renderStats();
  }

  return applied;
}

function hasCanister() {
  const inv = Array.isArray(state.inventory) ? state.inventory : [];
  return inv.some((it) => it && it.id === "canister");
}

function getMaxFuel() {
  const max = state && state.characterConfig && typeof state.characterConfig.baseFuel === "number"
    ? state.characterConfig.baseFuel
    : 100;
  return Math.max(1, max);
}

function getCanisterFuel() {
  const v = typeof state.canisterFuel === "number" ? state.canisterFuel : 0;
  return clamp(v, 0, CANISTER_CAPACITY);
}

function setCanisterFuel(v) {
  state.canisterFuel = clamp(v, 0, CANISTER_CAPACITY);
}

function transferCanisterToCar() {
  if (!hasCanister()) return 0;
  const can = getCanisterFuel();
  if (can <= 0) return 0;
  const maxFuel = getMaxFuel();
  const free = Math.max(0, maxFuel - state.fuel);
  const moved = Math.min(free, can);
  if (moved > 0) {
    state.fuel += moved;
    setCanisterFuel(can - moved);
    renderStats && renderStats();
  }
  return moved;
}

function fillCanisterFromMoney(costPerUnit = 1) {
  if (!hasCanister()) return { filled: 0, cost: 0 };
  const can = getCanisterFuel();
  const need = Math.max(0, CANISTER_CAPACITY - can);
  if (need <= 0) return { filled: 0, cost: 0 };
  const availableUnits = Math.floor(Math.max(0, state.money) / Math.max(0.0001, costPerUnit));
  const fillUnits = Math.min(need, availableUnits);
  const cost = fillUnits * costPerUnit;
  if (fillUnits > 0) {
    state.money -= cost;
    setCanisterFuel(can + fillUnits);
    renderStats && renderStats();
  }
  return { filled: fillUnits, cost };
}

function addFuel(amount) {
  const maxFuel = getMaxFuel();
  const prev = state.fuel;
  state.fuel = clamp(state.fuel + amount, 0, maxFuel);
  return state.fuel - prev;
}

/**
 * Установить выбранного персонажа из меню
 * @param {CharacterId} id
 */
function setSelectedCharacter(id) {
  selectedCharacterId = id;
}

/**
 * Текущий выбранный конфиг персонажа
 * @returns {CharacterConfig}
 */
function getSelectedCharacterConfig() {
  return getCharacterById(selectedCharacterId);
}

/**
 * Начальное состояние игры
 */
function createInitialState() {
  const char = getSelectedCharacterConfig();

  if (typeof stopUiInited !== "undefined") {
    stopUiInited = false;
  }
  if (typeof stopHudState === "object" && stopHudState) {
    stopHudState.playerAvatarSrc = "";
    stopHudState.statsText = "";
    stopHudState._lastStats = { money: null, fuel: null, hunger: null, fatigue: null };
  }

  return {
    // Персонаж
    characterId: char.id,
    characterName: char.name,
    characterRole: char.role,
    characterConfig: char,

    // Маршрут
    currentPointIndex: 0, // 0..mapPoints.length-1

    // Ресурсы
    fuel: char.baseFuel,
    canisterFuel: 0,
    money: char.baseMoney,
    hunger: char.baseHunger,
    fatigue: char.baseFatigue,

    /** @type {'menu'|'stop'|'map'|'road'|'end'} */
    mode: "stop",
    alive: true,
    finished: false,
    lastMessage: "",

    // Остановка (хаб)
    hub: {
      x: 400,
      y: 225,
      speed: 150,      // пикселей в секунду
      dirX: 0,         // последняя нормализованная ось X движения
      dirY: -1,        // последняя нормализованная ось Y движения (по умолчанию — вверх)
      angle: -Math.PI / 2 // угол, куда "смотрит" персонаж, рад (по умолчанию вверх)
    },

    // Карта
    map: {
      /** @type {number|null} */
      selectedPointIndex: null
    },

    // Дорога
    road: {
      active: false,
      fromPoint: 0,
      toPoint: 1,
      distanceTotal: 0,
      distanceTravelled: 0,
      // Снижаем скорость, чтобы между событиями на дороге было больше времени
      speed: 4, // "км" в секунду по условным единицам
      pausedForEvent: false,
      /** @type {Array<{position:number, hitchhiker:Hitchhiker, triggered:boolean}>} */
      hitchhikerEvents: []
    },

    /** @type {Hitchhiker|null} */
    currentHitchhiker: null,

    // Инвентарь персонажа (пока предметы без логики)
    /** @type {InventoryItem[]} */
    inventory: char.inventory.slice(),

    // UI-флаги
    ui: {
      inventoryOpen: true
    },

    // Анимация персонажа в хабе
    playerAnim: {
      frameIndex: 0,
      timer: 0
    }
  };
}

/** @type {ReturnType<typeof createInitialState>} */
let state = createInitialState();

/** @type {Record<string, boolean>} */
const keysPressed = (typeof window !== "undefined")
  ? (window.keysPressed = window.keysPressed || {})
  : {};

/**
 * Корректировка ресурсов
 */
function adjustResources({ fuel = 0, money = 0, hunger = 0, fatigue = 0 }) {
  applyStatDeltas({ fuel, money, hunger, fatigue }, { flashDuration: 1 });
}

/**
 * Дистанция между двумя точками маршрута по сегментам
 * @param {number} fromPointIndex
 * @param {number} toPointIndex
 */
function distanceFromToPoints(fromPointIndex, toPointIndex) {
  if (toPointIndex < fromPointIndex) return 0;
  return cumulativeDistances[toPointIndex] - cumulativeDistances[fromPointIndex];
}
