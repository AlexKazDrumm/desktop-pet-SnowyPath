// scene-end.js

function setupEndScreen() {
  const btnRestart = /** @type {HTMLButtonElement|null} */ (qid("btnRestart"));
  const btnLoseRestart = /** @type {HTMLButtonElement|null} */ (qid("btnLoseRestart"));
  const hook = (btn) => {
    if (!btn) return;
    btn.onclick = () => {
      state = createInitialState();
      renderStats();

      if (stopCanvas) {
        state.hub.x = stopCanvas.width / 2;
        state.hub.y = stopCanvas.height / 2;
      }

      setScreen("screen-stop");
    };
  };

  hook(btnRestart);
  hook(btnLoseRestart);
}
