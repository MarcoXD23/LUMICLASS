import { defineConfig } from 'prisma/config';
import { URL_BD_POR_DEFECTO } from './src/config/entorno';

try {
  process.loadEnvFile('.env');
} catch {
  // Sin .env se usa la base local por defecto.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? URL_BD_POR_DEFECTO,
  },
});
