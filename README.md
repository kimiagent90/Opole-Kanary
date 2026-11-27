# Kanary Opole

Nieoficjalna PWA do zgłaszania kontrolerów biletów w komunikacji MZK Opole. Interfejs: PL (główny), UK, RU, EN.

- Mapa (Leaflet + CARTO Voyager), linie i przystanki (OSM), znaczki szarzeją i znikają po 3 h, codziennie o północy (Europe/Warsaw) mapa jest czyszczona.
- Czat, pomysły/błędy, panel admina `/admin` (liczniki prawdziwych użytkowników, usuwanie, blokady).
- Baza: PostgreSQL (`DATABASE_URL`), lokalnie SQLite (`node:sqlite`).

## Zmienne środowiskowe
`DATABASE_URL`, `ADMIN_USER`, `ADMIN_PASS`, `SESSION_SECRET` (nigdy nie commituj ich do repo).

## Start lokalny
`npm start` (Node >= 22) → http://localhost:3000
