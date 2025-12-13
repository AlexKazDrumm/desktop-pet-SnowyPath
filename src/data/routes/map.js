// src/data/routes/map.js

/**
 * @typedef {{x:number,y:number}} Point
 */

// 10 точек маршрута (0 — старт, 9 — финал)
window.mapPoints = /** @type {Point[]} */ ([
  { x: 80,  y: 360 },
  { x: 160, y: 330 },
  { x: 240, y: 300 },
  { x: 320, y: 270 },
  { x: 400, y: 240 },
  { x: 480, y: 220 },
  { x: 560, y: 230 },
  { x: 640, y: 260 },
  { x: 720, y: 290 },
  { x: 780, y: 320 }
]);

// Кумулятивные расстояния от старта до каждой точки
window.cumulativeDistances = (() => {
  /** @type {number[]} */
  const arr = [0];
  const segs = window.segments || [];
  for (let i = 0; i < segs.length; i++) {
    arr.push(arr[i] + segs[i].distance);
  }
  return arr;
})();
