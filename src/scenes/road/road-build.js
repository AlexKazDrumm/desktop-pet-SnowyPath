// src/scenes/road/road-build.js

function _normRow16(row) {
  const s = String(row ?? "");
  if (s.length === 16) return s;
  if (s.length > 16) {
    const extra = s.length - 16;
    const start = Math.floor(extra / 2);
    return s.slice(start, start + 16);
  }
  return s + ".".repeat(16 - s.length);
}

function _isRoadCell(segRows, x, y) {
  if (!Array.isArray(segRows) || !segRows.length) return false;
  if (y < 0 || y >= segRows.length || x < 0 || x >= ROAD_COLS) return false;
  const ch = (segRows[y] || "")[x] || "";
  if (!ch) return false;
  if (typeof isRoadChar === "function") return isRoadChar(ch);
  return ch === "#";
}

function _isRoadBuildingAllowed(ch, seg) {
  if (!ch || typeof isBuildingChar !== "function" || !isBuildingChar(ch)) return false;

  const meta = (typeof hubBuildingMetaByChar === "object" && hubBuildingMetaByChar)
    ? hubBuildingMetaByChar[ch]
    : null;

  if (!meta) return false;

  if (meta.id === "gas") return !!(seg && seg.hasGasStation);
  if (meta.id === "food") return !!(seg && seg.hasDiner);
  if (meta.id === "hotel") return !!(seg && seg.hasMotel);

  // пассивные/прочие здания разрешаем всегда
  return true;
}

function _sanitizeRoadRow(row, seg) {
  const norm = _normRow16(row);
  if (!norm) return ".".repeat(16);

  let res = "";
  for (const ch of norm) {
    if (typeof isBuildingChar === "function" && isBuildingChar(ch)) {
      res += _isRoadBuildingAllowed(ch, seg) ? ch : ".";
    } else {
      res += ch;
    }
  }

  return res;
}

function _buildSegmentRows(seg, segIndex) {
  const dist = Math.max(1, Math.floor(seg?.distance || 1));
  const tpl = (typeof getRoadSegmentTemplateByIndex === "function")
    ? getRoadSegmentTemplateByIndex(segIndex)
    : null;

  let grid = (tpl && Array.isArray(tpl.grid) && tpl.grid.length)
    ? tpl.grid.map((row) => _sanitizeRoadRow(row, seg))
    : ["......####......".slice(0, 16)];

  const segRows = [];

  // если grid == dist — идеально
  if (grid.length === dist) {
    for (let r = 0; r < dist; r++) segRows.push(grid[r]);
    return segRows;
  }

  // иначе — циклим до dist
  for (let r = 0; r < dist; r++) {
    segRows.push(grid[r % grid.length]);
  }

  return segRows;
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
    const segRows = _buildSegmentRows(seg, i);
    for (const r of segRows) out.push(r);
  }

  return out;
}

/**
 * Roadside entities:
 *  - NPC: примерно один на ~12 строк
 *  - Hitchhikers: рандомно по пути (минимум 2), но триггерятся ТОЛЬКО от зелёной зоны
 */
function _sideDefaults(side) {
  const s = side === "left" ? "left" : "right";
  return {
    side: s,
    xNpc: s === "left" ? ROAD_LEFT_NPC_X : ROAD_RIGHT_NPC_X,
    xZone: s === "left" ? ROAD_LEFT_INTERACT_X : ROAD_RIGHT_INTERACT_X,
  };
}

