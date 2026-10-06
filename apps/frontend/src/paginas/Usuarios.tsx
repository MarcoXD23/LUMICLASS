import type { CambioUsuario, UsuarioDto } from '@lumiclass/compartido';
import { ShieldCheck, User, UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/recursos';
import { AvisoConexion } from '../componentes/AvisoConexion';
import { Cargando, MensajeError, SinElementos } from '../componentes/EstadoCarga';
import { Insignia } from '../componentes/Insignia';
import { useAccion } from '../hooks/useAccion';
import { useDatosEnVivo } from '../hooks/useDatosEnVivo';
import { useSesion } from '../hooks/useSesion';
import { haceCuanto } from '../utilidades/formatoFecha';

/** Gestión de cuentas (solo admin). Desactivar no borra: la cuenta queda guardada como inactiva. */
export function Usuarios() {
  const { usuario: yo } = useSesion();
  const [verInactivos, setVerInactivos] = useState(false);
  const consulta = useDatosEnVivo((senal) => api.usuarios.listar(verInactivos, senal), {
    clave: String(verInactivos),
    filtrarEvento: (e) => e.tipo === 'usuario_registrado' || e.tipo === 'usuario_cambiado',
  });
  const accion = useAccion(
    (usuario: UsuarioDto, cambios: CambioUsuario) => api.usuarios.cambiar(usuario.id, cambios),
    { clave: (usuario) => usuario.id, alTerminar: consulta.recargar },
  );

  const desactivar = (usuario: UsuarioDto) => {
    if (
      window.confirm(
        `¿Desactivar la cuenta de ${usuario.nombre}? No podrá iniciar sesión; sus datos se conservan.`,
      )
    ) {
      void accion.ejecutar(usuario, { activo: false });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">Usuarios</h2>
      <p className="text-sm text-texto-suave">
        Cualquiera puede registrarse como usuario. La cuenta de administrador no se puede desactivar
        ni cambiar de rol.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={verInactivos}
          onChange={(e) => setVerInactivos(e.target.checked)}
        />
        Mostrar también las cuentas desactivadas
      </label>
      <AvisoConexion
        error={consulta.error}
        actualizadoEn={consulta.actualizadoEn}
        onReintentar={() => void consulta.recargar()}
      />
      <MensajeError mensaje={accion.error} onCerrar={accion.limpiarError} />
      {consulta.cargando && !consulta.datos && <Cargando texto="Cargando usuarios…" />}
      {consulta.datos?.length === 0 && <SinElementos texto="No hay usuarios." />}

      <ul className="flex flex-col gap-3">
        {consulta.datos?.map((usuario) => {
          const esAdmin = usuario.rol === 'admin';
          const ocupado = accion.enCurso !== null;
          return (
            <li
              key={usuario.id}
              className={`flex flex-col gap-2 rounded-2xl border border-borde bg-superficie p-4 shadow-sm ${
                usuario.activo ? '' : 'opacity-70'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {usuario.nombre}
                    {usuario.id === yo?.id && <span className="text-texto-suave"> (tú)</span>}
                  </p>
                  <p className="text-sm text-texto-suave">{usuario.correo}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Insignia
                    descripcion={{
                      texto: esAdmin ? 'Administrador' : 'Usuario',
                      icono: esAdmin ? ShieldCheck : User,
                      tono: esAdmin ? 'automatico' : 'neutro',
                    }}
                  />
                  <Insignia
                    descripcion={{
                      texto: usuario.activo ? 'Activa' : 'Desactivada',
                      icono: usuario.activo ? UserCheck : UserX,
                      tono: usuario.activo ? 'ok' : 'error',
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-texto-suave">
                Creada {haceCuanto(usuario.creadoEn)}
                {usuario.inactivoDesde && ` · desactivada ${haceCuanto(usuario.inactivoDesde)}`}
              </p>
              {!esAdmin && (
                <div className="flex flex-wrap gap-2">
                  {usuario.activo ? (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => desactivar(usuario)}
                      className="rounded-lg border border-borde px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      Desactivar
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => void accion.ejecutar(usuario, { activo: true })}
                      className="rounded-lg border border-borde px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      Reactivar
                    </button>
                  )}
                  {usuario.activo && (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Hacer administrador a ${usuario.nombre}? No se podrá deshacer.`,
                          )
                        ) {
                          void accion.ejecutar(usuario, { rol: 'admin' });
                        }
                      }}
                      className="rounded-lg border border-borde px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      Hacer administrador
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
