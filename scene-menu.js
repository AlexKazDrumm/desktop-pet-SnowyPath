// scene-menu.js

function setupMenuScene() {
  const btnMenuStart = /** @type {HTMLButtonElement|null} */ (qid("btnMenuStart"));
  if (!btnMenuStart) return;

  btnMenuStart.onclick = () => {
    // Новый забег
    state = createInitialState();
    renderStats();

    // Центруем персонажа, если канвас уже готов
    if (stopCanvas) {
      state.hub.x = stopCanvas.width / 2;
      state.hub.y = stopCanvas.height / 2;
    }

    setScreen("screen-stop");
  };
}
