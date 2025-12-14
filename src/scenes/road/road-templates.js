// src/scenes/road/road-templates.js

/**
 * Каждый сегмент — готовый набор строк 16-символьной ASCII-сетки.
 * ВАЖНО:
 * - длина segment.grid === segment.distance
 *
 * Символы:
 *  # — асфальт (дорога)
 *  s — снег/сугроб (обочина декоративная)
 *  . — пусто
 *
 * Здания (символы зданий):
 *  G — gas
 *  F — food
 *  H — hotel
 *
 * ВАЖНО для road-build.js:
 * - здания допустимы только 2x1, 1x2, 2x2
 * - хотя бы одна клетка здания должна быть соседней (4-соседство) к дороге
 */

// helpers
function _assert16(s) {
  const str = String(s ?? "");
  if (str.length === 16) return str;
  if (str.length > 16) {
    const extra = str.length - 16;
    const start = Math.floor(extra / 2);
    return str.slice(start, start + 16);
  }
  return str + ".".repeat(16 - str.length);
}

function _applyBuildings(grid, buildings) {
  const rows = grid.map((r) => (typeof r === "string" ? r.split("") : []));
  for (const b of buildings || []) {
    const x0 = Math.max(0, Math.floor(b.x0));
    const y0 = Math.max(0, Math.floor(b.y0));
    const x1 = Math.max(x0, Math.floor(b.x1));
    const y1 = Math.max(y0, Math.floor(b.y1));
    const ch = (b.char || "").slice(0, 1) || "";
    if (!ch) continue;

    for (let y = y0; y <= y1 && y < rows.length; y++) {
      for (let x = x0; x <= x1 && x < 16; x++) {
        if (Array.isArray(rows[y])) rows[y][x] = ch;
      }
    }
  }
  return rows.map((r) => _assert16(r.join("")));
}

/**
 * Segment 1 (distance 30): ровная дорога, снег по бокам
 */
const SEG0_30 = _applyBuildings(
  [
    "...ssss####ssss...",
    "...s..s####s..s...",
    "...s...####...s...",
    "...s...####...s...",
    "...s..s####s..s...",
    "...ssss####ssss...",

    "...ssss####ssss...",
    "...s...####...s...",
    "...s..s####s..s...",
    "...s...####...s...",
    "...s...####...s...",
    "...ssss####ssss...",

    "...ssss####ssss...",
    "...s..s####s..s...",
    "...s...####...s...",
    "...s...####...s...",
    "...s..s####s..s...",
    "...ssss####ssss...",

    "...ssss####ssss...",
    "...s...####...s...",
    "...s..s####s..s...",
    "...s...####...s...",
    "...s...####...s...",
    "...ssss####ssss...",

    "...ssss####ssss...",
    "...s..s####s..s...",
    "...s...####...s...",
    "...s...####...s...",
    "...s..s####s..s...",
    "...ssss####ssss...",
  ],
  [
    // Все здания строго рядом с дорогой и только 2x1 / 1x2 / 2x2

    // GAS (2x2) справа, касается дороги через x=10 сосед к x=9
    { char: "G", x0: 10, y0: 4, x1: 11, y1: 5 },

    // FOOD (1x2) слева, касается дороги через x=5 сосед к x=6
    { char: "F", x0: 5, y0: 14, x1: 5, y1: 15 },

    // HOTEL (2x1) справа
    { char: "H", x0: 10, y0: 22, x1: 11, y1: 22 },
  ]
);

/**
 * Segment 2 (distance 30): чуть “другой” рисунок обочины
 */
