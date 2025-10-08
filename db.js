// db.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function openDB() {
  return open({
    filename: './data.db',
    driver: sqlite3.Database
  });
}

export async function initDB() {
  const db = await openDB();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS weather_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      station_id TEXT,
      date TEXT,               -- YYYYMMDD (requested date)
      temp REAL,
      dewpt REAL,
      humidity REAL,
      pressure REAL,
      wind_speed REAL,
      wind_gust REAL,
      wind_dir REAL,
      precip_rate REAL,
      precip_total REAL,
      solar_radiation REAL,
      uv REAL,
      obs_time_utc TEXT,
      obs_time_local TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_weather_date ON weather_data(date);
    CREATE INDEX IF NOT EXISTS idx_weather_station ON weather_data(station_id);
    CREATE INDEX IF NOT EXISTS idx_weather_obs_local ON weather_data(obs_time_local);
  `);
  console.log('✅ Base de datos inicializada (data.db)');
}