function buildRoadEntities(routeSegmentsOrTotalRows) {
  // Accept either totalRows (number) or routeSegments (array)
  const entities = [];

  let routeSegments = null;
  let totalRows = 0;

  if (Array.isArray(routeSegmentsOrTotalRows)) {
    routeSegments = routeSegmentsOrTotalRows;
    for (const s of routeSegments) totalRows += Math.max(0, Math.floor(s.distance || 0));
  } else {
    totalRows = Math.max(0, Math.floor(Number(routeSegmentsOrTotalRows) || 0));
  }

  // compute cumulative offsets for mapping a row -> segmentIndex
  const segOffsets = [];
  if (routeSegments) {
    let off = 0;
    for (let i = 0; i < routeSegments.length; i++) {
      segOffsets.push({ index: i, start: off, length: Math.max(0, Math.floor(routeSegments[i].distance || 0)) });
      off += Math.max(0, Math.floor(routeSegments[i].distance || 0));
    }
  }



  // Manual entities from road templates (if provided) — prefer these over random hitchhiker placement
  let manualEntitiesAdded = false;
  if (segOffsets && segOffsets.length) {
    for (let si = 0; si < segOffsets.length; si++) {
      const s = segOffsets[si];
      const tpl = (typeof getRoadSegmentTemplateByIndex === "function") ? getRoadSegmentTemplateByIndex(si) : null;
      if (tpl && Array.isArray(tpl.entities) && tpl.entities.length) {
        for (const def of tpl.entities) {
          const relRow = Math.max(0, Math.min((s.length || 1) - 1, Number(def.row || 0)));
          const worldRow = s.start + relRow;
          const side = def.side === "left" ? "left" : (def.side === "right" ? "right" : (def.xZone <= ROAD_X0 ? "left" : "right"));
          const sideDefaults = _sideDefaults(side);
          if (def.kind === "hitchhiker") {
            // try to resolve hitchhiker by id if provided
            let hh = null;
            if (def.hitchhikerId && typeof hitchhikers !== "undefined" && Array.isArray(hitchhikers)) {
              hh = hitchhikers.find((h) => h.id === def.hitchhikerId) || null;
            }
            if (!hh) hh = pickRandomHitchhiker(def.segmentIndex ?? si);
            entities.push({
              id: def.id || `road_hh_tpl_${si}_${relRow}`,
              kind: "hitchhiker",
              row: worldRow,
              triggered: false,
              hitchhiker: hh,
              side,
              xNpc: (typeof def.xNpc === 'number') ? def.xNpc : sideDefaults.xNpc,
              xZone: (typeof def.xZone === 'number') ? def.xZone : sideDefaults.xZone,
            });
            manualEntitiesAdded = true;
          } else if (def.kind === "npc") {
            const npcSide = def.side === "left" ? "left" : (def.side === "right" ? "right" : (def.xZone <= ROAD_X0 ? "left" : "right"));
            const npcDefaults = _sideDefaults(npcSide);
            entities.push({
              id: def.id || `road_npc_tpl_${si}_${relRow}`,
              kind: "npc",
              row: worldRow,
              triggered: false,
              side: npcSide,
              xNpc: (typeof def.xNpc === 'number') ? def.xNpc : npcDefaults.xNpc,
              xZone: (typeof def.xZone === 'number') ? def.xZone : npcDefaults.xZone,
            });
            manualEntitiesAdded = true;
          }
        }
      }
    }
  }

  // Hitchhikers: if templates didn't supply manual entities, fallback to random placement
  if (!manualEntitiesAdded) {
    // NPC: approximately one per ~12 rows
    const npcCount = Math.max(0, Math.floor(totalRows / 12));
    for (let i = 0; i < npcCount; i++) {
      const row = Math.floor((i + 1) * (totalRows / (npcCount + 1)));
      const side = i % 2 === 0 ? "right" : "left";
      const sideDefaults = _sideDefaults(side);
      entities.push({
        id: `road_npc_${i}`,
        kind: "npc",
        row,
        triggered: false,
        side,
        xNpc: sideDefaults.xNpc,
        xZone: sideDefaults.xZone,
      });
    }
    const hhCount = Math.max(2, Math.floor(totalRows / 10));
    for (let i = 0; i < hhCount; i++) {
      const row = 2 + Math.floor(Math.random() * Math.max(1, totalRows - 4));

      const side = i % 2 === 0 ? "right" : "left";
      const sideDefaults = _sideDefaults(side);

      // determine segmentIndex for this row
      let segIndex = null;
      if (segOffsets && segOffsets.length) {
        for (let si = 0; si < segOffsets.length; si++) {
          const s = segOffsets[si];
          if (row >= s.start && row < s.start + s.length) {
            segIndex = si + (typeof routeSegments[0]?.pointIndex === 'number' ? routeSegments[0].pointIndex : 0);
            if (typeof routeSegments[si]?.pointIndex === 'number') segIndex = routeSegments[si].pointIndex;
            break;
          }
        }
      }

      const hh = pickRandomHitchhiker(segIndex);

      entities.push({
        id: `road_hh_${i}`,
        kind: "hitchhiker",
        row,
        triggered: false,
        hitchhiker: hh,
        side,
        xNpc: sideDefaults.xNpc,
        xZone: sideDefaults.xZone,
      });
    }
  }

  entities.sort((a, b) => a.row - b.row);
  return entities;
}

