// game-state.js

/**
 * Начальное состояние игры
 */
function createInitialState() {
  return {
    currentPointIndex: 0, // 0..mapPoints.length-1
    fuel: 60,
    money: 40,
    hunger: 80,
    fatigue: 80,
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
    currentHitchhiker: null
  };
}

/** @type {ReturnType<typeof createInitialState>} */
let state = createInitialState();

/** @type {Record<string, boolean>} */
const keysPressed = {};

/**
 * Корректировка ресурсов
 */
function adjustResources({ fuel = 0, money = 0, hunger = 0, fatigue = 0 }) {
  state.fuel += fuel;
  state.money += money;
  state.hunger = clamp(state.hunger + hunger, 0, 100);
  state.fatigue = clamp(state.fatigue + fatigue, 0, 100);
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
