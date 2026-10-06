import type { EventoDto } from '@lumiclass/compartido';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventSourceFalso } from '../pruebas/apiFalsa';
import { conectarTiempoReal, type EstadoTiempoReal } from './tiempoReal';

let estados: EstadoTiempoReal[];
let eventos: EventoDto[];
let desconectar: () => void;

const conectar = () => {
  desconectar = conectarTiempoReal({
    onEstado: (estado) => estados.push(estado),
    onEvento: (evento) => eventos.push(evento),
    crearFuente: (url) => new EventSourceFalso(url),
  });
};

beforeEach(() => {
  EventSourceFalso.instancias = [];
  estados = [];
  eventos = [];
});
afterEach(() => {
  desconectar?.();
  vi.useRealTimers();
});

describe('conectarTiempoReal', () => {
  it('pasa a "en vivo" al recibir el saludo del servidor', () => {
    conectar();
    expect(EventSourceFalso.ultima().url).toBe('/api/v1/tiempo-real');
    EventSourceFalso.ultima().emitir('conectado', { fecha: 'x' });
    expect(estados).toEqual(['conectando', 'en-vivo']);
  });

  it('entrega cada evento recibido e ignora mensajes mal formados', () => {
    conectar();
    const fuente = EventSourceFalso.ultima();
    fuente.emitir('evento', { id: 1, tipo: 'luz_encendida' });
    fuente.emitir('evento', '{esto no es json');
    expect(eventos).toEqual([{ id: 1, tipo: 'luz_encendida' }]);
  });

  it('si se corta, avisa "reconectando" y deja que EventSource reintente solo', () => {
    conectar();
    EventSourceFalso.ultima().fallar();
    expect(estados.at(-1)).toBe('reconectando');
    expect(EventSourceFalso.instancias).toHaveLength(1);
  });

  it('si el servidor rechaza la conexión, reintenta con espera creciente', () => {
    vi.useFakeTimers();
    conectar();
    EventSourceFalso.ultima().fallar(true);
    vi.advanceTimersByTime(2999);
    expect(EventSourceFalso.instancias).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(EventSourceFalso.instancias).toHaveLength(2);
    // Segundo rechazo: ahora espera 6 s.
    EventSourceFalso.ultima().fallar(true);
    vi.advanceTimersByTime(5999);
    expect(EventSourceFalso.instancias).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(EventSourceFalso.instancias).toHaveLength(3);
  });

  it('al desconectarse cierra la fuente y no reintenta', () => {
    vi.useFakeTimers();
    conectar();
    const fuente = EventSourceFalso.ultima();
    desconectar();
    expect(fuente.readyState).toBe(2);
    fuente.fallar(true);
    vi.advanceTimersByTime(60_000);
    expect(EventSourceFalso.instancias).toHaveLength(1);
  });

  it('sin EventSource en el navegador, informa "no disponible"', () => {
    vi.stubGlobal('EventSource', undefined);
    desconectar = conectarTiempoReal({
      onEstado: (estado) => estados.push(estado),
      onEvento: () => undefined,
    });
    expect(estados).toEqual(['no-disponible']);
    vi.unstubAllGlobals();
  });
});
