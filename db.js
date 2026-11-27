// Warstwa bazy danych: Postgres (DATABASE_URL) w produkcji, lokalny SQLite (node:sqlite) do testów.
// Zapytania są pisane w stylu Postgres ($1, $2...). Czasy trzymamy jako BIGINT (ms od epoki).
'use strict';
const path = require('path');
const fs = require('fs');

let kind = '', pool = null, lite = null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY, lat DOUBLE PRECISION NOT NULL, lon DOUBLE PRECISION NOT NULL,
    cnt INTEGER NOT NULL DEFAULT 1, route TEXT NOT NULL DEFAULT '', comment TEXT NOT NULL DEFAULT '',
    transport TEXT NOT NULL DEFAULT 'bus', created_at BIGINT NOT NULL, last_confirmed_at BIGINT NOT NULL,
    confirms INTEGER NOT NULL DEFAULT 1, denies INTEGER NOT NULL DEFAULT 0, client_id TEXT NOT NULL DEFAULT '',
    status INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status, last_confirmed_at)`,
  `CREATE INDEX IF NOT EXISTS reports_created_idx ON reports(created_at)`,
  `CREATE TABLE IF NOT EXISTS votes (
    report_id TEXT NOT NULL, client_id TEXT NOT NULL, kind TEXT NOT NULL, PRIMARY KEY (report_id, client_id))`,
  `CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY, first_seen BIGINT NOT NULL, last_seen BIGINT NOT NULL,
    standalone INTEGER NOT NULL DEFAULT 0, is_bot INTEGER NOT NULL DEFAULT 0,
    ua TEXT NOT NULL DEFAULT '', ip_hash TEXT NOT NULL DEFAULT '', lang TEXT NOT NULL DEFAULT '',
    blocked INTEGER NOT NULL DEFAULT 0, blocked_at BIGINT NOT NULL DEFAULT 0,
    reports_count INTEGER NOT NULL DEFAULT 0, messages_count INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS clients_seen_idx ON clients(last_seen)`,
  `CREATE TABLE IF NOT EXISTS daily_users (day TEXT NOT NULL, client_id TEXT NOT NULL, PRIMARY KEY (day, client_id))`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, client_id TEXT NOT NULL, nick TEXT NOT NULL, text TEXT NOT NULL,
    created_at BIGINT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS messages_created_idx ON messages(created_at)`,
  `CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, text TEXT NOT NULL, contact TEXT NOT NULL DEFAULT '',
    client_id TEXT NOT NULL, created_at BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'new')`,
  `CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS push_subs (
    endpoint TEXT PRIMARY KEY, client_id TEXT NOT NULL, lat DOUBLE PRECISION NOT NULL DEFAULT 0, lon DOUBLE PRECISION NOT NULL DEFAULT 0,
    has_pos INTEGER NOT NULL DEFAULT 0, radius INTEGER NOT NULL DEFAULT 0, lines TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL, last_sent BIGINT NOT NULL DEFAULT 0, fails INTEGER NOT NULL DEFAULT 0, pending TEXT NOT NULL DEFAULT '')`,
];

const toLite = (sql) => sql.replace(/\$(\d+)/g, '?$1');

async function all(sql, params = []) {
  if (kind === 'pg') return (await pool.query(sql, params)).rows;
  return lite.prepare(toLite(sql)).all(...params).map((r) => ({ ...r }));
}
async function get(sql, params = []) { return (await all(sql, params))[0]; }
async function run(sql, params = []) {
  if (kind === 'pg') { const r = await pool.query(sql, params); return { changes: r.rowCount }; }
  const r = lite.prepare(toLite(sql)).run(...params);
  return { changes: Number(r.changes) };
}

async function init() {
  if (process.env.DATABASE_URL) {
    const pg = require('pg');
    pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // BIGINT -> number
    const host = new URL(process.env.DATABASE_URL).hostname;
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL, max: 8, idleTimeoutMillis: 30000,
      ssl: host.includes('.') ? { rejectUnauthorized: false } : false, // adres wewnętrzny Render nie wymaga SSL
    });
    pool.on('error', (e) => console.error('pg pool error:', e.message));
    kind = 'pg';
  } else {
    const { DatabaseSync } = require('node:sqlite');
    const file = process.env.SQLITE_FILE || path.join(__dirname, 'data', 'kanary.sqlite');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    lite = new DatabaseSync(file);
    kind = 'sqlite';
  }
  for (const s of SCHEMA) await run(s);
  return kind;
}

async function getSetting(k) { const r = await get('SELECT v FROM settings WHERE k=$1', [k]); return r ? r.v : null; }
async function setSetting(k, v) {
  await run('INSERT INTO settings(k,v) VALUES($1,$2) ON CONFLICT (k) DO UPDATE SET v=$2', [k, String(v)]);
}

module.exports = { init, all, get, run, getSetting, setSetting, kind: () => kind };