const SEG1_30 = _applyBuildings(
  [
    "..ssss..####..ssss",
    "..s..s..####..s..s",
    "..s.....####.....s",
    "..s..s..####..s..s",
    "..s.....####.....s",
    "..ssss..####..ssss",

    "..ssss..####..ssss",
    "..s.....####.....s",
    "..s..s..####..s..s",
    "..s.....####.....s",
    "..s..s..####..s..s",
    "..ssss..####..ssss",

    "..ssss..####..ssss",
    "..s..s..####..s..s",
    "..s.....####.....s",
    "..s..s..####..s..s",
    "..s.....####.....s",
    "..ssss..####..ssss",

    "..ssss..####..ssss",
    "..s.....####.....s",
    "..s..s..####..s..s",
    "..s.....####.....s",
    "..s..s..####..s..s",
    "..ssss..####..ssss",

    "..ssss..####..ssss",
    "..s..s..####..s..s",
    "..s.....####.....s",
    "..s..s..####..s..s",
    "..s.....####.....s",
    "..ssss..####..ssss",
  ],
  [
    // GAS (2x1) слева
    { char: "G", x0: 4, y0: 5, x1: 5, y1: 5 },

    // FOOD (2x2) справа
    { char: "F", x0: 10, y0: 12, x1: 11, y1: 13 },

    // HOTEL (1x2) слева
    { char: "H", x0: 5, y0: 20, x1: 5, y1: 21 },
  ]
);

const ROAD_SEGMENT_TEMPLATES = [
  {
    pointIndex: 0,
    themeKey: "hub0",
    distance: 30,
    grid: SEG0_30,
    entities: [
      { kind: "hitchhiker", row: 4, hitchhikerId: "s1_h3", id: "tmpl_s1_h3", xNpc: ROAD_RIGHT_NPC_X, xZone: ROAD_RIGHT_INTERACT_X, side: "right" },
      { kind: "hitchhiker", row: 9, hitchhikerId: "s1_h1", id: "tmpl_s1_h1", xNpc: ROAD_LEFT_NPC_X, xZone: ROAD_LEFT_INTERACT_X, side: "left" },
      { kind: "hitchhiker", row: 14, hitchhikerId: "s1_h2", id: "tmpl_s1_h2", xNpc: ROAD_RIGHT_NPC_X, xZone: ROAD_RIGHT_INTERACT_X, side: "right" },
      { kind: "hitchhiker", row: 19, hitchhikerId: "s1_h4", id: "tmpl_s1_h4", xNpc: ROAD_LEFT_NPC_X, xZone: ROAD_LEFT_INTERACT_X, side: "left" },
      { kind: "hitchhiker", row: 24, hitchhikerId: "s1_h5", id: "tmpl_s1_h5", xNpc: ROAD_RIGHT_NPC_X, xZone: ROAD_RIGHT_INTERACT_X, side: "right" },
    ],
  },
  {
    pointIndex: 1,
    themeKey: "hub1",
    distance: 30,
    grid: SEG1_30,
    entities: [
      { kind: "hitchhiker", row: 3, hitchhikerId: "s2_h1", id: "tmpl_s2_h1", xNpc: ROAD_LEFT_NPC_X, xZone: ROAD_LEFT_INTERACT_X, side: "left" },
      { kind: "hitchhiker", row: 8, hitchhikerId: "s2_h2", id: "tmpl_s2_h2", xNpc: ROAD_RIGHT_NPC_X, xZone: ROAD_RIGHT_INTERACT_X, side: "right" },
      { kind: "hitchhiker", row: 13, hitchhikerId: "s2_h3", id: "tmpl_s2_h3", xNpc: ROAD_LEFT_NPC_X, xZone: ROAD_LEFT_INTERACT_X, side: "left" },
      { kind: "hitchhiker", row: 18, hitchhikerId: "s2_h4", id: "tmpl_s2_h4", xNpc: ROAD_RIGHT_NPC_X, xZone: ROAD_RIGHT_INTERACT_X, side: "right" },
      { kind: "hitchhiker", row: 23, hitchhikerId: "s2_h5", id: "tmpl_s2_h5", xNpc: ROAD_LEFT_NPC_X, xZone: ROAD_LEFT_INTERACT_X, side: "left" },
    ],
  },
];

function getRoadSegmentTemplateByIndex(segIndex) {
  const i = Math.max(0, Math.min(segIndex, ROAD_SEGMENT_TEMPLATES.length - 1));
  return ROAD_SEGMENT_TEMPLATES[i];
}

if (typeof window !== "undefined") {
  window.getRoadSegmentTemplateByIndex = getRoadSegmentTemplateByIndex;
}
