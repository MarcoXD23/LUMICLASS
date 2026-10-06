import type { Reloj } from '../../src/dominio/reloj';

interface Tarea {
  id: number;
  en: number;
  ejecutar: () => void;
}

/** Reloj de pruebas: el tiempo solo avanza cuando la prueba lo pide. */
export class RelojManual implements Reloj {
  private actual: number;
  private tareas: Tarea[] = [];
  private siguienteId = 0;

  /** Por defecto: 5 de octubre de 2026, 10:00 hora local. */
  constructor(inicio: Date = new Date(2026, 9, 5, 10, 0, 0)) {
    this.actual = inicio.getTime();
  }

  ahora(): Date {
    return new Date(this.actual);
  }

  programar(ms: number, ejecutar: () => void): () => void {
    const id = ++this.siguienteId;
    this.tareas.push({ id, en: this.actual + ms, ejecutar });
    return () => {
      this.tareas = this.tareas.filter((t) => t.id !== id);
    };
  }

  /**
   * Avanza el tiempo ejecutando en orden las tareas que vencen.
   * `esperar` se llama después de cada tarea para dejar terminar el trabajo asíncrono que dispara.
   */
  async avanzar(ms: number, esperar: () => Promise<void> = async () => undefined): Promise<void> {
    const objetivo = this.actual + ms;
    for (;;) {
      const proxima = this.tareas
        .filter((t) => t.en <= objetivo)
        .sort((a, b) => a.en - b.en || a.id - b.id)[0];
      if (!proxima) break;
      this.tareas = this.tareas.filter((t) => t.id !== proxima.id);
      this.actual = proxima.en;
      proxima.ejecutar();
      await esperar();
    }
    this.actual = objetivo;
    await esperar();
  }

  tareasPendientes(): number {
    return this.tareas.length;
  }
}
