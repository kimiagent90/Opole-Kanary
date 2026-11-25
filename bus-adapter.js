// АДАПТЕР ИСТОЧНИКА АВТОБУСОВ MZK OPOLE (OnTime, https://dip.mzkopole.pl)
//
// НЕ ЗАПОЛНЕН: реальный эндпоинт мне определить не удалось (см. README).
// Как заполнить за 5 минут:
//  1. Откройте https://dip.mzkopole.pl в Chrome → F12 → вкладка Network → фильтр Fetch/XHR (или WS).
//  2. Найдите запрос, который периодически возвращает позиции транспорта (vehicles / positions и т.п.).
//  3. Скопируйте его URL в `url`, а структуру ответа опишите в `parse`.
//
// parse(json) должен вернуть массив:
//   { id, route, headsign?, lat, lon, bearing?, updatedAt (мс), extra? }
// Если источник — WebSocket, а не HTTP, server.js нужно расширить (сообщите, доделаю).
module.exports = {
  url: '',
  headers: {},
  parse(json) {
    throw new Error('parse() не реализован — опишите формат ответа dip.mzkopole.pl');
  },
};
