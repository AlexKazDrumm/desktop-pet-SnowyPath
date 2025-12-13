// src/data/game-items.js

/**
 * Все предметы, которые МОГУТ находиться в инвентаре.
 * Данные лежат в window.GameData.items, но для совместимости оставлены:
 * - window.GAME_ITEMS
 * - window.getGameItemById
 * - window.createInventoryItem
 */

(function initItems() {
  window.GameData = window.GameData || {};
  window.GameData.items = window.GameData.items || {};

  /**
   * @typedef {Object} GameItem
   * @property {string} id
   * @property {string} name
   * @property {string} description
   * @property {string} iconKey
   * @property {boolean} stackable
   * @property {number} maxStack
   * @property {string[]} tags
   */

  /** @type {Record<string, GameItem>} */
  const GAME_ITEMS = {
    axe: {
      id: "axe",
      name: "Топор",
      description: "Тяжёлый, надёжный. Подойдёт и для работы, и для самообороны.",
      iconKey: "item_axe",
      stackable: false,
      maxStack: 1,
      tags: ["tool", "weapon"]
    },

    pistol: {
      id: "pistol",
      name: "Пистолет",
      description: "Старый, но рабочий. Лучше, чтобы не пригодился.",
      iconKey: "item_pistol",
      stackable: false,
      maxStack: 1,
      tags: ["weapon", "danger"]
    },

    canister: {
      id: "canister",
      name: "Канистра",
      description: "Запас топлива на экстренный случай.",
      iconKey: "item_canister",
      stackable: true,
      maxStack: 3,
      tags: ["fuel", "utility"]
    },

    map: {
      id: "map",
      name: "Карта местности",
      description: "Старая бумажная карта. Помогает ориентироваться.",
      iconKey: "item_map",
      stackable: false,
      maxStack: 1,
      tags: ["quest", "utility"]
    },

    rotten_sandwich: {
      id: "rotten_sandwich",
      name: "Испорченный сэндвич",
      description: "Пахнет ужасно. Но это еда… наверное.",
      iconKey: "item_rotten_sandwich",
      stackable: true,
      maxStack: 2,
      tags: ["food", "trash"]
    }
  };

  /**
   * @param {string} id
   * @returns {GameItem|null}
   */
  function getGameItemById(id) {
    return GAME_ITEMS[id] || null;
  }

  /**
   * Инстанс для инвентаря (с count)
   * @param {string} id
   * @param {number} [count=1]
   */
  function createInventoryItem(id, count = 1) {
    const base = getGameItemById(id);
    if (!base) return null;

    return {
      id: base.id,
      name: base.name,
      description: base.description,
      iconKey: base.iconKey,
      count: base.stackable ? Math.max(1, Math.min(count, base.maxStack)) : 1,
      tags: Array.isArray(base.tags) ? [...base.tags] : []
    };
  }

  // В единый неймспейс
  window.GameData.items.GAME_ITEMS = GAME_ITEMS;
  window.GameData.items.getGameItemById = getGameItemById;
  window.GameData.items.createInventoryItem = createInventoryItem;

  // Совместимость: старые глобалки
  window.GAME_ITEMS = GAME_ITEMS;
  window.getGameItemById = getGameItemById;
  window.createInventoryItem = createInventoryItem;
})();
