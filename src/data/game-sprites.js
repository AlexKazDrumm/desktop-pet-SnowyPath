// game-sprites.js

/**
 * ВАЖНО:
 * Теперь хабы — тайловые. Нужны:
 *
 * БАЗОВЫЕ тайлы (generic):
 *  - tile_snow
 *  - tile_sidewalk
 *  - tile_grass
 *
 * Дороги (generic):
 *  - road_straight
 *  - road_corner
 *  - road_t
 *  - road_cross
 *  - road_end
 *
 * Плюс можно (и нужно) сделать разные стили для каждого хаба (themeKey),
 * просто добавив спрайты с префиксом themeKey + '_' :
 *
 * Пример для hub0:
 *  - hub0_tile_snow, hub0_tile_sidewalk, hub0_tile_grass
 *  - hub0_road_straight, hub0_road_corner, hub0_road_t, hub0_road_cross, hub0_road_end
 *
 * Если каких-то theme-спрайтов нет — будет fallback на generic.
 */

const spritePaths = {
  // базовый "игрок" — по умолчанию турист в стойке
  player: "assets/char_tourist_idle.png",

  // сущности
  car: "assets/car.png",
  hitchhiker: "assets/hitchhiker.png",
  mapPoint: "assets/map_point.png",
  mapPointCurrent: "assets/map_point_current.png",
  mapPointLocked: "assets/map_point_locked.png",

  // POI (здания)
  hubGas: "assets/hub_gas.png",
  hubFood: "assets/hub_food.png",
  hubHotel: "assets/hub_hotel.png",
  hubWork: "assets/hub_work.png",

  // Тайлы (generic)
  tile_snow: "assets/tiles/hub0/tile_snow.png",
  tile_sidewalk: "assets/tiles/hub0/tile_sidewalk.png",
  tile_grass: "assets/tiles/hub0/tile_grass.png",

  // Дороги (generic)
  road_straight: "assets/tiles/hub0/road_straight.png",
  road_corner: "assets/tiles/hub0/road_corner.png",
  road_t: "assets/tiles/hub0/road_t.png",
  road_cross: "assets/tiles/hub0/road_cross.png",
  road_end: "assets/tiles/hub0/road_end.png",

  // Персонажи: анимация ходьбы в хабе (3 кадра: idle, walk1, walk2)
  char_tourist_idle: "assets/char_tourist_idle.png",
  char_tourist_walk1: "assets/char_tourist_walk1.png",
  char_tourist_walk2: "assets/char_tourist_walk2.png",

  char_worker_idle: "assets/char_worker_idle.png",
  char_worker_walk1: "assets/char_worker_walk1.png",
  char_worker_walk2: "assets/char_worker_walk2.png",

  char_forester_idle: "assets/char_forester_idle.png",
  char_forester_walk1: "assets/char_forester_walk1.png",
  char_forester_walk2: "assets/char_forester_walk2.png",

  char_mechanic_idle: "assets/char_mechanic_idle.png",
  char_mechanic_walk1: "assets/char_mechanic_walk1.png",
  char_mechanic_walk2: "assets/char_mechanic_walk2.png",

  // Аватарки персонажей для UI
  avatar_tourist: "assets/avatar_tourist.png",
  avatar_worker: "assets/avatar_worker.png",
  avatar_forester: "assets/avatar_forester.png",
  avatar_mechanic: "assets/avatar_mechanic.png",

  // Иконки инвентаря
  item_canister: "assets/item_canister.png",
  item_axe: "assets/item_axe.png",
  item_map: "assets/item_map.png",
  item_pistol: "assets/item_pistol.png",

  // props внутри хаба
  prop_trash: "assets/prop_trash.png",
  prop_npc: "assets/prop_npc.png",

  // лут из мусорки
  item_rotten_sandwich: "assets/item_rotten_sandwich.png",

  /**
   * Примеры theme-спрайтов (НЕ обязательны, но рекомендуются).
   * Если файлы не добавишь — всё равно будет работать через generic.
   *
   * Раскомментируй и создай файлы, когда будешь готов.
   */
  hub0_tile_snow: "assets/tiles/hub0/tile_snow.png",
  hub0_tile_sidewalk: "assets/tiles/hub0/tile_sidewalk.png",
  hub0_tile_grass: "assets/tiles/hub0/tile_grass.png",
  hub0_road_straight: "assets/tiles/hub0/road_straight.png",
  hub0_road_corner: "assets/tiles/hub0/road_corner.png",
  hub0_road_t: "assets/tiles/hub0/road_t.png",
  hub0_road_cross: "assets/tiles/hub0/road_cross.png",
  hub0_road_end: "assets/tiles/hub0/road_end.png",
  hub1_tile_snow: "assets/tiles/hub0/tile_snow.png",
};

/** @type {Record<string, HTMLImageElement>} */
const sprites = {};
for (const [key, src] of Object.entries(spritePaths)) {
  const img = new Image();
  img.src = src;
  sprites[key] = img;
}
