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
    // Раньше было assets/player.png (его у тебя НЕТ). Делаем безопасный дефолт.
    // В хабе реально будет использоваться char_*_idle/walk* через game-main.js, но пусть базовый тоже существует.
    player: "assets/avatars/default_player.png",

    // Машина (fallback)
    car: "assets/cars/car.png",

    // Машины персонажей (индивидуальные)
    car_tourist: "assets/cars/car_tourist.png",
    car_worker: "assets/cars/car_worker.png",
    car_forester: "assets/cars/car_forester.png",
    car_mechanic: "assets/cars/car_mechanic.png",

    // Раньше было assets/hitchhiker.png (его у тебя НЕТ)
    hitchhiker: "assets/avatars/default_npc.png",

    // map_point*.png у тебя тоже НЕТ — ставим плейсхолдер, чтобы игра не падала.
    // mapPoint: "assets/avatars/default_prop.png",
    // mapPointCurrent: "assets/avatars/default_prop.png",
    // mapPointLocked: "assets/avatars/default_prop.png",
    mapPoint: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><circle cx='32' cy='32' r='20' fill='%23f8fafc' fill-opacity='0.85'/><circle cx='32' cy='32' r='18' fill='none' stroke='%23020f17' stroke-opacity='0.35' stroke-width='2'/></svg>",
    mapPointCurrent: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><circle cx='32' cy='32' r='22' fill='%2322c55e' fill-opacity='0.25'/><circle cx='32' cy='32' r='18' fill='%23f8fafc' fill-opacity='0.90'/><circle cx='32' cy='32' r='21' fill='none' stroke='%2322c55e' stroke-opacity='0.90' stroke-width='3'/></svg>",
    mapPointLocked: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><circle cx='32' cy='32' r='20' fill='%2394a3b8' fill-opacity='0.45'/><path d='M24 30v-4c0-4.4 3.6-8 8-8s8 3.6 8 8v4' fill='none' stroke='%23020f17' stroke-opacity='0.55' stroke-width='3'/><rect x='22' y='30' width='20' height='18' rx='3' fill='%23020f17' fill-opacity='0.45'/></svg>",

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

    // Раньше было assets/avatars/avatar_car.png (его у тебя НЕТ)
    // Для HUD машины используем дефолтный.
    avatar_car: "assets/avatars/default_car.png",

    // дефолтные аватарки
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
    item_flashlight: "assets/items/item_flashlight.png",
    item_backpack: "assets/items/item_backpack.png",

    /* ===== Props inside hub ===== */
    prop_trash: "assets/props/prop_trash.png",
    prop_npc: "assets/props/prop_npc.png",
    prop_npc_instructor_gas: "assets/props/prop_npc_instructor_gas.png",

    /* ===== Example: themed overrides (optional) ===== */
    // Тайлы hub0 у тебя ЕСТЬ — оставляем как есть
    hub0_tile_snow: "assets/tiles/hub0/tile_snow.png",
    hub0_tile_sidewalk: "assets/tiles/hub0/tile_sidewalk.png",
    hub0_tile_grass: "assets/tiles/hub0/tile_grass.png",
    hub0_road_straight: "assets/tiles/hub0/road_straight.png",
    hub0_road_corner: "assets/tiles/hub0/road_corner.png",
    hub0_road_t: "assets/tiles/hub0/road_t.png",
    hub0_road_cross: "assets/tiles/hub0/road_cross.png",
    hub0_road_end: "assets/tiles/hub0/road_end.png",

    // А ВОТ assets/tiles/hub0/poi_*.png у тебя НЕТ — поэтому themed POI направляем в реальные assets/poi/*
    hub0_hubGas: "assets/poi/hub_gas.png",
    hub0_hubFood: "assets/poi/hub_food.png",
    hub0_hubHotel: "assets/poi/hub_hotel.png",
    hub0_hubWork: "assets/poi/hub_work.png",
    hub0_hubBuilding: "assets/poi/hub_building.png"
  };

  /** @type {Record<string, HTMLImageElement>} */
  const sprites = {};

  for (const [key, src] of Object.entries(spritePaths)) {
    const img = new Image();
    img.src = src;

    img.addEventListener("error", () => {
      console.warn(`[sprites] failed to load: ${key} -> ${src}`);
    });

    sprites[key] = img;
  }

  // Глобально (как у тебя ожидают сцены)
  window.spritePaths = spritePaths;
  window.sprites = sprites;

  // И в единый неймспейс
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
