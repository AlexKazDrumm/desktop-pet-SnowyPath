// road-render.js — rendering logic for the road scene

function renderRoadScene() {
  if (!roadCtx || !roadCanvas) return;
  const ctx = roadCtx;
  const w = roadCanvas.width;
  const h = roadCanvas.height;

  ctx.clearRect(0, 0, w, h);

  // Фон
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, w, h);

  // Дорога
  const roadWidth = 260;
  const roadX = (w - roadWidth) / 2;
  ctx.fillStyle = "#111827";
  ctx.fillRect(roadX, 0, roadWidth, h);

  // Разметка
  ctx.strokeStyle = "#6b7280";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(roadX + roadWidth / 2, 0);
  ctx.lineTo(roadX + roadWidth / 2, h);
  ctx.stroke();
  ctx.setLineDash([]);

  // Машина
  const carSprite = sprites.car;
  const carWidth = 32;
  const carHeight = 48;

  const laneCenter = roadX + roadWidth / 2;
  const baseCarY = h - 80;

  let carOffsetX = 0;
  if (keysPressed["KeyA"] || keysPressed["ArrowLeft"]) carOffsetX -= 40;
  if (keysPressed["KeyD"] || keysPressed["ArrowRight"]) carOffsetX += 40;

  const carX = laneCenter + carOffsetX;
  const carY = baseCarY;

  if (carSprite && carSprite.complete && carSprite.naturalWidth > 0) {
    ctx.drawImage(
      carSprite,
      carX - carWidth / 2,
      carY - carHeight / 2,
      carWidth,
      carHeight
    );
  } else {
    ctx.fillStyle = "#f97316";
    ctx.fillRect(carX - carWidth / 2, carY - carHeight / 2, carWidth, carHeight);
  }

  // "Обочина" для ощущения движения
  const t = state.road.distanceTravelled;
  ctx.fillStyle = "#22c55e";
  for (let i = 0; i < 5; i++) {
    const yPos = ((t * 20 + i * 100) % (h + 100)) - 100;
    ctx.fillRect(roadX - 30, yPos, 20, 40);
    ctx.fillRect(roadX + roadWidth + 10, yPos + 40, 20, 40);
  }

  // Если мы остановились возле автостопщика — показать его на обочине
  if (state.currentHitchhiker) {
    const hitchSprite = sprites.hitchhiker;
    const hitchWidth = 28;
    const hitchHeight = 40;
    const hitchX = roadX + roadWidth + 40; // справа от дороги
    const hitchY = h / 2;

    if (hitchSprite && hitchSprite.complete && hitchSprite.naturalWidth > 0) {
      ctx.drawImage(
        hitchSprite,
        hitchX - hitchWidth / 2,
        hitchY - hitchHeight / 2,
        hitchWidth,
        hitchHeight
      );
    } else {
      ctx.fillStyle = "#eab308";
      ctx.fillRect(
        hitchX - hitchWidth / 2,
        hitchY - hitchHeight / 2,
        hitchWidth,
        hitchHeight
      );
    }
  }
}
