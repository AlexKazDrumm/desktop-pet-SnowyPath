// src/data/game-sprites.js

/**
 * game-sprites.js
 *
 * Правила:
 *
 * 1) Хабы — тайловые. Нужны generic-тайлы и generic-дороги:
 *    - tile_snow / tile_sidewalk / tile_grass
 *    - road_straight / road_corner / road_t / road_cross / road_end
 *
 * 2) Theme override:
 *    Любой спрайт может иметь версию для конкретного хаба по ключу:
 *      `${themeKey}_${baseKey}`
 *    (подхватывается через getThemedSprite() в сцене stop)
 *
 * 3) POI здания (hubGas/hubFood/hubHotel/hubWork/hubBuilding) тоже могут иметь themed-версии:
 *    hub0_hubGas, hub1_hubBuilding, ...
 *
 * 4) Машины персонажей:
 *    - общий fallback: "car"
 *    - индивидуальные ключи: "car_tourist", "car_worker", "car_forester", "car_mechanic"
 *    Если ассета нет — игра не падает; сцена возьмёт fallback "car".
 *
 * Важно:
 * - sprites и spritePaths должны быть глобальными (window.*), т.к. сцены их используют напрямую.
 * - Ошибки загрузки ассетов не должны ломать игру.
 */

(function initSprites() {
  window.GameData = window.GameData || {};
  window.GameData.sprites = window.GameData.sprites || {};

  /** @type {Record<string, string>} */
  const spritePaths = {
    /* ===== Entities / world ===== */
    player: "assets/player.png",

    // Машина (fallback)
    car: "assets/cars/car.png",

    // Машины персонажей (индивидуальные, fallback работает если файла нет)
    car_tourist: "assets/cars/car_tourist.png",
    car_worker: "assets/cars/car_worker.png",
    car_forester: "assets/cars/car_forester.png",
    car_mechanic: "assets/cars/car_mechanic.png",

    hitchhiker: "assets/hitchhiker.png",
    mapPoint: "assets/map_point.png",
    mapPointCurrent: "assets/map_point_current.png",
    mapPointLocked: "assets/map_point_locked.png",

    /* ===== POI buildings (generic) ===== */
    hubGas: "assets/poi/hub_gas.png",
    hubFood: "assets/poi/hub_food.png",
    hubHotel: "assets/poi/hub_hotel.png",
    hubWork: "assets/poi/hub_work.png",

    // Пассивное здание (коллизия есть, действий нет)
    hubBuilding: "assets/poi/hub_building.png",

    /* ===== Tiles (generic) ===== */
    tile_snow: "assets/tiles/generic/tile_snow.png",
    tile_sidewalk: "assets/tiles/generic/tile_sidewalk.png",
    tile_grass: "assets/tiles/generic/tile_grass.png",

    /* ===== Roads (generic) ===== */
    road_straight: "assets/tiles/generic/road_straight.png",
    road_corner: "assets/tiles/generic/road_corner.png",
    road_t: "assets/tiles/generic/road_t.png",
    road_cross: "assets/tiles/generic/road_cross.png",
    road_end: "assets/tiles/generic/road_end.png",

    /* ===== Characters: 3 frames for hub movement ===== */
    char_tourist_idle: "assets/chars/tourist/idle.png",
    char_tourist_walk1: "assets/chars/tourist/walk1.png",
    char_tourist_walk2: "assets/chars/tourist/walk2.png",

    char_worker_idle: "assets/chars/worker/idle.png",
    char_worker_walk1: "assets/chars/worker/walk1.png",
    char_worker_walk2: "assets/chars/worker/walk2.png",

    char_forester_idle: "assets/chars/forester/idle.png",
    char_forester_walk1: "assets/chars/forester/walk1.png",
    char_forester_walk2: "assets/chars/forester/walk2.png",

    char_mechanic_idle: "assets/chars/mechanic/idle.png",
    char_mechanic_walk1: "assets/chars/mechanic/walk1.png",
    char_mechanic_walk2: "assets/chars/mechanic/walk2.png",

    /* ===== Avatars for UI ===== */
    avatar_tourist: "assets/avatars/tourist.png",
    avatar_worker: "assets/avatars/worker.png",
    avatar_forester: "assets/avatars/forester.png",
    avatar_mechanic: "assets/avatars/mechanic.png",

    // аватарка машины для interact HUD (используется stop-render.js: makeInteractAvatarPayload("avatar_car"...))
    avatar_car: "assets/avatars/avatar_car.png",

    // дефолтные аватарки (используются stop-ui.js / stop-render.js как fallback)
    default_prop: "assets/avatars/default_prop.png",
    default_npc: "assets/avatars/default_npc.png",
    default_building: "assets/avatars/default_building.png",
    default_trash: "assets/avatars/default_trash.png",
    default_car: "assets/avatars/default_car.png",
    default_player: "assets/avatars/default_player.png",

    /* ===== Inventory icons ===== */
    item_canister: "assets/items/item_canister.png",
    item_axe: "assets/items/item_axe.png",
    item_map: "assets/items/item_map.png",
    item_pistol: "assets/items/item_pistol.png",
    item_rotten_sandwich: "assets/items/item_rotten_sandwich.png",

    /* ===== Props inside hub ===== */
    prop_trash: "assets/props/prop_trash.png",
    prop_npc: "assets/props/prop_npc.png",

    /* ===== Example: themed overrides (optional) ===== */
    hub0_tile_snow: "assets/tiles/hub0/tile_snow.png",
    hub0_tile_sidewalk: "assets/tiles/hub0/tile_sidewalk.png",
    hub0_tile_grass: "assets/tiles/hub0/tile_grass.png",
    hub0_road_straight: "assets/tiles/hub0/road_straight.png",
    hub0_road_corner: "assets/tiles/hub0/road_corner.png",
    hub0_road_t: "assets/tiles/hub0/road_t.png",
    hub0_road_cross: "assets/tiles/hub0/road_cross.png",
    hub0_road_end: "assets/tiles/hub0/road_end.png",

    hub0_hubGas: "assets/tiles/hub0/poi_hub_gas.png",
    hub0_hubFood: "assets/tiles/hub0/poi_hub_food.png",
    hub0_hubHotel: "assets/tiles/hub0/poi_hub_hotel.png",
    hub0_hubWork: "assets/tiles/hub0/poi_hub_work.png",
    hub0_hubBuilding: "assets/tiles/hub0/poi_hub_building.png"
  };

  /** @type {Record<string, HTMLImageElement>} */
  const sprites = {};

  for (const [key, src] of Object.entries(spritePaths)) {
    const img = new Image();
    img.src = src;

    img.addEventListener("error", () => {
      // Спокойно: ассетов может не быть на ранней стадии
      console.warn(`[sprites] failed to load: ${key} -> ${src}`);
    });

    sprites[key] = img;
  }

  // Глобально (как было)
  window.spritePaths = spritePaths;
  window.sprites = sprites;

  // И в единый неймспейс (чтобы не было каши)
  window.GameData.sprites.spritePaths = spritePaths;
  window.GameData.sprites.sprites = sprites;

  /**
   * Безопасно получить спрайт по ключу (только если реально загружен).
   * @param {string} key
   * @returns {HTMLImageElement|null}
   */
  function getSpriteByKey(key) {
    const s = window.sprites && window.sprites[key];
    if (s && s.complete && s.naturalWidth > 0) return s;
    return null;
  }

  /**
   * Безопасно получить src по ключу (чтобы UI не ловил "битые" картинки).
   * @param {string} key
   * @returns {string}
   */
  function getSpriteSrcByKey(key) {
    const img = getSpriteByKey(key);
    if (img && img.src) return img.src;
    return "";
  }

  window.GameData.sprites.getSpriteByKey = getSpriteByKey;
  window.GameData.sprites.getSpriteSrcByKey = getSpriteSrcByKey;
})();
