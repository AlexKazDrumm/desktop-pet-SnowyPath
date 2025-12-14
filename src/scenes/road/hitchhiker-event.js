// src/scenes/road/hitchhiker-event.js

const HITCHHIKER_PAY = {
  s1_h2: { type: "item", itemId: "flashlight", itemName: "Фонарик" },
  s2_h2: { type: "item", itemId: "backpack", itemName: "Рюкзак" },
  s2_h1: { type: "none" } // без денег, просто просит подвезти
};

const MANIAC_IDS = ["s1_h5", "s2_h5"];

const HITCHHIKER_TALK = {
  s1_h1: {
    ask: "Подкиньте до техникума, рюкзак уже тянет плечо.",
    dest: "До техникума в соседнем городке, остановка у автостанции.",
    about: "Первокурсник-электрик, еду после сессии домой.",
    pay: "Денег мало, но отблагодарю скромно за бензин."
  },
  s1_h2: {
    ask: "У вас случайно нет места до трассы на север?",
    dest: "До выезда к северной трассе, там меня встретят.",
    about: "Работаю инструктором по вождению, не люблю опаздывать.",
    pay: "Могу отдать отличный фонарик — заменю им оплату."
  },
  s1_h3: {
    ask: "Дотянете до поста ГАИ? У меня там друг ждёт.",
    dest: "До поста ГАИ в конце сегмента, буквально пару километров.",
    about: "Охранник склада, смена кончилась час назад.",
    pay: "Заплачу честно, если довезёте без вопросов."
  },
  s1_h4: {
    ask: "Сильный ветер, можно в вашу сторону?",
    dest: "На комик-кон в соседний город.",
    about: "Стримчики снимаю, игры озвучиваю.",
    pay: "Что-нибудь придумаем."
  },
  s1_h5: {
    ask: "Дружище, подкинь до мотеля — деловое дело.",
    dest: "До мотеля на кольце, там встреча.",
    about: "Говорит, что предприниматель, но не любит подробностей.",
    pay: "Готов заплатить выше рынка, если не задавать вопросов."
  },
  s2_h1: {
    ask: "Очень надо до развилки. Денег нет, но я тихий пассажир.",
    dest: "До развилки у старого указателя, дальше пешком.",
    about: "Еду к сестре, документы потерял.",
    pay: "Заплатить не смогу, только спасибо и честное слово."
  },
  s2_h2: {
    ask: "Увезите меня отсюда, пожалуйста!",
    dest: "Куда угодно! В лесу сова! Мой брат... (плачет)",
    about: "Я Аля. Братик Артём спас меня.....",
    pay: "Отдам лишний рюкзак — почти новый."
  },
  s2_h3: {
    ask: "Нужно к автовокзалу, времени мало.",
    dest: "До городского автовокзала, платформы дальних рейсов.",
    about: "Учёная на конференцию, ноутбук в рюкзаке.",
    pay: "Заплачу как смогу, но без торга — время дороже."
  },
  s2_h4: {
    ask: "Подбросите до заправки?",
    dest: "До большой заправки с автомойкой.",
    about: "Монтажник, смена начнётся через час.",
    pay: "Заплачу нормально, если не опоздаю."
  },
  s2_h5: {
    ask: "Нужно срочно в порт, заберу груз.",
    dest: "До порта на реке, у складов.",
    about: "Говорит, что логист, выглядит торопливым.",
    pay: "Готов сыпануть наличными, если поедем быстро."
  }
};

