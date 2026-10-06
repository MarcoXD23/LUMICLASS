import type { z } from 'zod';

/** Primer mensaje de error de cada campo, listo para mostrar debajo del campo. */
export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const problema of error.issues) {
    const campo = String(problema.path[0] ?? '');
    errores[campo] ??= problema.message;
  }
  return errores;
}
