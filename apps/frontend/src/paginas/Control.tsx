import type { AccionLuz, ModoZona } from '@lumiclass/compartido';
import { Lightbulb, LightbulbOff } from 'lucide-react';
import { api } from '../api/recursos';
import { AvisoConexion } from '../componentes/AvisoConexion';
import { Cargando, MensajeError, SinElementos } from '../componentes/EstadoCarga';
import { InterruptorLuz } from '../componentes/InterruptorLuz';
import { SelectorModo } from '../componentes/SelectorModo';
import { TarjetaZona } from '../componentes/TarjetaZona';
import { useAccion } from '../hooks/useAccion';
import { useDatosEnVivo } from '../hooks/useDatosEnVivo';

/** Control manual de luces (una por una o por zona) y del modo de cada zona. */
export function Control() {
  const consulta = useDatosEnVivo(api.estadoSalon);
  const alTerminar = consulta.recargar;

  // Una sola acción a la vez en toda la página: evita órdenes cruzadas por doble clic.
  const accion = useAccion(
    (tipo: 'luz' | 'zona' | 'modo', id: string, valor: AccionLuz | ModoZona) => {
      if (tipo === 'luz') return api.comandarLuz(id, valor as AccionLuz);
      if (tipo === 'zona') return api.comandarZona(id, valor as AccionLuz).then(avisarFallas);
      return api.cambiarModo(id, valor as ModoZona);
    },
    { clave: (tipo, id) => `${tipo}:${id}`, alTerminar },
  );

  const { datos: estado } = consulta;
  if (consulta.cargando && !estado) return <Cargando texto="Cargando luces…" />;
  if (!estado) return <MensajeError mensaje={consulta.error?.message ?? 'No se pudo cargar'} />;

  const ocupado = accion.enCurso !== null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">Control de luces</h2>
      <AvisoConexion
        error={consulta.error}
        actualizadoEn={consulta.actualizadoEn}
        onReintentar={() => void consulta.recargar()}
      />
      <MensajeError mensaje={accion.error} onCerrar={accion.limpiarError} />
      <p className="text-sm text-texto-suave">
        Encender o apagar a mano pasa la zona a <strong>modo manual</strong>, para que las reglas
        automáticas no deshagan tu orden. Vuelve a <strong>Automático</strong> cuando quieras.
      </p>

      {estado.zonas.length === 0 && <SinElementos texto="No hay zonas configuradas." />}

      {estado.zonas.map((zona) => (
        <TarjetaZona key={zona.id} zona={zona}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SelectorModo
                modo={zona.modo}
                etiqueta={`la zona ${zona.nombre}`}
                deshabilitado={ocupado}
                onCambiar={(modo) => void accion.ejecutar('modo', zona.id, modo)}
              />
              <div className="flex gap-2">
                <BotonZona
                  texto="Encender todo"
                  icono="on"
                  deshabilitado={ocupado || zona.luces.length === 0}
                  enviando={accion.enCurso === `zona:${zona.id}`}
                  onClick={() => void accion.ejecutar('zona', zona.id, 'encender')}
                />
                <BotonZona
                  texto="Apagar todo"
                  icono="off"
                  deshabilitado={ocupado || zona.luces.length === 0}
                  enviando={false}
                  onClick={() => void accion.ejecutar('zona', zona.id, 'apagar')}
                />
              </div>
            </div>
            {zona.luces.length === 0 ? (
              <SinElementos texto="Esta zona no tiene luces." />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {zona.luces.map((luz) => (
                  <InterruptorLuz
                    key={luz.id}
                    luz={luz}
                    enviando={accion.enCurso === `luz:${luz.id}`}
                    bloqueado={ocupado}
                    onCambiar={(orden) => void accion.ejecutar('luz', luz.id, orden)}
                  />
                ))}
              </div>
            )}
          </div>
        </TarjetaZona>
      ))}
    </div>
  );
}

/** Si alguna luz de la zona falló, se informa como error con el detalle de cada una. */
function avisarFallas(respuesta: Awaited<ReturnType<typeof api.comandarZona>>) {
  if (respuesta.todasOk) return;
  const detalle = respuesta.resultados
    .filter((r) => !r.ok)
    .map((r) => r.error?.mensaje ?? 'falló')
    .join('; ');
  throw new Error(`Algunas luces no respondieron: ${detalle}`);
}

function BotonZona(props: {
  texto: string;
  icono: 'on' | 'off';
  deshabilitado: boolean;
  enviando: boolean;
  onClick: () => void;
}) {
  const Icono = props.icono === 'on' ? Lightbulb : LightbulbOff;
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.deshabilitado}
      className="flex items-center gap-1 rounded-lg border border-borde bg-superficie px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icono aria-hidden="true" className="size-4" />
      {props.enviando ? 'Enviando…' : props.texto}
    </button>
  );
}
