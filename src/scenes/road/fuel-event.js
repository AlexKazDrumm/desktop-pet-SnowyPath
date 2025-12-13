// src/scenes/road/fuel-event.js

function triggerFuelLowEvent() {
  state.lastMessage = "Топливо на исходе.";
  renderStats();
}

if (typeof window !== "undefined") {
  window.triggerFuelLowEvent = triggerFuelLowEvent;
}
