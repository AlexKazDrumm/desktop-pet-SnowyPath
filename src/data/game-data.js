// src/data/game-data.js

/**
 * game-data.js
 *
 * Shim + единая точка входа для data.
 * Этот файл сохраняем, потому что старые скрипты могут ожидать, что он существует.
 *
 * Теперь данные физически лежат в разных файлах, но глобальные имена сохранены:
 * segments, hitchhikers, mapPoints, cumulativeDistances,
 * characters, getCharacterById,
 * HUB_GRID_COLS, HUB_GRID_ROWS,
 * hubBuildingMetaByChar, hubGridConfigs, getHubGridConfig,
 * sprites, spritePaths,
 * GAME_ITEMS, getGameItemById, createInventoryItem
 */

(function dataShim() {
  window.GameData = window.GameData || {};
  window.GameData.meta = window.GameData.meta || {};

  function warnOnce(key, msg) {
    window.GameData.meta._warned = window.GameData.meta._warned || {};
    if (window.GameData.meta._warned[key]) return;
    window.GameData.meta._warned[key] = true;
    console.warn(msg);
  }

  // Мягкие проверки (не валим игру)
  if (!window.segments) warnOnce("segments", "[data] segments is missing");
  if (!window.hitchhikers) warnOnce("hitchhikers", "[data] hitchhikers is missing");
  if (!window.mapPoints) warnOnce("mapPoints", "[data] mapPoints is missing");
  if (!window.cumulativeDistances) warnOnce("cumulativeDistances", "[data] cumulativeDistances is missing");

  if (!window.characters) warnOnce("characters", "[data] characters is missing");
  if (!window.getCharacterById) warnOnce("getCharacterById", "[data] getCharacterById is missing");

  if (typeof window.HUB_GRID_COLS !== "number") warnOnce("HUB_GRID_COLS", "[data] HUB_GRID_COLS is missing");
  if (typeof window.HUB_GRID_ROWS !== "number") warnOnce("HUB_GRID_ROWS", "[data] HUB_GRID_ROWS is missing");
  if (!window.hubGridConfigs) warnOnce("hubGridConfigs", "[data] hubGridConfigs is missing");
  if (!window.getHubGridConfig) warnOnce("getHubGridConfig", "[data] getHubGridConfig is missing");
  if (!window.hubBuildingMetaByChar) warnOnce("hubBuildingMetaByChar", "[data] hubBuildingMetaByChar is missing");

  if (!window.sprites) warnOnce("sprites", "[data] sprites is missing");
  if (!window.spritePaths) warnOnce("spritePaths", "[data] spritePaths is missing");

  if (!window.GAME_ITEMS) warnOnce("GAME_ITEMS", "[data] GAME_ITEMS is missing");
  if (!window.getGameItemById) warnOnce("getGameItemById", "[data] getGameItemById is missing");
  if (!window.createInventoryItem) warnOnce("createInventoryItem", "[data] createInventoryItem is missing");

  // Сводная “витрина” в одном месте (ничего не меняет, просто удобно)
  window.GameData.routes = window.GameData.routes || {};
  window.GameData.routes.segments = window.segments || null;
  window.GameData.routes.hitchhikers = window.hitchhikers || null;
  window.GameData.routes.mapPoints = window.mapPoints || null;
  window.GameData.routes.cumulativeDistances = window.cumulativeDistances || null;

  window.GameData.hubs = window.GameData.hubs || {};
  window.GameData.hubs.HUB_GRID_COLS = window.HUB_GRID_COLS;
  window.GameData.hubs.HUB_GRID_ROWS = window.HUB_GRID_ROWS;
  window.GameData.hubs.hubBuildingMetaByChar = window.hubBuildingMetaByChar || null;
  window.GameData.hubs.hubGridConfigs = window.hubGridConfigs || null;
  window.GameData.hubs.getHubGridConfig = window.getHubGridConfig || null;

  // characters/items/sprites уже складываются в GameData соответствующими файлами
})();
