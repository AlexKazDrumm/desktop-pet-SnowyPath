// game-data.js

/** @type {Segment[]} */
const segments = [
  { id: 1, distance: 30, hungerLoss: 10, fatigueLoss: 15, hasGasStation: true,  hasDiner: true,  hasMotel: false },
  { id: 2, distance: 30, hungerLoss: 10, fatigueLoss: 15, hasGasStation: true,  hasDiner: false, hasMotel: true  },
  { id: 3, distance: 40, hungerLoss: 12, fatigueLoss: 18, hasGasStation: false, hasDiner: true,  hasMotel: false },
  { id: 4, distance: 40, hungerLoss: 12, fatigueLoss: 18, hasGasStation: true,  hasDiner: false, hasMotel: true  },
  { id: 5, distance: 50, hungerLoss: 15, fatigueLoss: 20, hasGasStation: true,  hasDiner: true,  hasMotel: false },
  { id: 6, distance: 50, hungerLoss: 15, fatigueLoss: 20, hasGasStation: false, hasDiner: true,  hasMotel: false },
  { id: 7, distance: 60, hungerLoss: 18, fatigueLoss: 23, hasGasStation: true,  hasDiner: true,  hasMotel: true  },
  { id: 8, distance: 60, hungerLoss: 18, fatigueLoss: 23, hasGasStation: false, hasDiner: true,  hasMotel: false },
  { id: 9, distance: 70, hungerLoss: 20, fatigueLoss: 25, hasGasStation: true,  hasDiner: true,  hasMotel: false }
];

