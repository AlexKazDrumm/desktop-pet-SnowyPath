// game-state.js

/** @type {CharacterId} */
let selectedCharacterId = "tourist";

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
  state.fuel += fuel;
  state.money += money;
  state.hunger = clamp(state.hunger + hunger, 0, 100);
  state.fatigue = clamp(state.fatigue + fatigue, 0, 100);

  // Обновляем UI ресурсов
  if (typeof renderStats === "function") {
    renderStats();
  }

  // trigger temporary stat flash in HUD (if available)
  try {
    const dur = 1.0; // seconds
    if (typeof stopHudState === "object" && stopHudState && stopHudState._statFlash) {
      if (money !== 0) stopHudState._statFlash.money = { timer: dur, dir: Math.sign(money) || 1 };
      if (fuel !== 0) stopHudState._statFlash.fuel = { timer: dur, dir: Math.sign(fuel) || 1 };
      if (hunger !== 0) stopHudState._statFlash.hunger = { timer: dur, dir: Math.sign(hunger) || 1 };
      if (fatigue !== 0) stopHudState._statFlash.fatigue = { timer: dur, dir: Math.sign(fatigue) || 1 };
    }
  } catch (e) {
    console.error(e);
  }
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

