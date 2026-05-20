import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dataDir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(path.join(dataDir, 'events.db'));

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      theme         TEXT NOT NULL,
      date_start    TEXT NOT NULL,
      date_end      TEXT NOT NULL,
      all_day       INTEGER NOT NULL DEFAULT 0,
      location      TEXT NOT NULL,
      organizer     TEXT NOT NULL,
      description   TEXT,
      priority      TEXT NOT NULL CHECK(priority IN ('alta','media','baixa')),
      decision      TEXT NOT NULL,
      attendees     TEXT,
      notes         TEXT,
      gcal_event_id TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Add columns that may be missing in older installs (safe, additive only)
  const cols = db.prepare("PRAGMA table_info(events)").all() as { name: string }[];
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has('attendees')) db.exec("ALTER TABLE events ADD COLUMN attendees TEXT");
  if (!colNames.has('notes')) db.exec("ALTER TABLE events ADD COLUMN notes TEXT");
  if (!colNames.has('gcal_event_id')) db.exec("ALTER TABLE events ADD COLUMN gcal_event_id TEXT");
  if (!colNames.has('all_day')) db.exec("ALTER TABLE events ADD COLUMN all_day INTEGER NOT NULL DEFAULT 0");
  if (!colNames.has('date_end')) db.exec("ALTER TABLE events ADD COLUMN date_end TEXT NOT NULL DEFAULT ''");

  return db;
}
