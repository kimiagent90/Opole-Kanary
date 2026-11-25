# Kanary Opole (PWA, PL)

Без зависимостей: нужен только Node >= 18.

    npm start        # http://localhost:3000

## Статус
- Работает и проверено на сервере: отметки (создание, антиспам 1/мин, слияние дубликатов в радиусе 150 м,
  подтверждение/опровержение, актуальность high/medium/low, автоудаление через 45 мин), SSE-синхронизация, PWA-файлы.
- НЕ работает: реальные автобусы MZK. Адрес API dip.mzkopole.pl (OnTime) не определён.
  `/api/buses` честно отвечает 503, интерфейс показывает «источник не настроен». Заглушек и выдуманных автобусов нет.

## Подключение автобусов
1. https://dip.mzkopole.pl → F12 → Network → Fetch/XHR (и WS) → найти запрос с позициями транспорта.
2. Запустить: `BUS_FEED_URL="<url>" npm start` и описать формат ответа в `bus-adapter.js` (функция parse).
3. Если источник — WebSocket, нужна доработка server.js.
Проверьте условия использования данных MZK/OnTime перед публикацией приложения.

## Ограничения
- Хранилище: JSON-файл (data/reports.json), один процесс. Для продакшена — Supabase/Postgres.
- Для установки на iPhone и геолокации нужен HTTPS (localhost работает без него).
- Push-уведомления: только локальные, пока вкладка открыта.
- Польский язык: заготовка в настройках, переводов пока нет.
- Тайлы карты: CARTO/OSM, Leaflet грузится с unpkg (нужен интернет при первом запуске).

## Railway
Uruchomienie: `npm start` (serwer czyta `PORT` ze zmiennej środowiskowej). Dane zgłoszeń są w `data/reports.json`;
na Railway dołącz Volume zamontowany w `/app/data`, inaczej zgłoszenia znikną po redeployu.
