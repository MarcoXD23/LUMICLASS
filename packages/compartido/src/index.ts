// Tipos y esquemas compartidos entre backend y frontend.
import { z } from 'zod';

// Mensajes de validación en español para toda la aplicación.
z.config(z.locales.es());

export * from './esquemas/entidades';
export * from './esquemas/comandos';
export * from './esquemas/reglas';
export * from './esquemas/eventos';
export * from './esquemas/simulador';
export * from './esquemas/estadisticas';
export * from './esquemas/auth';
