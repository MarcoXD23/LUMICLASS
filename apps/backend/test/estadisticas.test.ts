import type { EstadisticasDto } from '@lumiclass/compartido';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { segundosActivo } from '../src/servicios/estadisticas';
import { crearAppDePrueba, type AppDePrueba } from './ayudantes/baseDatosPrueba';

const t = (hora: string) => new Date(`2026-10-05T${hora}:00Z`);

describe('segundosActivo', () => {
  const desde = t('10:00');
  const hasta = t('12:00');

  it('suma los tramos encendidos dentro del rango', () => {
    const cambios = [
      { fecha: t('10:30'), activo: true },
      { fecha: t('11:00'), activo: false },
      { fecha: t('11:30'), activo: true },
    ];
    expect(segundosActivo(cambios, desde, hasta)).toBe(60 * 60); // 30 min + 30 min
  });

  it('usa el último cambio anterior al rango como estado inicial', () => {
    const cambios = [
      { fecha: t('09:00'), activo: true },
      { fecha: t('10:15'), activo: false },
    ];
    expect(segundosActivo(cambios, desde, hasta)).toBe(15 * 60);
  });

  it('ignora cambios repetidos y los posteriores al rango', () => {
    const cambios = [
      { fecha: t('10:00'), activo: false },
      { fecha: t('11:00'), activo: true },
      { fecha: t('11:10'), activo: true }, // repetido: no reinicia el tramo
      { fecha: t('13:00'), activo: false },
    ];
    expect(segundosActivo(cambios, desde, hasta)).toBe(60 * 60);
  });

  it('sin cambios, cero', () => {
    expect(segundosActivo([], desde, hasta)).toBe(0);
  });
});

describe('GET /api/v1/estadisticas', () => {
  let prueba: AppDePrueba;
  beforeEach(async () => {
    prueba = await crearAppDePrueba();
    await prueba.bd.evento.deleteMany();
  });
  afterEach(() => prueba.cerrar());

  const evento = (tipo: string, entidadId: string, fecha: Date, origen = 'usuario') =>
    prueba.bd.evento.create({ data: { tipo, origen, entidadId, mensaje: tipo, fecha } });

  const pedir = async (consulta: string) => {
    const respuesta = await prueba.app.inject({
      method: 'GET',
      url: `/api/v1/estadisticas${consulta}`,
    });
    return { codigo: respuesta.statusCode, cuerpo: respuesta.json<EstadisticasDto>() };
  };

  it('calcula horas encendidas, ocupación, origen de las acciones y errores', async () => {
    await evento('luz_encendida', 'luz-frente', t('08:00'), 'regla');
    await evento('luz_apagada', 'luz-frente', t('09:30'), 'usuario');
    await evento('presencia_detectada', 'zona-frente', t('08:00'), 'sistema');
    await evento('salon_vacio', 'zona-frente', t('09:00'), 'sistema');
    await evento('error_actuador', 'luz-fondo', t('08:30'), 'regla');

    const { codigo, cuerpo } = await pedir(
      '?desde=2026-10-05T07:00:00Z&hasta=2026-10-05T10:00:00Z',
    );
    expect(codigo).toBe(200);
    expect(cuerpo.luces.find((l) => l.luzId === 'luz-frente')).toMatchObject({
      segundosEncendida: 90 * 60,
      encendidos: 1,
      apagados: 1,
    });
    expect(cuerpo.luces.find((l) => l.luzId === 'luz-fondo')?.segundosEncendida).toBe(0);
    expect(cuerpo.zonas.find((z) => z.zonaId === 'zona-frente')?.segundosOcupada).toBe(60 * 60);
    expect(cuerpo.accionesPorOrigen.regla).toEqual({ encendidos: 1, apagados: 0 });
    expect(cuerpo.accionesPorOrigen.usuario).toEqual({ encendidos: 0, apagados: 1 });
    expect(cuerpo.errores).toEqual({ actuador: 1, sensor: 0 });
    expect(cuerpo.totalEventos).toBe(5);
  });

  it('sin fechas usa las últimas 24 h y no cuenta tiempo futuro', async () => {
    const { cuerpo } = await pedir('');
    const ahora = prueba.reloj.ahora().getTime();
    expect(new Date(cuerpo.hasta).getTime()).toBe(ahora);
    expect(ahora - new Date(cuerpo.desde).getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('rechaza rangos inválidos con 400', async () => {
    expect((await pedir('?desde=ayer')).codigo).toBe(400);
    expect((await pedir('?desde=2026-10-05T12:00:00Z&hasta=2026-10-05T10:00:00Z')).codigo).toBe(
      400,
    );
  });
});
