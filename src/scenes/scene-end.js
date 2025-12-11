// scene-end.js

function setupEndScreen() {
  const btnRestart = /** @type {HTMLButtonElement|null} */ (qid("btnRestart"));
  if (!btnRestart) return;

  btnRestart.onclick = () => {
    state = createInitialState();
    renderStats();

    if (stopCanvas) {
      state.hub.x = stopCanvas.width / 2;
      state.hub.y = stopCanvas.height / 2;
    }

    setScreen("screen-stop");
  };
}
