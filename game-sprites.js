// game-sprites.js

const spritePaths = {
  player: "assets/player.png",
  car: "assets/car.png",
  hubGas: "assets/hub_gas.png",
  hubFood: "assets/hub_food.png",
  hubHotel: "assets/hub_hotel.png",
  hubWork: "assets/hub_work.png",
  hitchhiker: "assets/hitchhiker.png",
  mapPoint: "assets/map_point.png",
  mapPointCurrent: "assets/map_point_current.png",
  mapPointLocked: "assets/map_point_locked.png"
};

/** @type {Record<string, HTMLImageElement>} */
const sprites = {};
for (const [key, src] of Object.entries(spritePaths)) {
  const img = new Image();
  img.src = src;
  sprites[key] = img;
}
