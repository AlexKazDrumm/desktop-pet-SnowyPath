// src/scenes/road/road-build.js

function _normRow16(row) {
  const s = String(row ?? "");
  if (s.length === 16) return s;
  if (s.length > 16) return s.slice(0, 16);
  return s + ".".repeat(16 - s.length);
}

/**
 * buildRoadWorldRows:
 * - количество строк сегмента === distance сегмента
 * - если у шаблона grid ровно distance — используем 1:1
 * - если меньше — повторяем циклом до distance
 */
function buildRoadWorldRows(routeSegments) {
  const out = [];

  const segs = Array.isArray(routeSegments) ? routeSegments : [];
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i] || {};
    const dist = Math.max(1, Math.floor(seg.distance || 1));

    const tpl = (typeof getRoadSegmentTemplateByIndex === "function")
      ? getRoadSegmentTemplateByIndex(i)
      : null;

    let grid = (tpl && Array.isArray(tpl.grid) && tpl.grid.length)
      ? tpl.grid.map(_normRow16)
      : ["......####......".slice(0, 16)];

    // если grid == dist — идеально
    if (grid.length === dist) {
      for (let r = 0; r < dist; r++) out.push(grid[r]);
      continue;
    }

    // иначе — циклим до dist
    for (let r = 0; r < dist; r++) {
      out.push(grid[r % grid.length]);
    }
  }

  return out;
}

/**
 * Roadside entities:
 *  - NPC: примерно один на ~12 строк
 *  - Hitchhikers: рандомно по пути (минимум 2), но триггерятся ТОЛЬКО от зелёной зоны
 */
function buildRoadEntities(totalRows) {
  const entities = [];

  // NPC
  const npcCount = Math.max(0, Math.floor(totalRows / 12));
  for (let i = 0; i < npcCount; i++) {
    const row = Math.floor((i + 1) * (totalRows / (npcCount + 1)));
    entities.push({
      id: `road_npc_${i}`,
      kind: "npc",
      row,
      triggered: false,
      xNpc: ROAD_NPC_X,
      xZone: ROAD_INTERACT_X,
    });
  }

  // Hitchhikers
  const hhCount = Math.max(2, Math.floor(totalRows / 10));
  for (let i = 0; i < hhCount; i++) {
    const row = 2 + Math.floor(Math.random() * Math.max(1, totalRows - 4));
    entities.push({
      id: `road_hh_${i}`,
      kind: "hitchhiker",
      row,
      triggered: false,
      hitchhiker: pickRandomHitchhiker(),
      xNpc: ROAD_NPC_X,
      xZone: ROAD_INTERACT_X,
    });
  }

  entities.sort((a, b) => a.row - b.row);
  return entities;
}

function pickRandomHitchhiker() {
  if (typeof hitchhikers !== "undefined" && Array.isArray(hitchhikers) && hitchhikers.length) {
    return hitchhikers[Math.floor(Math.random() * hitchhikers.length)];
  }
  return {
    id: "fallback_hh",
    name: "Автостопщик",
    description: "Просит подвезти.",
    basePay: 10,
    minPay: 5,
    maxPay: 20,
    dangerLevel: "none",
  };
}

if (typeof window !== "undefined") {
  window.buildRoadWorldRows = buildRoadWorldRows;
  window.buildRoadEntities = buildRoadEntities;
}
