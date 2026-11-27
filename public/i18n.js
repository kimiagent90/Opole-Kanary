// Tłumaczenia: pl (główny), uk, ru, en. Użycie: I18N.t('klucz', {zmienna}), atrybuty data-i18n / data-i18n-ph / data-i18n-aria.
(() => {
'use strict';
const LANGS = [
  { code: 'pl', name: 'Polski' },
  { code: 'uk', name: 'Українська' },
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
];
const FLAGS = {
  pl: '<svg viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice"><rect width="60" height="30" fill="#fff"/><rect y="30" width="60" height="30" fill="#dc143c"/></svg>',
  uk: '<svg viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice"><rect width="60" height="30" fill="#0057b7"/><rect y="30" width="60" height="30" fill="#ffd700"/></svg>',
  ru: '<svg viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice"><rect width="60" height="20" fill="#fff"/><rect y="20" width="60" height="20" fill="#0039a6"/><rect y="40" width="60" height="20" fill="#d52b1e"/></svg>',
  en: '<svg viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice"><rect width="60" height="60" fill="#012169"/><path d="M0 0l60 60M60 0L0 60" stroke="#fff" stroke-width="10"/><path d="M0 0l60 60M60 0L0 60" stroke="#c8102e" stroke-width="4"/><path d="M30 0v60M0 30h60" stroke="#fff" stroke-width="16"/><path d="M30 0v60M0 30h60" stroke="#c8102e" stroke-width="9"/></svg>',
};
// klucz: [pl, uk, ru, en]
const D = {
  nav_map: ['Mapa', 'Мапа', 'Карта', 'Map'],
  nav_buses: ['Autobusy', 'Автобуси', 'Автобусы', 'Buses'],
  nav_chat: ['Czat', 'Чат', 'Чат', 'Chat'],
  nav_guide: ['Instrukcja', 'Інструкція', 'Инструкция', 'Guide'],
  nav_ideas: ['Pomysły', 'Ідеї', 'Идеи', 'Ideas'],
  nav_settings: ['Ustawienia', 'Опції', 'Опции', 'Settings'],
  offline: ['Brak połączenia. Pokazuję ostatnie dane.', 'Немає зʼєднання. Показую останні дані.', 'Нет соединения. Показываю последние данные.', 'You are offline. Showing the last data.'],

  buses_t: ['Autobusy na żywo', 'Автобуси наживо', 'Автобусы онлайн', 'Live buses'],
  buses_lead: ['Oficjalna mapa MZK Opole (DIP / OnTime). Dane pochodzą bezpośrednio z dip.mzkopole.pl.', 'Офіційна мапа MZK Opole (DIP / OnTime). Дані безпосередньо з dip.mzkopole.pl.', 'Официальная карта MZK Opole (DIP / OnTime). Данные напрямую с dip.mzkopole.pl.', 'Official MZK Opole map (DIP / OnTime). Data comes straight from dip.mzkopole.pl.'],
  buses_open: ['Otwórz DIP w nowej karcie', 'Відкрити DIP у новій вкладці', 'Открыть DIP в новой вкладке', 'Open DIP in a new tab'],

  feed_t: ['Aktywność', 'Активність', 'Активность', 'Activity'],
  feed_lead: ['Najnowsze zgłoszenia mieszkańców.', 'Останні повідомлення мешканців.', 'Последние сообщения жителей.', 'Latest reports from residents.'],
  feed_new: ['Przed chwilą', 'Щойно', 'Только что', 'Just now'],
  feed_old: ['3 godz. temu', '3 год тому', '3 ч назад', '3 h ago'],
  feed_empty: ['Brak aktywnych zgłoszeń.', 'Немає активних повідомлень.', 'Нет активных сообщений.', 'No active reports.'],
  on_map: ['Na mapie', 'На мапі', 'На карте', 'On map'],
  list_aria: ['Lista zgłoszeń', 'Список повідомлень', 'Список сообщений', 'Report list'],

  no_today: ['Dziś nie zauważono jeszcze kontrolerów', 'Сьогодні контролерів ще не помічено', 'Сегодня контролёров ещё не замечено', 'No inspectors spotted yet today'],
  filter_line: ['Filtr linii', 'Фільтр ліній', 'Фильтр линий', 'Line filter'],
  locate_aria: ['Moja lokalizacja', 'Моя локація', 'Моё местоположение', 'My location'],
  line_search_ph: ['Szukaj linii, np. 12 lub N1', 'Пошук лінії, напр. 12 або N1', 'Поиск линии, напр. 12 или N1', 'Search a line, e.g. 12 or N1'],
  line_note: ['Wybierz linię, aby pokazać tylko jej zgłoszenia i przystanki.', 'Оберіть лінію, щоб бачити лише її повідомлення та зупинки.', 'Выберите линию, чтобы видеть только её сообщения и остановки.', 'Pick a line to see only its reports and stops.'],
  line_only: ['Pokazuję tylko linię {n}.', 'Показую лише лінію {n}.', 'Показываю только линию {n}.', 'Showing line {n} only.'],
  line_nostops: [' Brak danych o liniach na przystankach — przystanki nie są filtrowane.', ' Немає даних про лінії на зупинках — зупинки не фільтруються.', ' Нет данных о линиях на остановках — остановки не фильтруются.', ' No line data for stops — stops are not filtered.'],
  no_line: ['Brak takiej linii', 'Немає такої лінії', 'Нет такой линии', 'No such line'],
  hint_pick: ['Dotknij mapy, aby wskazać miejsce', 'Торкніться мапи, щоб вказати місце', 'Коснитесь карты, чтобы указать место', 'Tap the map to choose a spot'],
  cancel: ['Anuluj', 'Скасувати', 'Отмена', 'Cancel'],
  report_btn: ['Widzę kontrolera', 'Бачу контролера', 'Вижу контролёра', 'I see an inspector'],

  new_report: ['Nowe zgłoszenie', 'Нове повідомлення', 'Новое сообщение', 'New report'],
  place_none: ['Lokalizacja nieznana — wskaż miejsce na mapie.', 'Локацію невідомо — вкажіть місце на мапі.', 'Местоположение неизвестно — укажите место на карте.', 'Location unknown — choose a spot on the map.'],
  place_me: ['Miejsce: Twoja lokalizacja ({c})', 'Місце: ваша локація ({c})', 'Место: ваше местоположение ({c})', 'Spot: your location ({c})'],
  place_picked: ['Miejsce: wybrane na mapie ({c})', 'Місце: обрано на мапі ({c})', 'Место: выбрано на карте ({c})', 'Spot: picked on the map ({c})'],
  pick_on_map: ['Wskaż miejsce na mapie', 'Вказати місце на мапі', 'Указать место на карте', 'Choose spot on map'],
  count_l: ['Liczba kontrolerów', 'Кількість контролерів', 'Количество контролёров', 'Number of inspectors'],
  less: ['Mniej', 'Менше', 'Меньше', 'Less'],
  more: ['Więcej', 'Більше', 'Больше', 'More'],
  transport_l: ['Środek transportu', 'Транспорт', 'Транспорт', 'Transport'],
  bus: ['Autobus', 'Автобус', 'Автобус', 'Bus'],
  line_l: ['Linia (opcjonalnie)', 'Лінія (необовʼязково)', 'Линия (необязательно)', 'Line (optional)'],
  comment_l: ['Komentarz (opcjonalnie)', 'Коментар (необовʼязково)', 'Комментарий (необязательно)', 'Comment (optional)'],
  comment_ph: ['np. w stronę Dworca Głównego', 'напр. у бік Головного вокзалу', 'напр. в сторону Главного вокзала', 'e.g. towards the Main Station'],
  q1: ['W stronę centrum', 'У бік центру', 'В сторону центра', 'Towards the centre'],
  q2: ['Od centrum', 'Від центру', 'От центра', 'Away from the centre'],
  q3: ['Na przystanku', 'На зупинці', 'На остановке', 'At the stop'],
  q4: ['W autobusie', 'В автобусі', 'В автобусе', 'On the bus'],
  q5: ['Wysiadają', 'Виходять', 'Выходят', 'Getting off'],
  send: ['Wyślij', 'Надіслати', 'Отправить', 'Send'],
  pick_first: ['Wskaż miejsce na mapie', 'Вкажіть місце на мапі', 'Укажите место на карте', 'Choose a spot on the map'],

  pp_count: ['Kontrolerów: {n}', 'Контролерів: {n}', 'Контролёров: {n}', 'Inspectors: {n}'],
  pp_line: ['Linia {n}', 'Лінія {n}', 'Линия {n}', 'Line {n}'],
  fresh1: ['Świeże zgłoszenie', 'Свіже повідомлення', 'Свежее сообщение', 'Fresh report'],
  fresh2: ['Kilka minut temu', 'Кілька хвилин тому', 'Несколько минут назад', 'A few minutes ago'],
  fresh3: ['Może być nieaktualne', 'Може бути неактуальним', 'Может быть неактуально', 'May be outdated'],
  fresh4: ['Prawdopodobnie nieaktualne', 'Імовірно неактуальне', 'Вероятно неактуально', 'Probably outdated'],
  pp_conf: ['potwierdzono {ago}', 'підтверджено {ago}', 'подтверждено {ago}', 'confirmed {ago}'],
  pp_votes: ['Potwierdzenia: {a} · Zaprzeczenia: {b}', 'Підтвердження: {a} · Заперечення: {b}', 'Подтверждения: {a} · Опровержения: {b}', 'Confirmations: {a} · Denials: {b}'],
  still: ['Nadal tu są', 'Вони досі тут', 'Всё ещё здесь', 'Still here'],
  gone: ['Już ich nie ma', 'Їх уже немає', 'Их уже нет', 'Gone now'],
  thanks: ['Dziękujemy za odpowiedź!', 'Дякуємо за відповідь!', 'Спасибо за ответ!', 'Thanks for your answer!'],
  ago_now: ['przed chwilą', 'щойно', 'только что', 'just now'],
  ago_min: ['{n} min temu', '{n} хв тому', '{n} мин назад', '{n} min ago'],
  ago_h: ['{h} godz. temu', '{h} год тому', '{h} ч назад', '{h} h ago'],
  ago_hm: ['{h} godz. {m} min temu', '{h} год {m} хв тому', '{h} ч {m} мин назад', '{h} h {m} min ago'],
  merged: ['Obok jest już takie zgłoszenie — potwierdziliśmy je.', 'Поруч уже є таке повідомлення — ми його підтвердили.', 'Рядом уже есть такое сообщение — мы подтвердили его.', 'A report already exists nearby — we confirmed it.'],
  added: ['Zgłoszenie dodane. Dziękujemy!', 'Повідомлення додано. Дякуємо!', 'Сообщение добавлено. Спасибо!', 'Report added. Thank you!'],
  geo_toast: ['Geolokalizacja niedostępna — zezwól na nią w ustawieniach przeglądarki.', 'Геолокація недоступна — дозвольте її в налаштуваннях браузера.', 'Геолокация недоступна — разрешите её в настройках браузера.', 'Location unavailable — allow it in your browser settings.'],
  stop_lines: ['Linie: {l}', 'Лінії: {l}', 'Линии: {l}', 'Lines: {l}'],

  e_out_of_city: ['To miejsce jest poza Opolem.', 'Це місце поза межами Ополя.', 'Это место за пределами Ополя.', 'That spot is outside Opole.'],
  e_bad_line: ['Nieprawidłowa linia.', 'Неправильна лінія.', 'Неверная линия.', 'Invalid line.'],
  e_rate_limit: ['Za często — spróbuj za {s} s.', 'Занадто часто — спробуйте за {s} с.', 'Слишком часто — попробуйте через {s} с.', 'Too fast — try again in {s} s.'],
  e_already_voted: ['Już głosowałeś(-aś) na to zgłoszenie.', 'Ви вже голосували за це повідомлення.', 'Вы уже голосовали за это сообщение.', 'You already voted on this report.'],
  e_not_found: ['To zgłoszenie już wygasło.', 'Це повідомлення вже застаріло.', 'Это сообщение уже устарело.', 'This report has already expired.'],
  e_blocked: ['Twój dostęp został zablokowany przez administratora.', 'Ваш доступ заблоковано адміністратором.', 'Ваш доступ заблокирован администратором.', 'Your access was blocked by an administrator.'],
  e_chat_slow: ['Wolniej — poczekaj chwilę.', 'Повільніше — зачекайте трохи.', 'Помедленнее — подождите немного.', 'Slow down a little.'],
  e_empty: ['Wpisz treść.', 'Введіть текст.', 'Введите текст.', 'Type something first.'],
  e_bad_client: ['Odśwież stronę i spróbuj ponownie.', 'Оновіть сторінку та спробуйте ще раз.', 'Обновите страницу и попробуйте ещё раз.', 'Refresh the page and try again.'],
  e_network: ['Brak połączenia z serwerem.', 'Немає зʼєднання із сервером.', 'Нет соединения с сервером.', 'Cannot reach the server.'],
  e_generic: ['Coś poszło nie tak. Spróbuj ponownie.', 'Щось пішло не так. Спробуйте ще раз.', 'Что-то пошло не так. Попробуйте ещё раз.', 'Something went wrong. Please try again.'],

  chat_t: ['Czat', 'Чат', 'Чат', 'Chat'],
  chat_lead: ['Rozmawiaj z innymi mieszkańcami. Bądź uprzejmy — wiadomości moderuje administrator.', 'Спілкуйтесь з іншими мешканцями. Будьте ввічливі — повідомлення модерує адміністратор.', 'Общайтесь с другими жителями. Будьте вежливы — сообщения модерирует администратор.', 'Chat with other residents. Be kind — an admin moderates messages.'],
  nick_ph: ['Pseudonim', 'Нікнейм', 'Ник', 'Nickname'],
  msg_ph: ['Napisz wiadomość…', 'Напишіть повідомлення…', 'Напишите сообщение…', 'Write a message…'],
  chat_empty: ['Jeszcze cicho. Napisz pierwszą wiadomość!', 'Поки тихо. Напишіть перше повідомлення!', 'Пока тихо. Напишите первое сообщение!', 'Quiet so far. Write the first message!'],
  send_aria: ['Wyślij wiadomość', 'Надіслати повідомлення', 'Отправить сообщение', 'Send message'],

  ideas_t: ['Pomysły i błędy', 'Ідеї та помилки', 'Идеи и ошибки', 'Ideas & bugs'],
  ideas_lead: ['Masz pomysł na ulepszenie albo znalazłeś błąd? Napisz — czyta to administrator.', 'Маєте ідею або знайшли помилку? Напишіть — це читає адміністратор.', 'Есть идея или нашли ошибку? Напишите — это читает администратор.', 'Got an idea or found a bug? Tell us — the admin reads everything.'],
  k_idea: ['Pomysł', 'Ідея', 'Идея', 'Idea'],
  k_bug: ['Błąd', 'Помилка', 'Ошибка', 'Bug'],
  k_other: ['Inne', 'Інше', 'Другое', 'Other'],
  fb_ph: ['Opisz swój pomysł lub problem…', 'Опишіть свою ідею або проблему…', 'Опишите свою идею или проблему…', 'Describe your idea or problem…'],
  fb_contact_ph: ['Kontakt (opcjonalnie): e-mail lub Telegram', 'Контакт (необовʼязково): e-mail або Telegram', 'Контакт (необязательно): e-mail или Telegram', 'Contact (optional): e-mail or Telegram'],
  fb_send: ['Wyślij do administratora', 'Надіслати адміністратору', 'Отправить администратору', 'Send to admin'],
  fb_thanks: ['Dziękujemy! Wiadomość trafiła do administratora.', 'Дякуємо! Повідомлення передано адміністратору.', 'Спасибо! Сообщение передано администратору.', 'Thank you! Your message reached the admin.'],

  set_t: ['Ustawienia', 'Налаштування', 'Настройки', 'Settings'],
  set_lead: ['Dopasuj aplikację do siebie.', 'Налаштуйте застосунок під себе.', 'Настройте приложение под себя.', 'Make the app yours.'],
  lang_l: ['Język', 'Мова', 'Язык', 'Language'],
  map_theme: ['Styl mapy', 'Стиль мапи', 'Стиль карты', 'Map style'],
  th_voyager: ['Kolorowa', 'Кольорова', 'Цветная', 'Colourful'],
  th_liberty: ['Wektorowa 3D (domyślna)', 'Векторна 3D (за замовчуванням)', 'Векторная 3D (по умолчанию)', 'Vector 3D (default)'],
  tilt_aria: ['Widok 3D', 'Вигляд 3D', 'Вид 3D', '3D view'],
  map_fail: ['Nie udało się załadować mapy. Sprawdź połączenie i spróbuj ponownie.', 'Не вдалося завантажити мапу. Перевірте зʼєднання та спробуйте ще раз.', 'Не удалось загрузить карту. Проверьте соединение и попробуйте ещё раз.', 'The map failed to load. Check your connection and try again.'],
  retry: ['Odśwież', 'Оновити', 'Обновить', 'Reload'],
  push_t: ['Powiadomienia push', 'Push-сповіщення', 'Push-уведомления', 'Push notifications'],
  push_desc: ['Dostaniesz powiadomienie o nowym zgłoszeniu w pobliżu lub na wybranych liniach — nawet gdy aplikacja jest zamknięta.', 'Ви отримаєте сповіщення про нове повідомлення поблизу або на обраних лініях — навіть коли застосунок закрито.', 'Вы получите уведомление о новом сообщении рядом или на выбранных линиях — даже когда приложение закрыто.', 'Get notified about a new report nearby or on your chosen lines — even when the app is closed.'],
  push_radius_l: ['Powiadamiaj, gdy kontrolerzy są w promieniu', 'Сповіщати, коли контролери в радіусі', 'Уведомлять, когда контролёры в радиусе', 'Notify me when inspectors are within'],
  push_r0: ['tylko moje linie', 'лише мої лінії', 'только мои линии', 'my lines only'],
  push_r500: ['500 m', '500 м', '500 м', '500 m'],
  push_r1000: ['1 km', '1 км', '1 км', '1 km'],
  push_r2000: ['2 km', '2 км', '2 км', '2 km'],
  push_r5000: ['5 km', '5 км', '5 км', '5 km'],
  push_lines_l: ['Moje linie (opcjonalnie):', 'Мої лінії (необовʼязково):', 'Мои линии (необязательно):', 'My lines (optional):'],
  push_unsupported: ['Ta przeglądarka nie obsługuje powiadomień push.', 'Цей браузер не підтримує push-сповіщення.', 'Этот браузер не поддерживает push-уведомления.', 'This browser does not support push notifications.'],
  push_denied: ['Powiadomienia są zablokowane w ustawieniach przeglądarki.', 'Сповіщення заблоковано в налаштуваннях браузера.', 'Уведомления заблокированы в настройках браузера.', 'Notifications are blocked in your browser settings.'],
  push_ios: ['iPhone: najpierw dodaj aplikację do ekranu początkowego (zakładka Instrukcja), potem włącz powiadomienia.', 'iPhone: спочатку додайте застосунок на початковий екран (вкладка «Інструкція»), потім увімкніть сповіщення.', 'iPhone: сначала добавьте приложение на экран «Домой» (вкладка «Инструкция»), затем включите уведомления.', 'iPhone: first add the app to your Home Screen (Guide tab), then enable notifications.'],
  push_enabled: ['Powiadomienia włączone.', 'Сповіщення увімкнено.', 'Уведомления включены.', 'Notifications enabled.'],
  push_geo_hint: ['Aby działał promień, zezwól na geolokalizację.', 'Щоб працював радіус, дозвольте геолокацію.', 'Чтобы работал радиус, разрешите геолокацию.', 'Allow location for the radius to work.'],
  th_osm: ['OpenStreetMap', 'OpenStreetMap', 'OpenStreetMap', 'OpenStreetMap'],
  th_light: ['Jasna', 'Світла', 'Светлая', 'Light'],
  th_dark: ['Ciemna', 'Темна', 'Тёмная', 'Dark'],
  notify: ['Powiadomienia o nowych zgłoszeniach', 'Сповіщення про нові повідомлення', 'Уведомления о новых сообщениях', 'New report notifications'],
  notif_unsupported: ['Przeglądarka nie obsługuje powiadomień.', 'Браузер не підтримує сповіщення.', 'Браузер не поддерживает уведомления.', 'This browser does not support notifications.'],
  geo: ['Geolokalizacja', 'Геолокація', 'Геолокация', 'Location'],
  geo_on: ['włączona', 'увімкнена', 'включена', 'on'],
  geo_off: ['niedostępna', 'недоступна', 'недоступна', 'unavailable'],
  allow: ['Zezwól', 'Дозволити', 'Разрешить', 'Allow'],
  about: ['Kanary Opole to nieoficjalna aplikacja, niezwiązana z MZK Opole. Zgłoszenia tworzą użytkownicy i mogą być nieprecyzyjne. Znaczek na mapie stopniowo szarzeje i znika po 3 godzinach bez potwierdzeń, a wszystkie znaczki są usuwane codziennie o północy. Mapa: © OpenStreetMap contributors, © CARTO.',
    'Kanary Opole — неофіційний застосунок, не повʼязаний з MZK Opole. Повідомлення створюють користувачі, вони можуть бути неточними. Позначка на мапі поступово сіріє й зникає через 3 години без підтверджень, а всі позначки видаляються щодня опівночі. Мапа: © OpenStreetMap contributors, © CARTO.',
    'Kanary Opole — неофициальное приложение, не связанное с MZK Opole. Сообщения создают пользователи, они могут быть неточными. Метка на карте постепенно сереет и исчезает через 3 часа без подтверждений, а все метки удаляются каждый день в полночь. Карта: © OpenStreetMap contributors, © CARTO.',
    'Kanary Opole is an unofficial app, not affiliated with MZK Opole. Reports are made by users and may be inaccurate. A marker gradually turns grey and disappears after 3 hours without confirmations, and all markers are cleared every day at midnight. Map: © OpenStreetMap contributors, © CARTO.'],

  g_title: ['Instrukcja', 'Інструкція', 'Инструкция', 'Guide'],
  g_lead: ['Dodaj Kanary Opole do ekranu telefonu. Działa jak zwykła aplikacja.', 'Додайте Kanary Opole на екран телефона. Працює як звичайний застосунок.', 'Добавьте Kanary Opole на экран телефона. Работает как обычное приложение.', 'Add Kanary Opole to your phone screen. It works like a regular app.'],
  g_installed: ['Aplikacja jest już zainstalowana', 'Застосунок уже встановлено', 'Приложение уже установлено', 'The app is already installed'],
  g_installed_s: ['Uruchomiona z ekranu głównego.', 'Запущено з головного екрана.', 'Запущено с главного экрана.', 'Launched from your home screen.'],
  g_cta: ['Zainstaluj jednym dotknięciem', 'Встановіть одним дотиком', 'Установите одним касанием', 'Install with one tap'],
  g_cta_s: ['Twoja przeglądarka to obsługuje.', 'Ваш браузер це підтримує.', 'Ваш браузер это поддерживает.', 'Your browser supports it.'],
  g_install: ['Zainstaluj', 'Встановити', 'Установить', 'Install'],
  g_ios_name: ['iPhone · Safari', 'iPhone · Safari', 'iPhone · Safari', 'iPhone · Safari'],
  g_and_name: ['Android · Chrome', 'Android · Chrome', 'Android · Chrome', 'Android · Chrome'],
  g_note: ['Ilustracje są poglądowe. Wygląd menu i nazwy opcji mogą się nieznacznie różnić zależnie od wersji systemu i przeglądarki.', 'Ілюстрації орієнтовні. Вигляд меню й назви пунктів можуть трохи відрізнятися залежно від версії системи та браузера.', 'Иллюстрации ориентировочные. Вид меню и названия пунктов могут немного отличаться в зависимости от версии системы и браузера.', 'Illustrations are indicative. Menu layout and option names may differ slightly by system and browser version.'],
  g_ios_intro: ['Dodawanie do ekranu początkowego działa tylko w przeglądarce Safari — nie w Chrome ani w aplikacjach komunikatorów.', 'Додавання на початковий екран працює лише в Safari — не в Chrome і не у вбудованих браузерах месенджерів.', 'Добавление на экран «Домой» работает только в Safari — не в Chrome и не во встроенных браузерах мессенджеров.', 'Add to Home Screen only works in Safari — not in Chrome or in the in-app browsers of messengers.'],
  g_ios1: ['Otwórz stronę w Safari', 'Відкрийте сайт у Safari', 'Откройте сайт в Safari', 'Open the site in Safari'],
  g_ios1t: ['Wpisz adres aplikacji w Safari i poczekaj, aż mapa się załaduje.', 'Введіть адресу застосунку в Safari та дочекайтеся завантаження мапи.', 'Введите адрес приложения в Safari и дождитесь загрузки карты.', 'Type the app address into Safari and wait for the map to load.'],
  g_ios2: ['Dotknij przycisku „Udostępnij”', 'Натисніть кнопку «Поділитися»', 'Нажмите кнопку «Поделиться»', 'Tap the Share button'],
  g_ios2t: ['To kwadrat ze strzałką w górę, na dolnym pasku Safari.', 'Це квадрат зі стрілкою вгору на нижній панелі Safari.', 'Это квадрат со стрелкой вверх на нижней панели Safari.', 'It is the square with an arrow pointing up on Safari’s bottom bar.'],
  g_ios3: ['Wybierz „Dodaj do ekranu początkowego”', 'Оберіть «На початковий екран»', 'Выберите «На экран “Домой”»', 'Choose “Add to Home Screen”'],
  g_ios3t: ['Przewiń listę w dół, jeśli opcji nie widać od razu.', 'Прокрутіть список донизу, якщо пункту не видно одразу.', 'Прокрутите список вниз, если пункта не видно сразу.', 'Scroll the list down if you do not see it right away.'],
  g_ios4: ['Potwierdź przyciskiem „Dodaj”', 'Підтвердіть кнопкою «Додати»', 'Подтвердите кнопкой «Добавить»', 'Confirm with “Add”'],
  g_ios4t: ['Możesz zostawić nazwę „Kanary Opole” albo ją zmienić. Dotknij „Dodaj” w prawym górnym rogu.', 'Можна залишити назву «Kanary Opole» або змінити її. Натисніть «Додати» у верхньому правому куті.', 'Можно оставить название «Kanary Opole» или изменить его. Нажмите «Добавить» в правом верхнем углу.', 'Keep the name “Kanary Opole” or change it. Tap “Add” in the top right corner.'],
  g_ios5: ['Gotowe!', 'Готово!', 'Готово!', 'Done!'],
  g_ios5t: ['Ikona pojawi się na ekranie początkowym. Aplikacja otwiera się na pełnym ekranie, bez paska przeglądarki.', 'Іконка зʼявиться на початковому екрані. Застосунок відкривається на весь екран, без панелі браузера.', 'Значок появится на экране «Домой». Приложение открывается на весь экран, без панели браузера.', 'The icon appears on your Home Screen. The app opens full screen with no browser bar.'],
  g_and_intro: ['Najlepiej działa w przeglądarce Chrome. W Samsung Internet opcja nazywa się „Dodaj stronę do” → „Ekran główny”.', 'Найкраще працює в Chrome. У Samsung Internet пункт називається «Додати сторінку до» → «Головний екран».', 'Лучше всего работает в Chrome. В Samsung Internet пункт называется «Добавить страницу в» → «Главный экран».', 'Works best in Chrome. In Samsung Internet the option is “Add page to” → “Home screen”.'],
  g_and1: ['Otwórz stronę w Chrome', 'Відкрийте сайт у Chrome', 'Откройте сайт в Chrome', 'Open the site in Chrome'],
  g_and1t: ['Wpisz adres aplikacji w Chrome i poczekaj, aż mapa się załaduje.', 'Введіть адресу застосунку в Chrome та дочекайтеся завантаження мапи.', 'Введите адрес приложения в Chrome и дождитесь загрузки карты.', 'Type the app address into Chrome and wait for the map to load.'],
  g_and2: ['Otwórz menu ⋮', 'Відкрийте меню ⋮', 'Откройте меню ⋮', 'Open the ⋮ menu'],
  g_and2t: ['Dotknij trzech kropek w prawym górnym rogu przeglądarki.', 'Натисніть три крапки у верхньому правому куті браузера.', 'Нажмите три точки в правом верхнем углу браузера.', 'Tap the three dots in the top right corner of the browser.'],
  g_and3: ['Wybierz „Zainstaluj aplikację”', 'Оберіть «Установити застосунок»', 'Выберите «Установить приложение»', 'Choose “Install app”'],
  g_and3t: ['W starszych wersjach Chrome ta opcja nazywa się „Dodaj do ekranu głównego”.', 'У старих версіях Chrome цей пункт називається «Додати на головний екран».', 'В старых версиях Chrome этот пункт называется «Добавить на главный экран».', 'In older Chrome versions it is called “Add to Home screen”.'],
  g_and4: ['Potwierdź przyciskiem „Zainstaluj”', 'Підтвердіть кнопкою «Установити»', 'Подтвердите кнопкой «Установить»', 'Confirm with “Install”'],
  g_and4t: ['Pojawi się okno z nazwą i ikoną aplikacji. Dotknij „Zainstaluj”.', 'Зʼявиться вікно з назвою та іконкою застосунку. Натисніть «Установити».', 'Появится окно с названием и значком приложения. Нажмите «Установить».', 'A dialog with the app name and icon appears. Tap “Install”.'],
  g_and5: ['Gotowe!', 'Готово!', 'Готово!', 'Done!'],
  g_and5t: ['Ikona pojawi się na ekranie głównym i w szufladzie aplikacji. Aplikacja otwiera się bez paska przeglądarki.', 'Іконка зʼявиться на головному екрані та у списку застосунків. Застосунок відкривається без панелі браузера.', 'Значок появится на главном экране и в списке приложений. Приложение открывается без панели браузера.', 'The icon appears on your home screen and in the app drawer. The app opens without the browser bar.'],
  // etykiety wewnątrz ilustracji (wyglądają jak interfejs telefonu)
  s_copy: ['Kopiuj', 'Скопіювати', 'Скопировать', 'Copy'],
  s_bookmark: ['Dodaj do zakładek', 'Додати закладку', 'Добавить закладку', 'Add Bookmark'],
  s_addhome: ['Dodaj do ekranu początkowego', 'На початковий екран', 'На экран «Домой»', 'Add to Home Screen'],
  s_find: ['Znajdź na stronie', 'Знайти на сторінці', 'Найти на странице', 'Find on Page'],
  s_cancel: ['Anuluj', 'Скасувати', 'Отмена', 'Cancel'],
  s_add_t1: ['Dodaj do ekranu', 'Додати на початковий', 'Добавить на экран', 'Add to Home'],
  s_add_t2: ['początkowego', 'екран', '«Домой»', 'Screen'],
  s_add: ['Dodaj', 'Додати', 'Добавить', 'Add'],
  s_hint1: ['Na ekranie początkowym pojawi się ikona,', 'На початковому екрані зʼявиться іконка,', 'На экране «Домой» появится значок,', 'An icon will appear on your Home Screen'],
  s_hint2: ['dzięki której szybko otworzysz aplikację.', 'щоб швидко відкрити застосунок.', 'чтобы быстро открыть приложение.', 'so you can open the app quickly.'],
  s_kanary: ['Kanary', 'Kanary', 'Kanary', 'Kanary'],
  s_a1: ['Nowa karta', 'Нова вкладка', 'Новая вкладка', 'New tab'],
  s_a2: ['Nowa karta incognito', 'Вкладка інкогніто', 'Вкладка инкогнито', 'New Incognito tab'],
  s_a3: ['Historia', 'Історія', 'История', 'History'],
  s_a4: ['Pobrane', 'Завантаження', 'Скачанные файлы', 'Downloads'],
  s_a5: ['Zainstaluj aplikację', 'Установити застосунок', 'Установить приложение', 'Install app'],
  s_a6: ['Udostępnij…', 'Поділитися…', 'Поделиться…', 'Share…'],
  s_a7: ['Znajdź na stronie', 'Пошук на сторінці', 'Найти на странице', 'Find in page'],
  s_dlg: ['Zainstalować aplikację?', 'Установити застосунок?', 'Установить приложение?', 'Install app?'],
  s_dlg_ok: ['Zainstaluj', 'Установити', 'Установить', 'Install'],
  s_search: ['Szukaj', 'Пошук', 'Поиск', 'Search'],
};
const IDX = { pl: 0, uk: 1, ru: 2, en: 3 };
let lang = 'pl';
try { const s = localStorage.getItem('lang'); if (s && IDX[s] !== undefined) lang = s; } catch {}

const t = (k, v) => {
  const e = D[k]; if (!e) return k;
  let s = e[IDX[lang]] || e[0];
  if (v) s = s.replace(/\{(\w+)\}/g, (m, n) => (v[n] ?? m));
  return s;
};
const has = (k) => !!D[k];

function apply() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  const fb = document.getElementById('langFlag'); if (fb) fb.innerHTML = FLAGS[lang];
  document.querySelectorAll('[data-lang]').forEach((b) => { const on = b.dataset.lang === lang; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
}
function set(l) {
  if (IDX[l] === undefined) return;
  lang = l; try { localStorage.setItem('lang', l); } catch {}
  apply();
  window.dispatchEvent(new CustomEvent('langchange', { detail: l }));
}
function buildMenus() {
  const opts = (cls) => LANGS.map((x) => `<button type="button" role="menuitemradio" class="${cls}" data-lang="${x.code}"><span class="flag">${FLAGS[x.code]}</span><span>${x.name}</span></button>`).join('');
  const menu = document.getElementById('langMenu'), btn = document.getElementById('langBtn');
  if (menu && btn) {
    menu.innerHTML = opts('lopt');
    btn.onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', !menu.hidden); };
    document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
    menu.onclick = (e) => { const b = e.target.closest('[data-lang]'); if (b) { set(b.dataset.lang); menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } };
  }
  const row = document.getElementById('langRow');
  if (row) { row.innerHTML = opts('lchip'); row.onclick = (e) => { const b = e.target.closest('[data-lang]'); if (b) set(b.dataset.lang); }; }
}
window.I18N = { t, has, set, apply, LANGS, FLAGS, get lang() { return lang; } };
buildMenus(); apply();
})();
