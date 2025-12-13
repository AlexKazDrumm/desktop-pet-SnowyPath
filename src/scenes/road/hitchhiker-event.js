// src/scenes/road/hitchhiker-event.js

function triggerHitchhikerEvent(h) {
  if (!state.road) return;
  state.currentHitchhiker = h;

  const title = `${h.name || "Автостопщик"}`;
  const desc = `${h.description || "Просит подвезти."}`;
  const base = Number(h.basePay || 0);
  const minPay = Number(h.minPay || Math.max(0, base - 5));
  const maxPay = Number(h.maxPay || (base + 10));
  // Open dialog showing the *offer* line only — name/description are shown in HUD
  // helper: show result line and wait for player to press "Далее" before finalizing entity
  function showResultLine(line) {
    state.lastMessage = String(line || "");
    // single-step dialog: show result and a single "Далее" choice which finalizes the entity
    roadDialogOpen([state.lastMessage], [
      {
        id: "advance",
        label: "Далее",
        onPick: () => {
          try {
            const activeId = state.road && state.road._activeEntityId ? state.road._activeEntityId : null;
            if (activeId && state.road && Array.isArray(state.road.entities)) {
              const ent = state.road.entities.find((e) => e && e.id === activeId);
              if (ent) ent.triggered = true;
            }
          } catch (e) { /* ignore */ }
          if (state.road) state.road._activeEntityId = null;
          state.currentHitchhiker = null;
          roadDialogClose();
          try { renderStats(); } catch (e) { /* ignore */ }
        }
      }
    ]);
  }

  roadDialogOpen(
    [`Он предлагает ${base}₽ (диапазон ${minPay}–${maxPay}).`],
    [
      {
        id: "take_base",
        label: `Подвезти за ${base}₽`,
        onPick: () => {
          adjustResources({ money: base });
          showResultLine(`Вы подвезли пассажира и получили ${base}₽.`);
        },
      },
      {
        id: "bargain",
        label: "Поторговаться",
        onPick: () => {
          const rnd = Math.random();
          if (rnd < 0.6) {
            const pay = randInt(base, maxPay);
            adjustResources({ money: pay });
            showResultLine(`Торг успешен. Вы получили ${pay}₽.`);
          } else if (rnd < 0.8) {
            const pay = minPay;
            adjustResources({ money: pay });
            showResultLine(`Пассажир сбил цену. Вы получили ${pay}₽.`);
          } else {
            showResultLine("Пассажир обиделся и ушёл.");
          }
        },
      },
      {
        id: "discount",
        label: "Сделать скидку",
        onPick: () => {
          const pay = randInt(minPay, base);
          adjustResources({ money: pay });
          showResultLine(`Вы дали скидку и получили ${pay}₽.`);
        },
      },
      {
        id: "skip",
        label: "Не останавливаться",
        onPick: () => {
          showResultLine("Вы проехали мимо.");
        },
      },
    ]
  );
}

if (typeof window !== "undefined") {
  window.triggerHitchhikerEvent = triggerHitchhikerEvent;
}
