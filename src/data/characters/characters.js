// src/data/characters/characters.js

/**
 * Персонажи
 * Данные лежат в window.GameData.characters, но для совместимости оставлены:
 * - window.characters
 * - window.getCharacterById
 *
 * Важное изменение:
 * - стартовый инвентарь собирается через createInventoryItem (если доступно),
 *   чтобы предметы были в одном формате (id/name/iconKey/description/count/tags).
 * - carSpriteKey у каждого персонажа есть всегда, но если ассета нет — сцена возьмёт fallback sprites.car
 */

(function initCharacters() {
  window.GameData = window.GameData || {};
  window.GameData.characters = window.GameData.characters || {};

  /**
   * @typedef {'tourist'|'worker'|'forester'|'mechanic'} CharacterId
   * @typedef {{
   *   id: CharacterId;
   *   name: string;
   *   role: string;
   *   description: string;
   *   avatarKey: string;
   *   spritePrefix: string;
   *   carSpriteKey: string;
   *   hungerLossMultiplier: number;
   *   fatigueLossMultiplier: number;
   *   repairChance: number;
   *   baseFuel: number;
   *   baseMoney: number;
   *   baseHunger: number;
   *   baseFatigue: number;
   *   inventory: Array<{id:string; name:string; iconKey:string; description:string; count?:number; tags?:string[];}>;
   * }} CharacterConfig
   */

  /**
   * Безопасный билд стартового инвентаря:
   * 1) если есть createInventoryItem — используем его,
   * 2) иначе пробуем собрать из getGameItemById / GAME_ITEMS,
   * 3) иначе делаем фоллбек, но НЕ ставим всем "item_map".
   *
   * @param {string} itemId
   * @param {number} [count=1]
   */
  function buildStartItem(itemId, count = 1) {
    const safeCount = Math.max(1, Number.isFinite(count) ? count : 1);

    // 1) Нормальный путь: уже загружены items
    if (typeof window.createInventoryItem === "function") {
      const inst = window.createInventoryItem(itemId, safeCount);
      if (inst) return inst;
    }

    // 2) Если createInventoryItem ещё нет, но уже есть getGameItemById / GAME_ITEMS
    // (это тоже "items", просто другой уровень совместимости)
    let base = null;

    if (typeof window.getGameItemById === "function") {
      base = window.getGameItemById(itemId);
    } else if (window.GAME_ITEMS && typeof window.GAME_ITEMS === "object") {
      base = window.GAME_ITEMS[itemId] || null;
    }

    if (base && typeof base === "object") {
      const stackable = !!base.stackable;
      const maxStack = Number.isFinite(base.maxStack) ? base.maxStack : 1;
      const finalCount = stackable ? Math.max(1, Math.min(safeCount, maxStack)) : 1;

      return {
        id: String(base.id || itemId),
        name: String(base.name || itemId),
        description: String(base.description || ""),
        iconKey: String(base.iconKey || `item_${itemId}`),
        count: finalCount,
        tags: Array.isArray(base.tags) ? [...base.tags] : []
      };
    }

    // 3) Крайний фоллбек: пытаемся вывести иконку из id
    // Если ассета нет — UI просто покажет пустую/битую картинку,
    // но мы хотя бы не будем всем ставить карту.
    const derivedIconKey = itemId ? `item_${itemId}` : "item_map";

    return {
      id: itemId,
      name: itemId,
      iconKey: derivedIconKey || "item_map",
      description: "",
      count: safeCount,
      tags: []
    };
  }

  /** @type {CharacterConfig[]} */
  const characters = [
    {
      id: "tourist",
      name: "Турист",
      role: "Хочет объехать весь мир",
      description: "Лёгкий на подъём, но быстро устаёт без нормального сна.",
      avatarKey: "avatar_tourist",
      spritePrefix: "char_tourist",
      carSpriteKey: "car_tourist",
      hungerLossMultiplier: 1.0,
      fatigueLossMultiplier: 1.1,
      repairChance: 0.15,
      baseFuel: 60,
      baseMoney: 40,
      baseHunger: 80,
      baseFatigue: 80,
      inventory: [buildStartItem("map", 1)]
    },
    {
      id: "worker",
      name: "Вахтовик",
      role: "Едет на северную станцию",
      description: "Привык работать сменами, медленнее выгорает по бодрости.",
      avatarKey: "avatar_worker",
      spritePrefix: "char_worker",
      carSpriteKey: "car_worker",
      hungerLossMultiplier: 1.1,
      fatigueLossMultiplier: 0.8,
      repairChance: 0.25,
      baseFuel: 70,
      baseMoney: 55,
      baseHunger: 80,
      baseFatigue: 90,
      inventory: [buildStartItem("pistol", 1)]
    },
    {
      id: "forester",
      name: "Лесник",
      role: "Сибирский лесник",
      description: "Привык к полевым условиям, медленнее голодает.",
      avatarKey: "avatar_forester",
      spritePrefix: "char_forester",
      carSpriteKey: "car_forester",
      hungerLossMultiplier: 0.8,
      fatigueLossMultiplier: 1.0,
      repairChance: 0.2,
      baseFuel: 55,
      baseMoney: 35,
      baseHunger: 90,
      baseFatigue: 85,
      inventory: [buildStartItem("axe", 1)]
    },
    {
      id: "mechanic",
      name: "Автомеханик",
      role: "Едет на подработку",
      description: "Лучше всех понимает технику, есть шанс починить машину.",
      avatarKey: "avatar_mechanic",
      spritePrefix: "char_mechanic",
      carSpriteKey: "car_mechanic",
      hungerLossMultiplier: 1.0,
      fatigueLossMultiplier: 1.0,
      repairChance: 0.7,
      baseFuel: 60,
      baseMoney: 45,
      baseHunger: 80,
      baseFatigue: 80,
      inventory: [buildStartItem("canister", 1)]
    }
  ];

  /**
   * @param {CharacterId} id
   * @returns {CharacterConfig}
   */
  function getCharacterById(id) {
    const list = characters;
    const found = list.find((c) => c.id === id);
    return found || list[0];
  }

  // В единый неймспейс
  window.GameData.characters.characters = characters;
  window.GameData.characters.getCharacterById = getCharacterById;

  // Совместимость
  window.characters = characters;
  window.getCharacterById = getCharacterById;
})();
