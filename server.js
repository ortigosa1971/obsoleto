// server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { openDB, initDB } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Static
app.use(express.static(path.join(__dirname, 'public')));

// No-cache for API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  }
  next();
});

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Helper fetch to WU
function ensureApiKey() {
  const key = process.env.WU_API_KEY;
  if (!key) throw new Error('Falta WU_API_KEY en .env');
  return key;
}

async function fetchWUHistory(stationId, yyyymmdd) {
  const apiKey = ensureApiKey();
  const url = `https://api.weather.com/v2/pws/history/all?stationId=${encodeURIComponent(stationId)}&format=json&units=m&date=${encodeURIComponent(yyyymmdd)}&apiKey=${encodeURIComponent(apiKey)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`WU HTTP ${r.status}`);
  const text = await r.text();
  return text ? JSON.parse(text) : {};
}

// Save observations to SQLite
async function saveObservations(stationId, date, json) {
  const db = await openDB();
  const obs = json?.observations || [];
  if (!Array.isArray(obs) || obs.length === 0) return 0;

  const insert = `
    INSERT INTO weather_data (
      station_id, date, temp, dewpt, humidity, pressure,
      wind_speed, wind_gust, wind_dir, precip_rate, precip_total,
      solar_radiation, uv, obs_time_utc, obs_time_local
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  let count = 0;
  for (const o of obs) {
    const m = o.metric || {};
    await db.run(insert, [
      stationId,
      date,
      m.temp ?? null,
      m.dewpt ?? null,
      o.humidity ?? null,
      m.pressure ?? null,
      m.windSpeed ?? null,
      m.windGust ?? null,
      o.winddir ?? null,
      m.precipRate ?? null,
      m.precipTotal ?? null,
      o.solarRadiation ?? null,
      o.uv ?? null,
      o.obsTimeUtc ?? null,
      o.obsTimeLocal ?? null
    ]);
    count++;
  }
  return count;
}

// GET /api/wu/history?stationId=IALFAR32&date=YYYYMMDD
app.get('/api/wu/history', async (req, res) => {
  try {
    const { stationId, date } = req.query;
    if (!stationId || !date) {
      return res.status(400).json({ error: 'Faltan parámetros stationId o date' });
    }
    const json = await fetchWUHistory(stationId, date);
    const saved = await saveObservations(stationId, date, json);
    if (saved) console.log(`💾 Guardadas ${saved} observaciones para ${stationId} (${date})`);
    res.json(json);
  } catch (e) {
    console.error('⚠️ /api/wu/history error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/wu/history/range?stationId=IALFAR32&start=YYYYMMDD&end=YYYYMMDD
app.get('/api/wu/history/range', async (req, res) => {
  try {
    const { stationId, start, end } = req.query;
    if (!stationId || !start || !end) {
      return res.status(400).json({ error: 'Faltan parámetros stationId, start o end' });
    }
    const startDate = new Date(Date.UTC(
      parseInt(start.slice(0,4)), parseInt(start.slice(4,6)) - 1, parseInt(start.slice(6,8))
    ));
    const endDate = new Date(Date.UTC(
      parseInt(end.slice(0,4)), parseInt(end.slice(4,6)) - 1, parseInt(end.slice(6,8))
    ));
    if (isNaN(startDate) || isNaN(endDate) || startDate > endDate) {
      return res.status(400).json({ error: 'Rango de fechas inválido' });
    }

    const dates = [];
    const dt = new Date(startDate.getTime());
    while (dt <= endDate) {
      const yyyy = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth()+1).padStart(2, '0');
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      dates.push(`${yyyy}${mm}${dd}`);
      dt.setUTCDate(dt.getUTCDate()+1);
    }

    const results = await Promise.all(dates.map(async (d) => {
      const json = await fetchWUHistory(stationId, d);
      await saveObservations(stationId, d, json);
      return json?.observations || [];
    }));

    const observations = results.flat();
    res.json({ observations, stationId, start, end });
  } catch (e) {
    console.error('⚠️ /api/wu/history/range error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Read last N from SQLite
app.get('/api/local/weather', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000);
    const db = await openDB();
    const rows = await db.all('SELECT * FROM weather_data ORDER BY obs_time_local DESC LIMIT ?', [limit]);
    res.json(rows);
  } catch (e) {
    console.error('⚠️ /api/local/weather error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Fallback to index.html if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), err => {
    if (err) res.status(404).send('Not Found');
  });
});

// Start
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server listening on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Error al inicializar la base de datos:', err);
  process.exit(1);
});