/** @type {Hitchhiker[]} */
const hitchhikers = [
  // S1
  { id: "s1_h1", segmentIndex: 0, name: "Студент с рюкзаком",           basePay: 5,  minPay: 4,  maxPay: 7,  dangerLevel: "none",        description: "Просит довезти до следующего городка." },
  { id: "s1_h2", segmentIndex: 0, name: "Рабочий в спецовке",           basePay: 6,  minPay: 5,  maxPay: 8,  dangerLevel: "none",        description: "Возвращается после смены." },
  { id: "s1_h3", segmentIndex: 0, name: "Молодая пара",                 basePay: 10, minPay: 8,  maxPay: 13, dangerLevel: "none",        description: "Едут на мероприятие." },
  { id: "s1_h4", segmentIndex: 0, name: "Уставший клерк",               basePay: 12, minPay: 9,  maxPay: 15, dangerLevel: "none",        description: "Задержался на работе." },
  { id: "s1_h5", segmentIndex: 0, name: "Слишком улыбчивый тип",        basePay: 20, minPay: 14, maxPay: 28, dangerLevel: "suspicious",  description: "Слишком настойчиво хочет поехать именно с вами." },

  // S2
  { id: "s2_h1", segmentIndex: 1, name: "Парень с гитарой",             basePay: 5,  minPay: 4,  maxPay: 7,  dangerLevel: "none",        description: "Едет выступать." },
  { id: "s2_h2", segmentIndex: 1, name: "Местный фермер",               basePay: 7,  minPay: 5,  maxPay: 9,  dangerLevel: "none",        description: "Рассказывает про урожай." },
  { id: "s2_h3", segmentIndex: 1, name: "Коммивояжёр",                  basePay: 11, minPay: 9,  maxPay: 14, dangerLevel: "none",        description: "Демонстрирует товары." },
  { id: "s2_h4", segmentIndex: 1, name: "Бухгалтер",                    basePay: 13, minPay: 10, maxPay: 16, dangerLevel: "none",        description: "Жалуется на отчёты." },
  { id: "s2_h5", segmentIndex: 1, name: "Чисто одетый мужчина",         basePay: 22, minPay: 15, maxPay: 30, dangerLevel: "suspicious",  description: "Почти не говорит о себе." },

  // S3
  { id: "s3_h1", segmentIndex: 2, name: "Подросток в толстовке",        basePay: 6,  minPay: 5,  maxPay: 8,  dangerLevel: "none",        description: "Едет к друзьям." },
  { id: "s3_h2", segmentIndex: 2, name: "Мать с пакетом",               basePay: 7,  minPay: 5,  maxPay: 9,  dangerLevel: "none",        description: "Говорит о детях." },
  { id: "s3_h3", segmentIndex: 2, name: "Инженер",                      basePay: 12, minPay: 9,  maxPay: 15, dangerLevel: "none",        description: "Всё время смотрит на приборы." },
  { id: "s3_h4", segmentIndex: 2, name: "Фрилансер с ноутбуком",        basePay: 14, minPay: 10, maxPay: 18, dangerLevel: "none",        description: "Ищет wi-fi." },
  { id: "s3_h5", segmentIndex: 2, name: "Спокойный пенсионер",          basePay: 20, minPay: 16, maxPay: 26, dangerLevel: "none",        description: "Рассказывает старые истории." },

  // S4
  { id: "s4_h1", segmentIndex: 3, name: "Водитель-гость",              basePay: 6,  minPay: 5,  maxPay: 8,  dangerLevel: "none",        description: "Едет за своей машиной." },
  { id: "s4_h2", segmentIndex: 3, name: "Медик",                        basePay: 11, minPay: 9,  maxPay: 14, dangerLevel: "none",        description: "Возвращается после смены." },
  { id: "s4_h3", segmentIndex: 3, name: "Офисный работник",            basePay: 13, minPay: 10, maxPay: 16, dangerLevel: "none",        description: "Залипает в телефон." },
  { id: "s4_h4", segmentIndex: 3, name: "Бизнесмен",                    basePay: 22, minPay: 17, maxPay: 28, dangerLevel: "none",        description: "Постоянно говорит по телефону." },
  { id: "s4_h5", segmentIndex: 3, name: "Собранный мужчина",            basePay: 25, minPay: 18, maxPay: 35, dangerLevel: "suspicious",  description: "Внимательно оценивает салон и вас." },

  // S5
  { id: "s5_h1", segmentIndex: 4, name: "Турист с картой",              basePay: 6,  minPay: 5,  maxPay: 8,  dangerLevel: "none",        description: "Путается в маршруте." },
  { id: "s5_h2", segmentIndex: 4, name: "Горожанин",                    basePay: 12, minPay: 9,  maxPay: 15, dangerLevel: "none",        description: "Жалуется на пробки." },
  { id: "s5_h3", segmentIndex: 4, name: "Учитель",                      basePay: 14, minPay: 10, maxPay: 18, dangerLevel: "none",        description: "Говорит про учеников." },
  { id: "s5_h4", segmentIndex: 4, name: "Предприниматель",              basePay: 22, minPay: 17, maxPay: 28, dangerLevel: "none",        description: "Пытается что-то вам продать." },
  { id: "s5_h5", segmentIndex: 4, name: "Молчаливый пассажир",          basePay: 24, minPay: 18, maxPay: 32, dangerLevel: "suspicious",  description: "Отвечает односложно." },

  // S6
  { id: "s6_h1", segmentIndex: 5, name: "Механик",                      basePay: 7,  minPay: 5,  maxPay: 9,  dangerLevel: "none",        description: "Разбирается в машинах." },
  { id: "s6_h2", segmentIndex: 5, name: "Курьер",                       basePay: 12, minPay: 9,  maxPay: 15, dangerLevel: "none",        description: "Спешит доставить посылку." },
  { id: "s6_h3", segmentIndex: 5, name: "Продавец",                     basePay: 15, minPay: 11, maxPay: 18, dangerLevel: "none",        description: "Говорит о скидках." },
  { id: "s6_h4", segmentIndex: 5, name: "Человек в костюме",            basePay: 24, minPay: 18, maxPay: 32, dangerLevel: "none",        description: "Слишком аккуратен." },
  { id: "s6_h5", segmentIndex: 5, name: "Сдержанный попутчик",          basePay: 28, minPay: 20, maxPay: 38, dangerLevel: "suspicious",  description: "Отшучивается от личных вопросов." },

  // S7
  { id: "s7_h1", segmentIndex: 6, name: "Репортёр",                     basePay: 7,  minPay: 5,  maxPay: 9,  dangerLevel: "none",        description: "Записывает заметки." },
  { id: "s7_h2", segmentIndex: 6, name: "Строитель",                    basePay: 13, minPay: 10, maxPay: 16, dangerLevel: "none",        description: "Устал после смены." },
  { id: "s7_h3", segmentIndex: 6, name: "Айтишник",                     basePay: 15, minPay: 11, maxPay: 18, dangerLevel: "none",        description: "Говорит про серверы." },
  { id: "s7_h4", segmentIndex: 6, name: "Богатый турист",               basePay: 25, minPay: 19, maxPay: 33, dangerLevel: "none",        description: "Фотографирует всё подряд." },
  { id: "s7_h5", segmentIndex: 6, name: "Человек в плаще",              basePay: 30, minPay: 21, maxPay: 40, dangerLevel: "suspicious",  description: "Лицо часто скрыто тенью." },

  // S8
  { id: "s8_h1", segmentIndex: 7, name: "Местная жительница",           basePay: 7,  minPay: 5,  maxPay: 9,  dangerLevel: "none",        description: "Много рассказывает о местности." },
  { id: "s8_h2", segmentIndex: 7, name: "Хиппи",                        basePay: 14, minPay: 10, maxPay: 18, dangerLevel: "none",        description: "Говорит про свободу и музыку." },
  { id: "s8_h3", segmentIndex: 7, name: "Водитель без машины",          basePay: 16, minPay: 12, maxPay: 20, dangerLevel: "none",        description: "Говорит, что его авто в ремонте." },
  { id: "s8_h4", segmentIndex: 7, name: "Человек с кейсом",             basePay: 26, minPay: 20, maxPay: 34, dangerLevel: "none",        description: "Кейс не отпускает из рук." },
  { id: "s8_h5", segmentIndex: 7, name: "Молчащий пассажир",            basePay: 32, minPay: 22, maxPay: 42, dangerLevel: "suspicious",  description: "Его взгляд трудно прочитать." },

  // S9
  { id: "s9_h1", segmentIndex: 8, name: "Ветеринар",                    basePay: 8,  minPay: 5,  maxPay: 10, dangerLevel: "none",        description: "Везёт лекарства для животных." },
  { id: "s9_h2", segmentIndex: 8, name: "Молодой отец",                 basePay: 15, minPay: 11, maxPay: 19, dangerLevel: "none",        description: "Спешит домой к ребёнку." },
  { id: "s9_h3", segmentIndex: 8, name: "Переводчик",                   basePay: 17, minPay: 12, maxPay: 22, dangerLevel: "none",        description: "Интересуется вашей историей." },
  { id: "s9_h4", segmentIndex: 8, name: "Зажиточный человек",           basePay: 27, minPay: 21, maxPay: 35, dangerLevel: "none",        description: "Пахнет дорогим парфюмом." },
  { id: "s9_h5", segmentIndex: 8, name: "Спокойный попутчик",           basePay: 35, minPay: 25, maxPay: 45, dangerLevel: "suspicious",  description: "Внимательно слушает, но мало говорит." }
];

// 10 точек маршрута (0 — старт, 9 — финал)
const mapPoints = /** @type {Point[]} */ ([
  { x: 80,  y: 360 },
  { x: 160, y: 330 },
  { x: 240, y: 300 },
  { x: 320, y: 270 },
  { x: 400, y: 240 },
  { x: 480, y: 220 },
  { x: 560, y: 230 },
  { x: 640, y: 260 },
  { x: 720, y: 290 },
  { x: 780, y: 320 }
]);

// Кумулятивные расстояния от старта до каждой точки
const cumulativeDistances = (() => {
  const arr = [0];
  for (let i = 0; i < segments.length; i++) {
    arr.push(arr[i] + segments[i].distance);
  }
  return arr;
})();
