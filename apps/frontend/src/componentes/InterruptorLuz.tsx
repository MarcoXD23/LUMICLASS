import type { AccionLuz, LuzDto } from '@lumiclass/compartido';
import { LoaderCircle } from 'lucide-react';
import { CLASES_TONO, describirConexion, describirLuz } from '../utilidades/estados';

interface Props {
  luz: LuzDto;
  /** true mientras esta luz tiene una orden en camino. */
  enviando: boolean;
  /** true si hay otra orden en curso (se evita el doble clic). */
  bloqueado?: boolean;
  onCambiar: (accion: AccionLuz) => void;
}

/**
 * Botón grande para encender o apagar una luz. Muestra el estado real confirmado
 * y se deshabilita si el servo no puede recibir órdenes.
 */
export function InterruptorLuz({ luz, enviando, bloqueado = false, onCambiar }: Props) {
  const estado = describirLuz(luz.estadoReal);
  const encendida = luz.estadoReal === 'on';
  // Si el estado es desconocido, la acción por defecto es encender (para confirmar con el servo).
  const accion: AccionLuz = encendida ? 'apagar' : 'encender';
  const servoDisponible = luz.actuador.conexion === 'activo';
  const ocupadoEnServidor = luz.actuador.ocupado;
  const deshabilitado = !servoDisponible || enviando || bloqueado || ocupadoEnServidor;

  const motivo = !servoDisponible
    ? `Servo: ${describirConexion(luz.actuador.conexion).texto.toLowerCase()}`
    : ocupadoEnServidor
      ? 'El servo está ejecutando otra orden'
      : null;
  const Icono = enviando ? LoaderCircle : estado.icono;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => onCambiar(accion)}
        disabled={deshabilitado}
        aria-pressed={encendida}
        aria-label={`${accion === 'encender' ? 'Encender' : 'Apagar'} ${luz.nombre}`}
        className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${CLASES_TONO[estado.tono]}`}
      >
        <Icono aria-hidden="true" className={`size-7 shrink-0 ${enviando ? 'animate-spin' : ''}`} />
        <span className="flex flex-col">
          <span className="font-semibold">{luz.nombre}</span>
          <span className="text-sm">
            {enviando ? 'Enviando orden…' : estado.texto}
            {!enviando && servoDisponible && !ocupadoEnServidor && <> · toca para {accion}</>}
          </span>
        </span>
      </button>
      {motivo && (
        <p className="text-sm text-error" role="note">
          {motivo}
        </p>
      )}
    </div>
  );
}
