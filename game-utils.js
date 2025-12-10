// game-utils.js

/**
 * @typedef {{id:number, distance:number, hungerLoss:number, fatigueLoss:number, hasGasStation:boolean, hasDiner:boolean, hasMotel:boolean}} Segment
 */

/**
 * @typedef {{id:string, segmentIndex:number, name:string, basePay:number, minPay:number, maxPay:number, dangerLevel:'none'|'suspicious', description:string}} Hitchhiker
 */

/**
 * @typedef {{x:number,y:number}} Point
 */

/**
 * Быстрый доступ к элементу по id
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function qid(id) {
  return /** @type {HTMLElement|null} */ (document.getElementById(id));
}

/**
 * Ограничение значения
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Случайное целое в диапазоне [a, b]
 * @param {number} a
 * @param {number} b
 */
function randInt(a, b) {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
