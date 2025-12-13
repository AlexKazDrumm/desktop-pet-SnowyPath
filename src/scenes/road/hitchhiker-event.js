// src/scenes/road/hitchhiker-event.js

function triggerHitchhikerEvent(h) {
  if (!state.road) return;
  state.currentHitchhiker = h;

  const title = `${h.name || "Автостопщик"}`;
  const desc = `${h.description || "Просит подвезти."}`;
  const base = Number(h.basePay || 0);
  const minPay = Number(h.minPay || Math.max(0, base - 5));
  const maxPay = Number(h.maxPay || (base + 10));

  roadDialogOpen(
    [title, desc, `Он предлагает ${base}₽ (диапазон ${minPay}–${maxPay}).`],
    [
      {
        id: "take_base",
        label: `Подвезти за ${base}₽`,
        onPick: () => {
          adjustResources({ money: base });
          state.lastMessage = `Вы подвезли пассажира и получили ${base}₽.`;
          state.currentHitchhiker = null;
          roadDialogClose();
          renderStats();
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
            state.lastMessage = `Торг успешен. Вы получили ${pay}₽.`;
          } else if (rnd < 0.8) {
            const pay = minPay;
            adjustResources({ money: pay });
            state.lastMessage = `Пассажир сбил цену. Вы получили ${pay}₽.`;
          } else {
            state.lastMessage = "Пассажир обиделся и ушёл.";
          }
          state.currentHitchhiker = null;
          roadDialogClose();
          renderStats();
        },
      },
      {
        id: "discount",
        label: "Сделать скидку",
        onPick: () => {
          const pay = randInt(minPay, base);
          adjustResources({ money: pay });
          state.lastMessage = `Вы дали скидку и получили ${pay}₽.`;
          state.currentHitchhiker = null;
          roadDialogClose();
          renderStats();
        },
      },
      {
        id: "skip",
        label: "Не останавливаться",
        onPick: () => {
          state.lastMessage = "Вы проехали мимо.";
          state.currentHitchhiker = null;
          roadDialogClose();
          renderStats();
        },
      },
    ]
  );
}

if (typeof window !== "undefined") {
  window.triggerHitchhikerEvent = triggerHitchhikerEvent;
}
