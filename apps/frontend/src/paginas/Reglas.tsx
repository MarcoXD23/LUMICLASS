import type { ReglaDto, ReglaEntrada } from '@lumiclass/compartido';
import { Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/recursos';
import { AvisoConexion } from '../componentes/AvisoConexion';
import { Cargando, MensajeError, SinElementos } from '../componentes/EstadoCarga';
import { Insignia } from '../componentes/Insignia';
import { useAccion } from '../hooks/useAccion';
import { useDatosEnVivo } from '../hooks/useDatosEnVivo';
import { useSesion } from '../hooks/useSesion';
import { describirLuz, describirOcupacion } from '../utilidades/estados';
import { duracionLegible, haceCuanto } from '../utilidades/formatoFecha';
import { FormularioRegla } from './FormularioRegla';

/** Copia de la regla en el formato que espera la API (sin id ni fechas). */
const aEntrada = (regla: ReglaDto): ReglaEntrada => ({
  nombre: regla.nombre,
  activa: regla.activa,
  prioridad: regla.prioridad,
  zonaId: regla.zonaId,
  condicion: regla.condicion,
  accion: regla.accion,
});

/** Frase en español que explica la regla, p. ej. "Si la zona Fondo queda vacía 5 min, apagar". */
function explicarRegla(regla: ReglaDto, nombreZona: string | null): string {
  const donde = nombreZona ? `la zona ${nombreZona}` : 'cualquier zona';
  const estado = regla.condicion.valor === 'ocupado' ? 'está ocupada' : 'queda vacía';
  const espera =
    regla.condicion.duracionSegundos > 0
      ? ` durante ${duracionLegible(regla.condicion.duracionSegundos)}`
      : '';
  const horario = regla.condicion.horario
    ? ` (entre ${regla.condicion.horario.desde} y ${regla.condicion.horario.hasta})`
    : '';
  const accion = regla.accion.tipo === 'encender' ? 'encender las luces' : 'apagar las luces';
  return `Si ${donde} ${estado}${espera}${horario}, ${accion}.`;
}

/** Reglas de automatización: ver, crear, editar, activar/desactivar y borrar. */
export function Reglas() {
  const [verEliminadas, setVerEliminadas] = useState(false);
  const reglas = useDatosEnVivo((senal) => api.reglas(senal, verEliminadas), {
    filtrarEvento: (evento) => evento.tipo === 'regla_cambiada',
    clave: String(verEliminadas),
  });
  const zonas = useDatosEnVivo(api.zonas, {
    filtrarEvento: (evento) => evento.tipo === 'modo_cambiado',
  });
  const [editando, setEditando] = useState<ReglaDto | 'nueva' | null>(null);
  const { esAdmin } = useSesion();

  const recargar = reglas.recargar;
  const guardar = useAccion(
    (entrada: ReglaEntrada) =>
      editando && editando !== 'nueva'
        ? api.actualizarRegla(editando.id, entrada)
        : api.crearRegla(entrada),
    { alTerminar: recargar },
  );
  const cambiarRegla = useAccion(
    (regla: ReglaDto, operacion: 'alternar' | 'eliminar') =>
      operacion === 'eliminar'
        ? api.eliminarRegla(regla.id)
        : api.actualizarRegla(regla.id, { ...aEntrada(regla), activa: !regla.activa }),
    { clave: (regla) => regla.id, alTerminar: recargar },
  );

  if (reglas.cargando && !reglas.datos) return <Cargando texto="Cargando reglas…" />;
  if (!reglas.datos) return <MensajeError mensaje={reglas.error?.message ?? 'No se pudo cargar'} />;

  const listaZonas = zonas.datos ?? [];
  const nombreZona = (id: string | null) =>
    id === null ? null : (listaZonas.find((z) => z.id === id)?.nombre ?? id);

  const alGuardar = async (entrada: ReglaEntrada) => {
    if (await guardar.ejecutar(entrada)) setEditando(null);
  };

  const alEliminar = (regla: ReglaDto) => {
    const mensaje = `¿Eliminar la regla "${regla.nombre}"? Deja de aplicarse y sale de la lista, pero queda guardada en el historial.`;
    if (window.confirm(mensaje)) {
      void cambiarRegla.ejecutar(regla, 'eliminar');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Reglas automáticas</h2>
        {esAdmin && editando === null && (
          <button
            type="button"
            onClick={() => setEditando('nueva')}
            className="flex items-center gap-1 rounded-lg bg-vacio px-3 py-2 font-medium text-white"
          >
            <Plus aria-hidden="true" className="size-5" />
            Nueva regla
          </button>
        )}
      </div>
      <p className="text-sm text-texto-suave">
        Las reglas solo actúan en zonas en modo automático. Si varias se cumplen a la vez, gana la
        de menor número de prioridad.
        {!esAdmin && ' Solo el administrador puede crear o cambiar reglas.'}
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={verEliminadas}
          onChange={(e) => setVerEliminadas(e.target.checked)}
        />
        Mostrar también las reglas eliminadas (quedan guardadas)
      </label>
      <AvisoConexion
        error={reglas.error}
        actualizadoEn={reglas.actualizadoEn}
        onReintentar={() => void recargar()}
      />
      <MensajeError
        mensaje={guardar.error ?? cambiarRegla.error}
        onCerrar={() => {
          guardar.limpiarError();
          cambiarRegla.limpiarError();
        }}
      />

      {editando !== null && (
        <FormularioRegla
          key={editando === 'nueva' ? 'nueva' : editando.id}
          zonas={listaZonas}
          inicial={editando === 'nueva' ? undefined : editando}
          enviando={guardar.enCurso !== null}
          onGuardar={(entrada) => void alGuardar(entrada)}
          onCancelar={() => {
            setEditando(null);
            guardar.limpiarError();
          }}
        />
      )}

      {reglas.datos.length === 0 && <SinElementos texto="No hay reglas. Crea la primera." />}

      <ul className="flex flex-col gap-3">
        {reglas.datos.map((regla) => {
          const ocupada = cambiarRegla.enCurso === regla.id;
          const eliminada = regla.eliminadaEn !== null;
          return (
            <li
              key={regla.id}
              className={`flex flex-col gap-2 rounded-2xl border border-borde bg-superficie p-4 shadow-sm ${
                regla.activa && !eliminada ? '' : 'opacity-70'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">{regla.nombre}</h3>
                <span className="text-sm text-texto-suave">Prioridad {regla.prioridad}</span>
              </div>
              <p>{explicarRegla(regla, nombreZona(regla.zonaId))}</p>
              <div className="flex flex-wrap gap-2">
                <Insignia descripcion={describirOcupacion(regla.condicion.valor === 'ocupado')} />
                <Insignia
                  descripcion={describirLuz(regla.accion.tipo === 'encender' ? 'on' : 'off')}
                />
                <Insignia
                  descripcion={{ texto: '', icono: Power, tono: regla.activa ? 'ok' : 'neutro' }}
                  texto={regla.activa ? 'Activa' : 'Desactivada'}
                />
                {eliminada && (
                  <Insignia
                    descripcion={{ texto: 'Eliminada', icono: Trash2, tono: 'error' }}
                    texto={`Eliminada ${haceCuanto(regla.eliminadaEn)}`}
                  />
                )}
              </div>
              {esAdmin && !eliminada && (
                <div className="flex flex-wrap gap-2">
                  <BotonRegla
                    icono={Power}
                    texto={regla.activa ? 'Desactivar' : 'Activar'}
                    etiqueta={`${regla.activa ? 'Desactivar' : 'Activar'} ${regla.nombre}`}
                    deshabilitado={cambiarRegla.enCurso !== null}
                    onClick={() => void cambiarRegla.ejecutar(regla, 'alternar')}
                  />
                  <BotonRegla
                    icono={Pencil}
                    texto="Editar"
                    etiqueta={`Editar ${regla.nombre}`}
                    deshabilitado={ocupada}
                    onClick={() => setEditando(regla)}
                  />
                  <BotonRegla
                    icono={Trash2}
                    texto="Eliminar"
                    etiqueta={`Eliminar ${regla.nombre}`}
                    deshabilitado={cambiarRegla.enCurso !== null}
                    onClick={() => alEliminar(regla)}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BotonRegla(props: {
  icono: typeof Power;
  texto: string;
  etiqueta: string;
  deshabilitado: boolean;
  onClick: () => void;
}) {
  const Icono = props.icono;
  return (
    <button
      type="button"
      aria-label={props.etiqueta}
      onClick={props.onClick}
      disabled={props.deshabilitado}
      className="flex items-center gap-1 rounded-lg border border-borde px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
    >
      <Icono aria-hidden="true" className="size-4" />
      {props.texto}
    </button>
  );
}
