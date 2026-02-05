import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const DB_PATH = join(DATA_DIR, "reels.db");

mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS reels (
    id TEXT PRIMARY KEY,
    reel_url TEXT UNIQUE,
    title TEXT,
    collection TEXT,
    transcript TEXT,
    summary TEXT,
    topics TEXT,
    created_at TEXT
  )
`);

const columns = db.prepare("PRAGMA table_info(reels)").all() as Array<{ name: string }>;
const columnNames = new Set(columns.map((column) => column.name));
if (!columnNames.has("title")) {
  db.exec("ALTER TABLE reels ADD COLUMN title TEXT");
}

export type ReelRow = {
  id: string;
  reel_url: string;
  title: string | null;
  collection: string;
  transcript: string;
  summary: string;
  topics: string;
  created_at: string;
};

export const findReelByUrl = db.prepare(
  "SELECT id, reel_url, title, collection, transcript, summary, topics, created_at FROM reels WHERE reel_url = ?"
);

export const findReelById = db.prepare(
  "SELECT id, reel_url, title, collection, transcript, summary, topics, created_at FROM reels WHERE id = ?"
);

export const listReels = db.prepare(
  "SELECT id, reel_url, title, collection, summary, topics, created_at FROM reels ORDER BY created_at DESC"
);

export const insertReel = db.prepare(
  `INSERT INTO reels (id, reel_url, title, collection, transcript, summary, topics, created_at)
   VALUES (@id, @reel_url, @title, @collection, @transcript, @summary, @topics, @created_at)`
);

export const deleteReelById = db.prepare("DELETE FROM reels WHERE id = ?");
