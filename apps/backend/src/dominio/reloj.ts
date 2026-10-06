/** Fuente de tiempo inyectable: el motor de reglas la usa para que las pruebas no esperen de verdad. */
export interface Reloj {
  ahora(): Date;
  /** Ejecuta `tarea` dentro de `ms` milisegundos. Devuelve la función para cancelarla. */
  programar(ms: number, tarea: () => void): () => void;
}

export const relojReal: Reloj = {
  ahora: () => new Date(),
  programar(ms, tarea) {
    const temporizador = setTimeout(tarea, ms);
    temporizador.unref(); // No impide que el proceso termine.
    return () => clearTimeout(temporizador);
  },
};
