// src/data/hubs/hub-grids.js
/**
 * ===== Хабы на сетке (ASCII) =====
 *
 * Сетка фиксирована по размеру: 16x6 (колонки x строки).
 * ВАЖНО: строки ASCII должны быть РОВНО 16 символов.
 *
 * Легенда тайлов:
 *   # — дорога (road)
 *   s — тротуар (sidewalk)
 *   . — снег (snow)
 *   g — трава (grass)
 *
 * Объекты (занимают клетки):
 *   G — gas (заправка)
 *   F — food (еда)
 *   H — hotel (гостиница)
 *   W — work (подработка)
 *   C — машина игрока (car spawn)
 *
 * Мультиклеточные здания:
 *   просто рисуй букву прямоугольником (например 2x2 G и т.п.).
 *
/**
 * @typedef {'npc'|'trash'|'decor'} HubPropKind
 * @typedef {{
 *   id: string;
 *   kind: HubPropKind;
 *   label: string;
 *   hint: string;
 *   cx: number;
 *   cy: number;
 *   relX: number;
 *   relY: number;
 *   relW: number;
 *   relH: number;
 *   spriteKey: string;
 *   solid: boolean;
 *   dir?: 'up'|'down'|'left'|'right';
 *   angleDeg?: number;
 *   snap8?: boolean;
 * }} HubPropConfig
 *
 * @typedef {{
 *   pointIndex: number;
 *   themeKey: string;
 *   grid: string[];
 *   props?: HubPropConfig[];
 * }} HubGridConfig
 */

/**
 * 10 хабов: ASCII 16x6.
 * Строки ASCII должны быть РОВНО 16 символов.
 * @type {HubGridConfig[]}
 */
window.hubGridConfigs = [
  {
    pointIndex: 0,
    themeKey: "hub0",
    grid: [
      ".B.ssss######...",
      ".B.sGGs#....#WW.",
      "...s..s#..F.#WW.",
      ".HHssss#....#...",
      ".HH....#.BB.#.B.",
      ".......###C##...",
      "................",
    ],
    props: [
      {
        id: "npc_instructor_gas",
        kind: "npc",
        label: "Работник заправки",
        hint: "E — поговорить",
        cx: 3,
        cy: 1,
        relX: 0.62,
        relY: 0.28,
        relW: 0.26,
        relH: 0.26,
        spriteKey: "prop_npc_instructor_gas",
        avatarKey: "avatar_npc_instructor_gas",
        solid: true,
        dir: "down"
      },
      {
        id: "trash_near_cafe",
        kind: "trash",
        label: "Мусорка",
        hint: "E — порыться",
        cx: 11,
        cy: 2,
        relX: 0.02,
        relY: 0.58,
        relW: 0.22,
        relH: 0.30,
        spriteKey: "prop_trash",
        solid: true
      }
    ]
  },
  {
    pointIndex: 1,
    themeKey: "hub1",
    grid: [
      "...##########...",
      "...#.FF.#sG.s...",
      "...#....#s..s...",
      "...#....#ssss...",
      "...#..W.#....HH.",
      "...##C###.......",
      "................",
    ],
  },
  {
    pointIndex: 2,
    themeKey: "hub2",
    grid: [
      "...ssss######...",
      "...s..s#....#...",
      "...sG.s#..F.#...",
      "...s..s#..H.#...",
      "...ssss#..W.#...",
      ".......##C###...",
      "................",
    ],
  },
  {
    pointIndex: 3,
    themeKey: "hub3",
    grid: [
      "...######ssss...",
      "...#....#s..s...",
      "...#..G.#sF.s...",
      "...#..H.#s..s...",
      "...#..W.#s..s...",
      "...##C###ssss...",
      "................",
    ],
  },
  {
    pointIndex: 4,
    themeKey: "hub4",
    grid: [
      "...ssss######...",
      "...sW.s#....#...",
      "...s..s#..G.#...",
      "...ssss#..F.#...",
      ".......#..H.#...",
      ".......##C###...",
      "................",
    ],
  },
  {
    pointIndex: 5,
    themeKey: "hub5",
    grid: [
      "...######ssss...",
      "...#....#sW.s...",
      "...#..G.#s..s...",
      "...#..F.#ssss...",
      "...#..H.#.......",
      "...##C###.......",
      "................",
    ],
  },
  {
    pointIndex: 6,
    themeKey: "hub6",
    grid: [
      "...ssss######...",
      "...s..s#....#...",
      "...sG.s#..H.#...",
      "...s..s#..F.#...",
      "...ssss#..W.#...",
      ".......###C##...",
      "................",
    ],
  },
  {
    pointIndex: 7,
    themeKey: "hub7",
    grid: [
      "...######ssss...",
      "...#....#sG.s...",
      "...#..F.#s..s...",
      "...#..H.#s..s...",
      "...#..W.#ssss...",
      "...##C###.......",
      "................",
    ],
  },
  {
    pointIndex: 8,
    themeKey: "hub8",
    grid: [
      "...ssss######...",
      "...sF.s#....#...",
      "...s..s#..G.#...",
      "...ssss#..W.#...",
      ".......#..H.#...",
      ".......##C###...",
      "................",
    ],
  },
  {
    pointIndex: 9,
    themeKey: "hub9",
    grid: [
      "...######ssss...",
      "...#....#s..s...",
      "...#..W.#sF.s...",
      "...#..H.#s..s...",
      "...#..G.#ssss...",
      "...##C###.......",
      "................",
    ],
  }
];

/**
 * @param {number} pointIndex
 * @returns {HubGridConfig}
 */
window.getHubGridConfig = function getHubGridConfig(pointIndex) {
  const list = window.hubGridConfigs || [];
  const idx = Math.max(0, Math.min(pointIndex || 0, list.length - 1));
  return list[idx];
};