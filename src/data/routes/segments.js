// src/data/routes/segments.js

/**
 * @typedef {{id:number, distance:number, hungerLoss:number, fatigueLoss:number, hasGasStation:boolean, hasDiner:boolean, hasMotel:boolean}} Segment
 */

/** @type {Segment[]} */
window.segments = [
  { id: 1, distance: 30, hungerLoss: 10, fatigueLoss: 15, hasGasStation: true,  hasDiner: true,  hasMotel: false },
  { id: 2, distance: 30, hungerLoss: 10, fatigueLoss: 15, hasGasStation: true,  hasDiner: false, hasMotel: true  },
  { id: 3, distance: 40, hungerLoss: 12, fatigueLoss: 18, hasGasStation: false, hasDiner: true,  hasMotel: false },
  { id: 4, distance: 40, hungerLoss: 12, fatigueLoss: 18, hasGasStation: true,  hasDiner: false, hasMotel: true  },
  { id: 5, distance: 50, hungerLoss: 15, fatigueLoss: 20, hasGasStation: true,  hasDiner: true,  hasMotel: false },
  { id: 6, distance: 50, hungerLoss: 15, fatigueLoss: 20, hasGasStation: false, hasDiner: true,  hasMotel: false },
  { id: 7, distance: 60, hungerLoss: 18, fatigueLoss: 23, hasGasStation: true,  hasDiner: true,  hasMotel: true  },
  { id: 8, distance: 60, hungerLoss: 18, fatigueLoss: 23, hasGasStation: false, hasDiner: true,  hasMotel: false },
  { id: 9, distance: 70, hungerLoss: 20, fatigueLoss: 25, hasGasStation: true,  hasDiner: true,  hasMotel: false }
];
