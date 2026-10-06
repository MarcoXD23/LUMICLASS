// Crea apps/backend/.env a partir de .env.example si todavía no existe.
// Uso: npm run configurar (funciona igual en Windows, macOS y Linux).
import { copyFileSync, existsSync } from 'node:fs';

const destino = 'apps/backend/.env';
const ejemplo = 'apps/backend/.env.example';

if (existsSync(destino)) {
  console.log(`${destino} ya existe; no se modificó.`);
} else {
  copyFileSync(ejemplo, destino);
  console.log(`Creado ${destino}. Cambia ADMIN_CONTRASENA antes de presentar.`);
}
