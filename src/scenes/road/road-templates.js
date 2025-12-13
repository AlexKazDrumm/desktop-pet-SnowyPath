// src/scenes/road/road-templates.js

/**
 * Каждый сегмент — готовый набор строк 16-символьной ASCII-сетки.
 * ВАЖНО (как ты требуешь):
 * - длина segment.grid === segment.distance (например 30 строк)
 * - мы рисуем по 6 строк, но мир реально содержит все строки distance
 *
 * Символы (для рендера сейчас важны только # / s / .):
 *  # — асфальт (дорога)
 *  s — снег/сугроб (обочина декоративная)
 *  . — пусто
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

/**
 * Segment 1 (distance 30): ровная дорога, снег по бокам
 */
const SEG0_30 = [
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
].map(_assert16);

/**
 * Segment 2 (distance 30): чуть “другой” рисунок обочины (разбивка сугробов)
 */
const SEG1_30 = [
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
].map(_assert16);

const ROAD_SEGMENT_TEMPLATES = [
  {
    pointIndex: 0,
    themeKey: "hub0",
    distance: 30,
    grid: SEG0_30,
    // manual entities: hitchhikers/npcs with `row` relative to segment (0..distance-1)
    entities: [
      { kind: "hitchhiker", row: 4, hitchhikerId: "s1_h3", id: "tmpl_s1_h3", xNpc: 10, xZone: 9 },
      { kind: "hitchhiker", row: 18, hitchhikerId: "s1_h1", id: "tmpl_s1_h1", xNpc: 10, xZone: 9 }
    ]
  },
  {
    pointIndex: 1,
    themeKey: "hub1",
    distance: 30,
    grid: SEG1_30,
    entities: [
      { kind: "hitchhiker", row: 10, hitchhikerId: "s2_h1", id: "tmpl_s2_h1", xNpc: 10, xZone: 9 },
      { kind: "hitchhiker", row: 22, hitchhikerId: "s2_h4", id: "tmpl_s2_h4", xNpc: 10, xZone: 9 }
    ]
  }
];

function getRoadSegmentTemplateByIndex(segIndex) {
  const i = Math.max(0, Math.min(segIndex, ROAD_SEGMENT_TEMPLATES.length - 1));
  return ROAD_SEGMENT_TEMPLATES[i];
}

if (typeof window !== "undefined") {
  window.getRoadSegmentTemplateByIndex = getRoadSegmentTemplateByIndex;
}
