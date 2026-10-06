import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../api/cliente';
import { useAccion } from './useAccion';
import { useConsulta } from './useConsulta';

afterEach(() => {
  vi.useRealTimers();
});

describe('useConsulta', () => {
  it('carga los datos', async () => {
    const { result } = renderHook(() => useConsulta(async () => 42));
    await waitFor(() => expect(result.current.datos).toBe(42));
    expect(result.current).toMatchObject({ cargando: false, error: null, desactualizado: false });
  });

  it('si la API cae después, conserva los datos y los marca como desactualizados', async () => {
    let falla = false;
    const consultar = vi.fn(async () => {
      if (falla) throw new ErrorApi('SIN_CONEXION', 'Sin conexión con el servidor', 0);
      return 'datos buenos';
    });
    const { result } = renderHook(() => useConsulta(consultar));
    await waitFor(() => expect(result.current.datos).toBe('datos buenos'));

    falla = true;
    await act(() => result.current.recargar());
    expect(result.current.datos).toBe('datos buenos');
    expect(result.current.desactualizado).toBe(true);
    expect(result.current.error?.codigo).toBe('SIN_CONEXION');

    falla = false;
    await act(() => result.current.recargar());
    expect(result.current.desactualizado).toBe(false);
  });

  it('vuelve a consultar en cada intervalo', async () => {
    vi.useFakeTimers();
    const consultar = vi.fn(async () => 'x');
    renderHook(() => useConsulta(consultar, { intervaloMs: 5000 }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(consultar).toHaveBeenCalledTimes(3); // al montar + 2 intervalos
  });
});

describe('useAccion', () => {
  it('ignora un segundo clic mientras la primera orden está en curso', async () => {
    let terminar: () => void = () => undefined;
    const accion = vi.fn((_id: string) => new Promise<void>((resolver) => (terminar = resolver)));
    const { result } = renderHook(() => useAccion(accion, { clave: (id: string) => id }));

    let primera: Promise<boolean> = Promise.resolve(false);
    act(() => {
      primera = result.current.ejecutar('luz-1');
    });
    expect(result.current.enCurso).toBe('luz-1');
    let segunda = true;
    await act(async () => {
      segunda = await result.current.ejecutar('luz-1');
    });
    expect(segunda).toBe(false);

    await act(async () => {
      terminar();
      await primera;
    });
    expect(accion).toHaveBeenCalledTimes(1);
    expect(result.current.enCurso).toBeNull();
  });

  it('guarda el mensaje de error y llama a alTerminar igual', async () => {
    const alTerminar = vi.fn();
    const { result } = renderHook(() =>
      useAccion(
        async () => {
          throw new ErrorApi('ACTUADOR_SIN_RESPUESTA', 'El servo no confirmó la orden', 503);
        },
        { alTerminar },
      ),
    );
    await act(async () => {
      await result.current.ejecutar();
    });
    expect(result.current.error).toBe('El servo no confirmó la orden');
    expect(alTerminar).toHaveBeenCalled();
  });
});
