(function initGameRules(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GameRules = api;
})(typeof window !== "undefined" ? window : globalThis, function createGameRules() {
  function evaluateFailure(gameState) {
    if (!gameState || gameState.finished) return null;
    if (Number(gameState.hunger) <= 0) {
      return {
        title: "Путешествие окончено",
        description: "Запасы еды закончились, и продолжать путь стало невозможно.",
        hint: "Пополняйте запас еды в городах и учитывайте расход перед длинным участком."
      };
    }
    if (Number(gameState.fatigue) <= 0) {
      return {
        title: "Путешествие окончено",
        description: "Усталость достигла предела, и водитель больше не может продолжать путь.",
        hint: "Отдыхайте в гостиницах и планируйте остановки до выезда."
      };
    }
    return null;
  }

  function isJourneyComplete(gameState, pointCount) {
    return Boolean(
      gameState && Number.isInteger(gameState.currentPointIndex) &&
      Number.isInteger(pointCount) && pointCount > 0 &&
      gameState.currentPointIndex >= pointCount - 1
    );
  }

  return { evaluateFailure, isJourneyComplete };
});

function showLoseScreen(result) {
  if (!result || !state) return false;
  state.alive = false;
  state.finished = true;
  state.mode = "lose";
  if (state.road) {
    state.road.active = false;
    state.road.pausedForEvent = false;
  }
  const title = document.getElementById("loseTitle");
  const description = document.getElementById("loseDescription");
  const hint = document.getElementById("loseHint");
  if (title) title.textContent = result.title;
  if (description) description.textContent = result.description;
  if (hint) hint.textContent = result.hint || "";
  setScreen("screen-lose");
  return true;
}

function checkFailConditions() {
  return showLoseScreen(GameRules.evaluateFailure(state));
}

function loseFromManiac(name) {
  const passengerName = String(name || "Опасный пассажир");
  return showLoseScreen({
    title: "Опасный попутчик",
    description: `${passengerName} оказался не тем, за кого себя выдавал.`,
    hint: "Не каждый выгодный заказ стоит риска. Иногда безопаснее проехать мимо."
  });
}

function endSuccess() {
  if (!GameRules.isJourneyComplete(state, mapPoints.length)) return false;
  state.alive = true;
  state.finished = true;
  state.mode = "end";
  if (state.road) state.road.active = false;
  const title = document.getElementById("endTitle");
  const description = document.getElementById("endDescription");
  if (title) title.textContent = "Маршрут пройден";
  if (description) description.textContent = `${state.characterName} добрался до конечной точки зимнего маршрута.`;
  setScreen("screen-end");
  return true;
}
