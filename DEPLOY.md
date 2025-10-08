# Despliegue en Railway / Railpack (Node 22)

Si ves el error `npm ERR! code ETARGET` con `sqlite@^5.1.6`, usa esta versión:
- **sqlite: ^5.1.1**
- **sqlite3: ^5.1.7**

Este paquete ya viene corregido en `package.json`.

## Variables de entorno
- `WU_API_KEY`: tu API key de Weather Underground
- `PORT`: (opcional) puerto, Railway usa el suyo y lo inyecta en `PORT`

## Comandos
- `npm install`
- `npm start`

