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
   * если есть createInventoryItem — используем его,
   * иначе делаем совместимый фоллбек-объект.
   *
   * @param {string} itemId
   * @param {number} [count=1]
   */
  function buildStartItem(itemId, count = 1) {
    if (typeof window.createInventoryItem === "function") {
      const inst = window.createInventoryItem(itemId, count);
      if (inst) return inst;
    }

    // fallback (если items ещё не подгрузились)
    return {
      id: itemId,
      name: itemId,
      iconKey: "item_map",
      description: "",
      count: Math.max(1, count)
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
