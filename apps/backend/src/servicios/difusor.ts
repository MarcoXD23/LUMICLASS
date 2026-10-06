/**
 * Reparte un mensaje a todos los que escuchan (p. ej. las conexiones de tiempo real).
 * Si un oyente falla, los demás igual reciben el mensaje.
 */
export class Difusor<T> {
  private readonly oyentes = new Set<(dato: T) => void>();

  suscribir(oyente: (dato: T) => void): () => void {
    this.oyentes.add(oyente);
    return () => {
      this.oyentes.delete(oyente);
    };
  }

  publicar(dato: T): void {
    for (const oyente of this.oyentes) {
      try {
        oyente(dato);
      } catch {
        // Un oyente roto (p. ej. una conexión cerrada) no debe afectar al resto.
      }
    }
  }

  get cantidad(): number {
    return this.oyentes.size;
  }
}
