import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(__dirname, '../data');
const DB_PATH = path.join(DB_DIR, 'coffee.db');

export let db: Database<sqlite3.Database, sqlite3.Statement>;

export const initDB = async () => {
  // Ensure the directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Open SQLite database
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  console.log(`📂 SQLite database loaded at: ${DB_PATH}`);

  // Create table for coffee brews
  await db.exec(`
    CREATE TABLE IF NOT EXISTS coffee_brews (
      id TEXT PRIMARY KEY,
      bean_name TEXT NOT NULL,
      grind_size TEXT,
      water_temp REAL,
      coffee_weight REAL,
      water_weight REAL,
      brew_time INTEGER,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_coffee_brews_created_at ON coffee_brews(created_at);

    -- New Coffee Beans Inventory Table
    CREATE TABLE IF NOT EXISTS coffee_beans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      roaster TEXT,
      roast_date DATE NOT NULL,
      roast_level TEXT CHECK(roast_level IN ('light', 'medium', 'dark')),
      origin TEXT,
      process TEXT,
      initial_weight REAL,
      current_weight REAL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- New Telemetry Points Table for real-time profiling curves
    CREATE TABLE IF NOT EXISTS brew_telemetry_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brew_id TEXT NOT NULL,
      time_offset REAL NOT NULL,
      yield REAL,
      flow_rate REAL,
      pressure REAL,
      FOREIGN KEY(brew_id) REFERENCES coffee_brews(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_telemetry_brew_id ON brew_telemetry_points(brew_id);
  `);

  // Run migrations to add espresso specific fields if they do not exist
  try {
    await db.exec(`ALTER TABLE coffee_brews ADD COLUMN brew_type TEXT DEFAULT 'pour_over'`);
    console.log(' Migrated: Added brew_type column');
  } catch (e) {
    // Column already exists or other database error, ignore
  }

  try {
    await db.exec(`ALTER TABLE coffee_brews ADD COLUMN liquid_weight REAL`);
    console.log(' Migrated: Added liquid_weight column');
  } catch (e) {
    // Ignore
  }

  try {
    await db.exec(`ALTER TABLE coffee_brews ADD COLUMN preinfusion_time INTEGER`);
    console.log(' Migrated: Added preinfusion_time column');
  } catch (e) {
    // Ignore
  }

  try {
    await db.exec(`ALTER TABLE coffee_brews ADD COLUMN pressure REAL`);
    console.log(' Migrated: Added pressure column');
  } catch (e) {
    // Ignore
  }

  try {
    await db.exec(`ALTER TABLE coffee_brews ADD COLUMN bean_id TEXT`);
    console.log(' Migrated: Added bean_id column');
  } catch (e) {
    // Ignore
  }

  console.log('✅ Database tables initialized successfully');
};
