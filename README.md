# Alfarnate backend + SQLite

Backend Express (Node 20, ESM) con persistencia SQLite para registrar observaciones de Weather Underground (WU).

## Pasos
1. `npm install`
2. Copia `.env.example` a `.env` y rellena `WU_API_KEY`
3. `npm start`
4. Abre `http://localhost:3000`

## Endpoints
- `/api/wu/history?stationId=IALFAR32&date=YYYYMMDD` — proxy + guarda observaciones del día
- `/api/wu/history/range?stationId=IALFAR32&start=YYYYMMDD&end=YYYYMMDD` — múltiples días; guarda todo
- `/api/local/weather?limit=100` — lee últimos registros guardados

La base de datos se crea en `data.db`.

