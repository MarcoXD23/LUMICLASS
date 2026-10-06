import type { EventoDto } from '@lumiclass/compartido';

export type EstadoTiempoReal = 'conectando' | 'en-vivo' | 'reconectando' | 'no-disponible';

/** Lo mínimo de EventSource que usamos (permite reemplazarlo en pruebas). */
export interface FuenteEventos {
  readonly readyState: number;
  onerror: ((evento: Event) => void) | null;
  addEventListener(tipo: string, oyente: (evento: MessageEvent<string>) => void): void;
  close(): void;
}

interface Opciones {
  onEvento: (evento: EventoDto) => void;
  onEstado: (estado: EstadoTiempoReal) => void;
  crearFuente?: (url: string) => FuenteEventos;
}

const URL_TIEMPO_REAL = '/api/v1/tiempo-real';
const CERRADA = 2; // EventSource.CLOSED
const ESPERA_INICIAL_MS = 3000;
const ESPERA_MAXIMA_MS = 30_000;

function crearFuentePorDefecto(): ((url: string) => FuenteEventos) | null {
  if (typeof EventSource === 'undefined') return null;
  return (url) => new EventSource(url) as unknown as FuenteEventos;
}

/**
 * Se conecta al flujo SSE del backend.
 * - Mientras está abierto: "en-vivo". Si se corta, EventSource reintenta solo ("reconectando").
 * - Si el servidor rechaza la conexión (p. ej. 503), reintentamos con espera creciente (3 s → 30 s).
 * Devuelve la función para desconectarse.
 */
export function conectarTiempoReal({ onEvento, onEstado, crearFuente }: Opciones): () => void {
  const crear = crearFuente ?? crearFuentePorDefecto();
  if (!crear) {
    onEstado('no-disponible');
    return () => undefined;
  }

  let fuente: FuenteEventos | null = null;
  let reintento: ReturnType<typeof setTimeout> | undefined;
  let espera = ESPERA_INICIAL_MS;
  let activo = true;

  const abrir = () => {
    onEstado('conectando');
    const actual = crear(URL_TIEMPO_REAL);
    fuente = actual;
    actual.addEventListener('conectado', () => {
      espera = ESPERA_INICIAL_MS;
      onEstado('en-vivo');
    });
    actual.addEventListener('evento', (mensaje) => {
      try {
        onEvento(JSON.parse(mensaje.data) as EventoDto);
      } catch {
        // Un mensaje mal formado se ignora; no corta la conexión.
      }
    });
    actual.onerror = () => {
      if (!activo) return;
      onEstado('reconectando');
      if (actual.readyState === CERRADA) {
        actual.close();
        reintento = setTimeout(abrir, espera);
        espera = Math.min(espera * 2, ESPERA_MAXIMA_MS);
      }
    };
  };

  abrir();
  return () => {
    activo = false;
    clearTimeout(reintento);
    fuente?.close();
  };
}
