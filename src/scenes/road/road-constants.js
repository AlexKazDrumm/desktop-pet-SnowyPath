// src/scenes/road/road-constants.js

const ROAD_COLS = 16;
const ROAD_VIEW_ROWS = 6;
const ROAD_MENU_ROWS = 2;
const ROAD_TOTAL_ROWS = ROAD_VIEW_ROWS + ROAD_MENU_ROWS;
const ROAD_CAR_SCREEN_ROW = ROAD_VIEW_ROWS - 1;

// средние 4 столбца — дорога (1-based 7..10 => 0-based 6..9)
const ROAD_X0 = 6;
const ROAD_X1 = 9;

// интеракт-зона (зелёная) — крайняя правая клетка дороги (col 10 => x=9)
const ROAD_INTERACT_X = ROAD_X1;

// NPC стоит на обочине справа от дороги (col 11 => x=10)
const ROAD_NPC_X = ROAD_X1 + 1;

function isRoadX(x) {
  return x >= ROAD_X0 && x <= ROAD_X1;
}

if (typeof window !== "undefined") {
  window.ROAD_COLS = ROAD_COLS;
  window.ROAD_VIEW_ROWS = ROAD_VIEW_ROWS;
  window.ROAD_MENU_ROWS = ROAD_MENU_ROWS;
  window.ROAD_TOTAL_ROWS = ROAD_TOTAL_ROWS;
  window.ROAD_CAR_SCREEN_ROW = ROAD_CAR_SCREEN_ROW;

  window.ROAD_X0 = ROAD_X0;
  window.ROAD_X1 = ROAD_X1;

  window.ROAD_INTERACT_X = ROAD_INTERACT_X;
  window.ROAD_NPC_X = ROAD_NPC_X;

  window.isRoadX = isRoadX;
}
