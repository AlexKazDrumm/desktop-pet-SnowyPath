// game-sprites.js

const spritePaths = {
  // базовый "игрок" — по умолчанию турист в стойке
  player: "assets/char_tourist_idle.png",

  car: "assets/car.png",
  hubGas: "assets/hub_gas.png",
  hubFood: "assets/hub_food.png",
  hubHotel: "assets/hub_hotel.png",
  hubWork: "assets/hub_work.png",
  hitchhiker: "assets/hitchhiker.png",
  mapPoint: "assets/map_point.png",
  mapPointCurrent: "assets/map_point_current.png",
  mapPointLocked: "assets/map_point_locked.png",

  // Фоны хабов (города)
  hubBg0: "assets/hub_bg_0.png",
  hubBg1: "assets/hub_bg_1.png",
  hubBg2: "assets/hub_bg_2.png",
  hubBg3: "assets/hub_bg_3.png",
  hubBg4: "assets/hub_bg_4.png",
  hubBg5: "assets/hub_bg_5.png",
  hubBg6: "assets/hub_bg_6.png",
  hubBg7: "assets/hub_bg_7.png",
  hubBg8: "assets/hub_bg_8.png",
  hubBg9: "assets/hub_bg_9.png",

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
  item_pistol: "assets/item_pistol.png"
};

/** @type {Record<string, HTMLImageElement>} */
const sprites = {};
for (const [key, src] of Object.entries(spritePaths)) {
  const img = new Image();
  img.src = src;
  sprites[key] = img;
}

