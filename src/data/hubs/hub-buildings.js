// src/data/hubs/hub-buildings.js

/**
 * @typedef {'gas'|'food'|'hotel'|'work'|'passive'} HubBuildingType
 * @typedef {{
 *   id: string;
 *   type: HubBuildingType;
 *   label: string;
 *   hint: string;
 *   spriteKey?: string;
 * }} HubBuildingMeta
 */

/** @type {Record<string, HubBuildingMeta>} */
window.hubBuildingMetaByChar = {
  G: { id: "gas",      type: "gas",      label: "Заправка",   hint: "E — купить 10 топлива за 10₽.", spriteKey: "hubGas" },
  F: { id: "food",     type: "food",     label: "Еда",        hint: "E — поесть (+40 сытости за 10₽).", spriteKey: "hubFood" },
  H: { id: "hotel",    type: "hotel",    label: "Гостиница",  hint: "E — поспать (до 100 бодрости за 25₽, -10 сытости).", spriteKey: "hubHotel" },
  W: { id: "work",     type: "work",     label: "Подработка", hint: "E — поработать (+30₽, -10 сытости, -10 бодрости).", spriteKey: "hubWork" },

  // Обычное пассивное здание (коллизия есть, действий нет)
  // ASCII: 'B'
  B: { id: "building", type: "passive",  label: "Здание",     hint: "E — осмотреть (ничего полезного).", spriteKey: "hubBuilding" }
};
