// src/scenes/stop/stop-dialog-wiring.js

/**
 * Провода к window.StopDialogs (твоему файлу src/data/stop-dialogs.js)
 * Здесь нет логики хаба, только “как открыть нужный VN-диалог”.
 */

function openHub0NpcIntroDialog() {
  const D = window.StopDialogs;

  if (!D || typeof D.hub0Intro !== "function") {
    openStopDialogVN(
      ["Работник заправки: “Привет.”", "“Следи за ресурсами.”"],
      [{ id: "ok", label: "Ок", onPick: () => closeStopDialog() }],
      { lockMovement: true }
    );
    return;
  }

  const intro = D.hub0Intro();
  openStopDialogVN(
    intro.lines,
    [
      {
        id: "tips",
        label: "Дай конкретику",
        onPick: () => {
          const concrete = D.hub0IntroConcrete();
          openStopDialogVN(
            concrete.lines,
            concrete.choices.map((c) => ({
              id: c.id,
              label: c.label,
              onPick: () => closeStopDialog()
            })),
            { lockMovement: true }
          );
        }
      },
      { id: "bye", label: "Ок", onPick: () => closeStopDialog() }
    ],
    { lockMovement: true }
  );
}

function openNpcGenericDialog() {
  const D = window.StopDialogs;

  const root = D && typeof D.npcGenericRoot === "function" ? D.npcGenericRoot() : null;
  const about = D && typeof D.npcAboutPlace === "function" ? D.npcAboutPlace() : null;
  const mech = D && typeof D.npcMechanicsShort === "function" ? D.npcMechanicsShort() : null;
  const danger = D && typeof D.npcAboutHitchhikers === "function" ? D.npcAboutHitchhikers() : null;

  if (!root) {
    openStopDialogVN(
      ["Работник заправки: “Привет.”"],
      [{ id: "ok", label: "Ок", onPick: () => closeStopDialog() }],
      { lockMovement: true }
    );
    return;
  }

  openStopDialogVN(
    root.lines,
    [
      {
        id: "about",
        label: "Что за место?",
        onPick: () => {
          if (!about) {
            closeStopDialog();
            return;
          }
          openStopDialogVN(
            about.lines,
            [
              {
                id: "tips2",
                label: "Ок, а по механикам?",
                onPick: () => {
                  if (!mech) {
                    closeStopDialog();
                    return;
                  }
                  openStopDialogVN(
                    mech.lines,
                    [{ id: "ok", label: "Понял", onPick: () => closeStopDialog() }],
                    { lockMovement: true }
                  );
                }
              },
              { id: "bye", label: "Уйти", onPick: () => closeStopDialog() }
            ],
            { lockMovement: true }
          );
        }
      },
      {
        id: "danger",
        label: "Про попутчиков?",
        onPick: () => {
          if (!danger) {
            closeStopDialog();
            return;
          }
          openStopDialogVN(
            danger.lines,
            [{ id: "ok", label: "Ясно", onPick: () => closeStopDialog() }],
            { lockMovement: true }
          );
        }
      },
      { id: "bye0", label: "Уйти", onPick: () => closeStopDialog() }
    ],
    { lockMovement: true }
  );
}

function openTrashDialogFirst() {
  const D = window.StopDialogs;
  const t = D && typeof D.trashFirstTime === "function" ? D.trashFirstTime() : null;

  openStopDialogVN(
    t ? t.lines : ["Ты роешься в мусорке.", "Находка!"],
    [{ id: "take", label: "Забрать", onPick: () => closeStopDialog() }],
    { lockMovement: true }
  );
}

function openTrashDialogAgain() {
  const D = window.StopDialogs;
  const t = D && typeof D.trashAgain === "function" ? D.trashAgain() : null;

  openStopDialogVN(
    t ? t.lines : ["Ничего полезного."],
    [{ id: "ok", label: "Ладно", onPick: () => closeStopDialog() }],
    { lockMovement: true }
  );
}
