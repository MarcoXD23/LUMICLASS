import { describe, expect, it } from 'vitest';
import {
  esquemaCambioModo,
  esquemaComandoLuz,
  esquemaFiltroEstadisticas,
  esquemaFiltroEventos,
  esquemaReglaEntrada,
  esquemaSimPresencia,
  esquemaSimRespuestaServo,
} from '../index';

const reglaValida = {
  nombre: 'Encender al detectar presencia',
  condicion: { tipo: 'presencia', valor: 'ocupado' },
  accion: { tipo: 'encender' },
};

describe('esquemaComandoLuz', () => {
  it('acepta una orden válida', () => {
    expect(esquemaComandoLuz.parse({ accion: 'encender', idSolicitud: 'abc-12345' })).toEqual({
      accion: 'encender',
      idSolicitud: 'abc-12345',
    });
  });

  it('rechaza acciones desconocidas y campos extra', () => {
    expect(
      esquemaComandoLuz.safeParse({ accion: 'parpadear', idSolicitud: 'abc-12345' }).success,
    ).toBe(false);
    expect(
      esquemaComandoLuz.safeParse({ accion: 'apagar', idSolicitud: 'abc-12345', extra: 1 }).success,
    ).toBe(false);
  });

  it('rechaza un idSolicitud corto o con caracteres raros', () => {
    expect(esquemaComandoLuz.safeParse({ accion: 'apagar', idSolicitud: 'abc' }).success).toBe(
      false,
    );
    expect(
      esquemaComandoLuz.safeParse({ accion: 'apagar', idSolicitud: 'abc 12345;' }).success,
    ).toBe(false);
  });

  it('entrega mensajes en español', () => {
    const resultado = esquemaComandoLuz.safeParse({ accion: 'encender', idSolicitud: 'a' });
    expect(resultado.error?.issues[0]?.message).toMatch(/Demasiado pequeño/);
  });
});

describe('esquemaCambioModo', () => {
  it('solo acepta automatico o manual', () => {
    expect(esquemaCambioModo.safeParse({ modo: 'manual' }).success).toBe(true);
    expect(esquemaCambioModo.safeParse({ modo: 'turbo' }).success).toBe(false);
  });
});

describe('esquemaReglaEntrada', () => {
  it('completa valores por defecto', () => {
    const regla = esquemaReglaEntrada.parse(reglaValida);
    expect(regla).toMatchObject({ activa: true, prioridad: 100, zonaId: null });
    expect(regla.condicion.duracionSegundos).toBe(0);
  });

  it('valida el horario HH:MM', () => {
    const conHorario = (desde: string) => ({
      ...reglaValida,
      condicion: { ...reglaValida.condicion, horario: { desde, hasta: '18:00' } },
    });
    expect(esquemaReglaEntrada.safeParse(conHorario('07:30')).success).toBe(true);
    expect(esquemaReglaEntrada.safeParse(conHorario('25:00')).success).toBe(false);
  });

  it('rechaza condiciones de tipo desconocido', () => {
    const invalida = { ...reglaValida, condicion: { tipo: 'temperatura', valor: 30 } };
    expect(esquemaReglaEntrada.safeParse(invalida).success).toBe(false);
  });
});

describe('esquemaFiltroEventos', () => {
  it('convierte la paginación desde texto', () => {
    expect(esquemaFiltroEventos.parse({ pagina: '2', porPagina: '5' })).toMatchObject({
      pagina: 2,
      porPagina: 5,
    });
  });

  it('rechaza un rango de fechas invertido', () => {
    const resultado = esquemaFiltroEventos.safeParse({
      desde: '2026-10-05T12:00:00Z',
      hasta: '2026-10-05T08:00:00Z',
    });
    expect(resultado.success).toBe(false);
  });
});

describe('esquemas del simulador', () => {
  it('acepta presencia con o sin zona', () => {
    expect(esquemaSimPresencia.safeParse({ presencia: true }).success).toBe(true);
    expect(esquemaSimPresencia.safeParse({ zonaId: 'zona-frente', presencia: false }).success).toBe(
      true,
    );
  });

  it('rechaza presencia que no sea booleana o conteos negativos', () => {
    expect(esquemaSimPresencia.safeParse({ presencia: 'si' }).success).toBe(false);
    expect(esquemaSimPresencia.safeParse({ presencia: true, conteoPersonas: -1 }).success).toBe(
      false,
    );
  });

  it('solo acepta respuestas de servo conocidas', () => {
    expect(esquemaSimRespuestaServo.safeParse({ respuesta: 'lento' }).success).toBe(true);
    expect(esquemaSimRespuestaServo.safeParse({ respuesta: 'explota' }).success).toBe(false);
  });
});

describe('filtros de historial y estadísticas', () => {
  it('acepta filtrar eventos por origen', () => {
    expect(esquemaFiltroEventos.safeParse({ origen: 'regla' }).success).toBe(true);
    expect(esquemaFiltroEventos.safeParse({ origen: 'marciano' }).success).toBe(false);
  });

  it('rechaza rangos de estadísticas invertidos o mayores a un año', () => {
    expect(esquemaFiltroEstadisticas.safeParse({}).success).toBe(true);
    expect(
      esquemaFiltroEstadisticas.safeParse({
        desde: '2026-10-05T12:00:00Z',
        hasta: '2026-10-05T11:00:00Z',
      }).success,
    ).toBe(false);
    expect(
      esquemaFiltroEstadisticas.safeParse({
        desde: '2024-01-01T00:00:00Z',
        hasta: '2026-01-01T00:00:00Z',
      }).success,
    ).toBe(false);
  });
});
