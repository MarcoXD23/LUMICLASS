import type { ReglaDto, ReglaEntrada, ZonaDto } from '@lumiclass/compartido';
import { esquemaReglaEntrada } from '@lumiclass/compartido';
import { useState, type FormEvent } from 'react';

interface Props {
  zonas: Pick<ZonaDto, 'id' | 'nombre'>[];
  /** Regla a editar; sin ella, el formulario crea una nueva. */
  inicial?: ReglaDto;
  enviando: boolean;
  onGuardar: (regla: ReglaEntrada) => void;
  onCancelar: () => void;
}

interface Campos {
  nombre: string;
  zonaId: string;
  valor: 'ocupado' | 'vacio';
  duracionSegundos: string;
  usarHorario: boolean;
  desde: string;
  hasta: string;
  accion: 'encender' | 'apagar';
  prioridad: string;
  activa: boolean;
}

function camposIniciales(regla?: ReglaDto): Campos {
  return {
    nombre: regla?.nombre ?? '',
    zonaId: regla?.zonaId ?? '',
    valor: regla?.condicion.valor ?? 'ocupado',
    duracionSegundos: String(regla?.condicion.duracionSegundos ?? 0),
    usarHorario: Boolean(regla?.condicion.horario),
    desde: regla?.condicion.horario?.desde ?? '07:00',
    hasta: regla?.condicion.horario?.hasta ?? '18:00',
    accion: regla?.accion.tipo ?? 'encender',
    prioridad: String(regla?.prioridad ?? 100),
    activa: regla?.activa ?? true,
  };
}

/** Convierte lo escrito en el formulario al formato de la API. */
function aEntrada(c: Campos): unknown {
  return {
    nombre: c.nombre,
    activa: c.activa,
    prioridad: c.prioridad === '' ? Number.NaN : Number(c.prioridad),
    zonaId: c.zonaId === '' ? null : c.zonaId,
    condicion: {
      tipo: 'presencia',
      valor: c.valor,
      duracionSegundos: c.duracionSegundos === '' ? Number.NaN : Number(c.duracionSegundos),
      ...(c.usarHorario ? { horario: { desde: c.desde, hasta: c.hasta } } : {}),
    },
    accion: { tipo: c.accion },
  };
}

const ETIQUETAS_CAMPO: Record<string, string> = {
  nombre: 'Nombre',
  prioridad: 'Prioridad',
  'condicion.duracionSegundos': 'Espera',
  'condicion.horario.desde': 'Desde',
  'condicion.horario.hasta': 'Hasta',
};

/** Crear o editar una regla. Se valida con el mismo esquema que usa la API. */
export function FormularioRegla({ zonas, inicial, enviando, onGuardar, onCancelar }: Props) {
  const [campos, setCampos] = useState<Campos>(() => camposIniciales(inicial));
  const [errores, setErrores] = useState<string[]>([]);

  const cambiar = <K extends keyof Campos>(clave: K, valor: Campos[K]) =>
    setCampos((anteriores) => ({ ...anteriores, [clave]: valor }));

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = esquemaReglaEntrada.safeParse(aEntrada(campos));
    if (!resultado.success) {
      setErrores(
        resultado.error.issues.map((problema) => {
          const campo = problema.path.join('.');
          return `${ETIQUETAS_CAMPO[campo] ?? campo}: ${problema.message}`;
        }),
      );
      return;
    }
    setErrores([]);
    onGuardar(resultado.data);
  };

  const claseCampo = 'rounded-lg border border-borde bg-superficie px-3 py-2';

  return (
    <form
      onSubmit={enviar}
      noValidate
      aria-label={inicial ? `Editar regla ${inicial.nombre}` : 'Nueva regla'}
      className="flex flex-col gap-3 rounded-2xl border border-borde bg-superficie p-4 shadow-sm"
    >
      <h3 className="text-lg font-semibold">{inicial ? 'Editar regla' : 'Nueva regla'}</h3>

      {errores.length > 0 && (
        <ul
          role="alert"
          className="list-inside list-disc rounded-xl border border-error bg-error/10 p-3 text-red-900"
        >
          {errores.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <label className="flex flex-col gap-1">
        Nombre
        <input
          className={claseCampo}
          value={campos.nombre}
          onChange={(e) => cambiar('nombre', e.target.value)}
          maxLength={80}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          Zona
          <select
            className={claseCampo}
            value={campos.zonaId}
            onChange={(e) => cambiar('zonaId', e.target.value)}
          >
            <option value="">Todas las zonas</option>
            {zonas.map((zona) => (
              <option key={zona.id} value={zona.id}>
                {zona.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Cuando la zona está
          <select
            className={claseCampo}
            value={campos.valor}
            onChange={(e) => cambiar('valor', e.target.value as Campos['valor'])}
          >
            <option value="ocupado">Ocupada</option>
            <option value="vacio">Vacía</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Esperar (segundos)
          <input
            className={claseCampo}
            type="number"
            min={0}
            inputMode="numeric"
            value={campos.duracionSegundos}
            onChange={(e) => cambiar('duracionSegundos', e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          Entonces
          <select
            className={claseCampo}
            value={campos.accion}
            onChange={(e) => cambiar('accion', e.target.value as Campos['accion'])}
          >
            <option value="encender">Encender las luces</option>
            <option value="apagar">Apagar las luces</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Prioridad (menor = más importante)
          <input
            className={claseCampo}
            type="number"
            min={0}
            max={1000}
            inputMode="numeric"
            value={campos.prioridad}
            onChange={(e) => cambiar('prioridad', e.target.value)}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={campos.usarHorario}
            onChange={(e) => cambiar('usarHorario', e.target.checked)}
          />
          Solo en un horario
        </label>
        {campos.usarHorario && (
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1">
              Desde
              <input
                className={claseCampo}
                type="time"
                value={campos.desde}
                onChange={(e) => cambiar('desde', e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              Hasta
              <input
                className={claseCampo}
                type="time"
                value={campos.hasta}
                onChange={(e) => cambiar('hasta', e.target.value)}
              />
            </label>
          </div>
        )}
      </fieldset>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={campos.activa}
          onChange={(e) => cambiar('activa', e.target.checked)}
        />
        Regla activa
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-vacio px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {enviando ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg border border-borde px-4 py-2"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
