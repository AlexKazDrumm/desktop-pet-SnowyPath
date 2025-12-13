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
  if (str.length > 16) return str.slice(0, 16);
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
  { pointIndex: 0, themeKey: "hub0", distance: 30, grid: SEG0_30 },
  { pointIndex: 1, themeKey: "hub1", distance: 30, grid: SEG1_30 }
];

function getRoadSegmentTemplateByIndex(segIndex) {
  const i = Math.max(0, Math.min(segIndex, ROAD_SEGMENT_TEMPLATES.length - 1));
  return ROAD_SEGMENT_TEMPLATES[i];
}

if (typeof window !== "undefined") {
  window.getRoadSegmentTemplateByIndex = getRoadSegmentTemplateByIndex;
}
