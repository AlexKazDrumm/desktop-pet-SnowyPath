const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicates.length) throw new Error(`Повторяющиеся DOM id: ${duplicates.join(", ")}`);

const source = fs.readFileSync(path.join(root, "src", "data", "game-sprites.js"), "utf8");
const paths = [...source.matchAll(/["`]((?:assets\/)[^"`]+\.png)["`]/g)]
  .map(match => match[1]).filter(assetPath => !assetPath.includes("${"));
const themedTiles = [
  "tile_snow", "tile_sidewalk", "tile_grass",
  "road_straight", "road_corner", "road_t", "road_cross", "road_end"
];
for (let hub = 1; hub <= 9; hub += 1) {
  for (const tile of themedTiles) paths.push(`assets/tiles/hub${hub}/${tile}.png`);
}
const missing = [...new Set(paths)].filter(assetPath => !fs.existsSync(path.join(root, assetPath)));
if (missing.length) throw new Error(`Не найдены ассеты:\n${missing.join("\n")}`);
console.log(`Проверено: ${ids.length} DOM id, ${new Set(paths).size} путей ассетов.`);
