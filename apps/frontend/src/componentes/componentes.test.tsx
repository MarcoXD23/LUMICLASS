import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../api/cliente';
import { luzEjemplo } from '../pruebas/apiFalsa';
import { AvisoConexion } from './AvisoConexion';
import { InterruptorLuz } from './InterruptorLuz';
import { ListaAlertas } from './ListaAlertas';
import { SelectorModo } from './SelectorModo';

describe('InterruptorLuz', () => {
  it('muestra el estado con texto y ofrece la acción contraria', () => {
    const onCambiar = vi.fn();
    render(
      <InterruptorLuz
        luz={luzEjemplo({ estadoReal: 'on' })}
        enviando={false}
        onCambiar={onCambiar}
      />,
    );
    expect(screen.getByText(/Encendida/)).toBeInTheDocument();
    const boton = screen.getByRole('button', { name: 'Apagar Luces frente' });
    expect(boton).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(boton);
    expect(onCambiar).toHaveBeenCalledWith('apagar');
  });

  it('con estado desconocido lo dice y propone encender', () => {
    render(
      <InterruptorLuz
        luz={luzEjemplo({ estadoReal: 'desconocido' })}
        enviando={false}
        onCambiar={vi.fn()}
      />,
    );
    expect(screen.getByText(/Estado desconocido/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Encender Luces frente' })).toBeEnabled();
  });

  it('se deshabilita y explica por qué si el servo está en falla', () => {
    const luz = luzEjemplo();
    luz.actuador.conexion = 'falla';
    render(<InterruptorLuz luz={luz} enviando={false} onCambiar={vi.fn()} />);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Servo: en falla')).toBeInTheDocument();
  });

  it('se deshabilita mientras se envía la orden', () => {
    render(<InterruptorLuz luz={luzEjemplo()} enviando onCambiar={vi.fn()} />);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Enviando orden…')).toBeInTheDocument();
  });
});

describe('SelectorModo', () => {
  it('marca el modo actual y permite cambiar al otro', () => {
    const onCambiar = vi.fn();
    render(<SelectorModo modo="automatico" etiqueta="la zona Frente" onCambiar={onCambiar} />);
    expect(screen.getByRole('button', { name: /Automático/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: /Manual/ }));
    expect(onCambiar).toHaveBeenCalledWith('manual');
  });
});

describe('ListaAlertas', () => {
  it('muestra "Sin alertas" cuando no hay', () => {
    render(<ListaAlertas alertas={[]} />);
    expect(screen.getByText(/Sin alertas/)).toBeInTheDocument();
  });

  it('lista cada alerta con su severidad para lectores de pantalla', () => {
    render(
      <ListaAlertas
        alertas={[
          {
            severidad: 'error',
            entidad: 'sensor',
            entidadId: 's1',
            mensaje: 'Sensor "PIR" en falla',
          },
        ]}
      />,
    );
    expect(screen.getByText('Sensor "PIR" en falla')).toBeInTheDocument();
    expect(screen.getByText('Error:')).toBeInTheDocument();
  });
});

describe('AvisoConexion', () => {
  it('no muestra nada si no hay error', () => {
    const { container } = render(<AvisoConexion error={null} actualizadoEn={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('avisa que los datos están desactualizados', () => {
    render(
      <AvisoConexion
        error={new ErrorApi('SIN_CONEXION', 'Sin conexión con el servidor', 0)}
        actualizadoEn={new Date()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/desactualizados/);
  });
});