function pickRandomHitchhiker() {
  const segIndex = (arguments.length > 0 && typeof arguments[0] === 'number') ? arguments[0] : null;
  if (typeof hitchhikers !== "undefined" && Array.isArray(hitchhikers) && hitchhikers.length) {
    if (segIndex !== null) {
      const filtered = hitchhikers.filter((h) => Number(h.segmentIndex) === Number(segIndex));
      if (filtered.length) return filtered[Math.floor(Math.random() * filtered.length)];
    }
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

function _getBuildingMeta(ch) {
  const meta = (typeof hubBuildingMetaByChar === "object" && hubBuildingMetaByChar)
    ? (hubBuildingMetaByChar[ch] || null)
    : null;

  if (meta) return meta;

  return {
    id: "building",
    type: "passive",
    label: "Здание",
    hint: "",
    spriteKey: "hubBuilding",
    avatarKey: "default_building",
  };
}

function _collectBuildingsFromSegment(segRows, worldOffsetRows, segIndex, seg) {
  const buildings = [];
  if (!Array.isArray(segRows) || !segRows.length) return buildings;

  const rows = segRows.length;
  const cols = ROAD_COLS;

  /** @type {boolean[][]} */
  const visited = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));

  for (let y = 0; y < rows; y++) {
    const rowStr = segRows[y] || "";
    for (let x = 0; x < cols; x++) {
      const ch = rowStr[x] || "";
      if (!ch || typeof isBuildingChar !== "function" || !isBuildingChar(ch)) continue;
      if (visited[y][x]) continue;

      const meta = _getBuildingMeta(ch);
      if (!_isRoadBuildingAllowed(ch, seg)) continue;

      /** @type {Array<{x:number;y:number}>} */
      const stack = [{ x, y }];
      visited[y][x] = true;

      let minX = x, maxX = x, minY = y, maxY = y;
      let touchesRoad = false;

      while (stack.length) {
        const cur = stack.pop();
        if (!cur) break;

        if (cur.x < minX) minX = cur.x;
        if (cur.x > maxX) maxX = cur.x;
        if (cur.y < minY) minY = cur.y;
        if (cur.y > maxY) maxY = cur.y;

        const neigh = [
          { x: cur.x + 1, y: cur.y },
          { x: cur.x - 1, y: cur.y },
          { x: cur.x, y: cur.y + 1 },
          { x: cur.x, y: cur.y - 1 }
        ];

        // Require at least one cell to touch the road horizontally or vertically
        for (const n of neigh) {
          if (_isRoadCell(segRows, n.x, n.y)) {
            touchesRoad = true;
            break;
          }
        }

        for (const n of neigh) {
          if (n.x < 0 || n.x >= cols || n.y < 0 || n.y >= rows) continue;
          if (visited[n.y][n.x]) continue;
          const nc = (segRows[n.y] || "")[n.x] || "";
          if (nc !== ch) continue;
          visited[n.y][n.x] = true;
          stack.push(n);
        }
      }

      const worldY0 = worldOffsetRows + minY;
      const worldY1 = worldOffsetRows + maxY;
      const cx = (minX + maxX) / 2;
      const side = cx < ROAD_X0 ? "left" : "right";
      const zoneX = side === "left" ? ROAD_LEFT_INTERACT_X : ROAD_RIGHT_INTERACT_X;

      const width = (maxX - minX + 1);
      const height = (maxY - minY + 1);
      const sizeAllowed = width <= 2 && height <= 2 && !(width === 1 && height === 1);
      if (!sizeAllowed || !touchesRoad) continue;

      buildings.push({
        id: `${ch}_${segIndex}_${worldY0}_${worldY1}_${minX}_${maxX}`,
        char: ch,
        type: meta.type,
        label: meta.label,
        hint: meta.hint,
        spriteKey: meta.spriteKey || "hubBuilding",
        avatarKey: meta.avatarKey || null,
        x0: minX,
        y0: worldY0,
        x1: maxX,
        y1: worldY1,
        side,
        interactX: zoneX,
        triggered: false,
      });
    }
  }

  return buildings;
}

function buildRoadBuildings(routeSegments) {
  const list = [];
  const segs = Array.isArray(routeSegments) ? routeSegments : [];

  let offset = 0;
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i] || {};
    const segRows = _buildSegmentRows(seg, i);
    const blds = _collectBuildingsFromSegment(segRows, offset, i, seg);
    for (const b of blds) list.push(b);
    offset += segRows.length;
  }

  return list;
}

if (typeof window !== "undefined") {
  window.buildRoadWorldRows = buildRoadWorldRows;
  window.buildRoadEntities = buildRoadEntities;
  window.buildRoadBuildings = buildRoadBuildings;
}