function triggerHitchhikerEvent(h) {
  if (!state.road) return;
  state.currentHitchhiker = h;

  const payProfile = HITCHHIKER_PAY[h.id] || { type: "money" };
  const base = payProfile.type === "none" ? 0 : Number(h.basePay || 0);
  const minPay = payProfile.type === "none" ? 0 : Number(h.minPay || Math.max(0, base - 5));
  const maxPay = payProfile.type === "none" ? 0 : Number(h.maxPay || (base + 10));

  function showResultLine(line) {
    state.lastMessage = String(line || "");
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

  function getRewardLabel(amount) {
    if (payProfile.type === "item") return `Отдать ${payProfile.itemName || "предмет"}`;
    if (payProfile.type === "none") return "Ехать бесплатно";
    return `${amount}₽`;
  }

  function grantReward(amount) {
    if (MANIAC_IDS.includes(h.id)) {
      if (typeof loseFromManiac === "function") {
        loseFromManiac(h.name || "Опасный пассажир");
      }
      return "Это был маньяк. Игра окончена.";
    }
    if (payProfile.type === "item") {
      if (typeof addInventoryItemById === "function" && payProfile.itemId) {
        addInventoryItemById(payProfile.itemId, 1);
      }
      return `Пассажир отдал вам ${payProfile.itemName || "предмет"}.`;
    }
    if (payProfile.type === "none") {
      return "Вы везёте его бесплатно. Он благодарит вас.";
    }
    adjustResources({ money: amount });
    return `Вы получили ${amount}₽.`;
  }

  function openMainDialog() {
    roadDialogOpen(
      ["Попутчик просится в дорогу."],
      [
        {
          id: "talk",
          label: "Поговорить",
          onPick: () => openTalkDialog()
        },
        {
          id: "take_base",
          label: "Подвезти",
          onPick: () => {
            showResultLine(grantReward(base));
          },
        },
        {
          id: "bargain",
          label: "Торговаться",
          onPick: () => {
            if (payProfile.type === "none") {
              const success = Math.random() < 0.35;
              if (success) {
                const tip = randInt(1, 3);
                adjustResources({ money: tip });
                showResultLine(`Он находит пару монет. Вы получили ${tip}₽.`);
              } else {
                showResultLine("Просит подвезти бесплатно — денег нет.");
              }
              return;
            }

            if (payProfile.type === "item") {
              const tip = Math.random() < 0.4 ? randInt(1, 3) : 0;
              const msg = grantReward(base) + (tip ? ` Он накидывает ещё ${tip}₽.` : " Без доплаты.");
              if (tip) adjustResources({ money: tip });
              showResultLine(msg);
              return;
            }

            const rnd = Math.random();
            if (rnd < 0.6) {
              const pay = randInt(base, maxPay);
              showResultLine(grantReward(pay));
            } else if (rnd < 0.8) {
              const pay = minPay;
              showResultLine(grantReward(pay));
            } else {
              showResultLine("Он отказывается платить больше.");
            }
          },
        },
        {
          id: "skip",
          label: "Проехать мимо",
          onPick: () => {
            showResultLine("Вы едете дальше, не подбирая пассажира.");
          },
        }
      ]
    );
  }

  function openTalkDialog() {
    const info = HITCHHIKER_TALK[h.id] || {};
    const ask = info.ask || "Куда тебя подбросить?";
    const dest = info.dest || "До ближайшей развилки.";
    const about = info.about || "Не любит рассказывать о себе.";
    const pay =
      info.pay ||
      (payProfile.type === "item"
        ? `Отдаст ${payProfile.itemName || "предмет"} вместо денег.`
        : payProfile.type === "none"
          ? "Денег нет — просит подвезти бесплатно."
          : `Готов заплатить ${getRewardLabel(base)} (диапазон ${getRewardLabel(minPay)}–${getRewardLabel(maxPay)}).`);

    roadDialogOpen([ask], [
      {
        id: "ask_dest",
        label: "Куда тебе?",
        onPick: () => {
          roadDialogOpen([dest], [{ id: "back", label: "Назад", onPick: () => openTalkDialog() }]);
        }
      },
      {
        id: "ask_about",
        label: "Кто ты?",
        onPick: () => {
          roadDialogOpen([about], [{ id: "back", label: "Назад", onPick: () => openTalkDialog() }]);
        }
      },
      {
        id: "ask_pay",
        label: "Чем отплатишь?",
        onPick: () => {
          roadDialogOpen([pay], [{ id: "back", label: "Назад", onPick: () => openTalkDialog() }]);
        }
      },
      {
        id: "back_to_main",
        label: "К выбору",
        onPick: () => openMainDialog()
      }
    ]);
  }

  openMainDialog();
}

if (typeof window !== "undefined") {
  window.triggerHitchhikerEvent = triggerHitchhikerEvent;
}
