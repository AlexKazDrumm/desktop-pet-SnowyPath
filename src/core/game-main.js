// game-main.js

let lastTimestamp = 0;

/**
 * Обновление анимации игрока (смена кадров спрайта) в хабе
 * @param {number} dt
 */
function updatePlayerAnimation(dt) {
  if (!state || !state.playerAnim) return;

  const mode = state.mode;
  const char =
    state.characterConfig ||
    getCharacterById(state.characterId || selectedCharacterId);

  const prefix = char.spritePrefix;

  const moving =
    mode === "stop" &&
    (keysPressed["KeyW"] ||
      keysPressed["ArrowUp"] ||
      keysPressed["KeyS"] ||
      keysPressed["ArrowDown"] ||
      keysPressed["KeyA"] ||
      keysPressed["ArrowLeft"] ||
      keysPressed["KeyD"] ||
      keysPressed["ArrowRight"]);

  const anim = state.playerAnim;

  if (!moving) {
    anim.frameIndex = 0;
    anim.timer = 0;
    const idleKey = prefix + "_idle";
    if (sprites[idleKey]) {
      sprites.player = sprites[idleKey];
    }
    return;
  }

  anim.timer += dt;
  const frameDuration = 0.18; // ~5–6 fps анимации

  if (anim.timer >= frameDuration) {
    anim.timer -= frameDuration;
    anim.frameIndex = (anim.frameIndex + 1) % 2;
  }

  const frameKey = anim.frameIndex === 0 ? prefix + "_walk1" : prefix + "_walk2";
  if (sprites[frameKey]) {
    sprites.player = sprites[frameKey];
  }
}

/**
 * Главный игровой цикл
 * @param {number} timestamp
 */
function gameLoop(timestamp) {
  const dt = (timestamp - lastTimestamp) / 1000 || 0;
  lastTimestamp = timestamp;

  // Анимация игрока (опирается на нажатые клавиши и выбранного персонажа)
  updatePlayerAnimation(dt);

  if (state.mode === "stop") {
    renderStopHub(dt);
  } else if (state.mode === "map") {
    renderMap(dt);
  } else if (state.mode === "road") {
    updateRoad(dt);
  }
  // В меню и на экране конца ничего не обновляем по кадрам

  requestAnimationFrame(gameLoop);
}

window.addEventListener("DOMContentLoaded", () => {
  stopCanvas = /** @type {HTMLCanvasElement|null} */ (qid("stopCanvas"));
  mapCanvas  = /** @type {HTMLCanvasElement|null} */ (qid("mapCanvas"));
  roadCanvas = /** @type {HTMLCanvasElement|null} */ (qid("roadCanvas"));

  stopCtx = stopCanvas ? stopCanvas.getContext("2d") : null;
  mapCtx  = mapCanvas  ? mapCanvas.getContext("2d")  : null;
  roadCtx = roadCanvas ? roadCanvas.getContext("2d") : null;

  resizeStopCanvas();
  window.addEventListener("resize", resizeStopCanvas);

  renderStats();
  if (typeof window.setupInput === "function") {
    window.setupInput();
  } else {
    console.error("[game-main] setupInput is not defined");
  }
  setupMenuScene();
  setupEndScreen();

  // Стартуем с меню
  setScreen("screen-menu");

  requestAnimationFrame(gameLoop);
});

