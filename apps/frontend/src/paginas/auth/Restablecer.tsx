import { esquemaContrasena } from '@lumiclass/compartido';
import { CircleCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { mensajeDeError } from '../../api/cliente';
import { api } from '../../api/recursos';
import { CampoTexto } from '../../componentes/CampoTexto';
import { MensajeError } from '../../componentes/EstadoCarga';
import { MarcoAuth } from '../../componentes/MarcoAuth';
import { CLASES_TONO } from '../../utilidades/estados';

/** Página del enlace del correo (?token=...): crea la contraseña nueva. */
export function Restablecer() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token') ?? '';
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [errores, setErrores] = useState<{ contrasena?: string; confirmar?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = esquemaContrasena.safeParse(contrasena);
    const nuevos = {
      contrasena: resultado.success ? undefined : resultado.error.issues[0]?.message,
      confirmar: confirmar === contrasena ? undefined : 'Las contraseñas no coinciden',
    };
    setErrores(nuevos);
    if (nuevos.contrasena || nuevos.confirmar) return;
    setError(null);
    setEnviando(true);
    try {
      await api.auth.restablecer(token, contrasena);
      setListo(true);
    } catch (causa) {
      setError(mensajeDeError(causa));
    } finally {
      setEnviando(false);
    }
  };

  const pie = (
    <Link to="/login" className="text-vacio underline">
      Ir a iniciar sesión
    </Link>
  );

  if (!token) {
    return (
      <MarcoAuth titulo="Enlace incompleto" pie={pie}>
        <MensajeError mensaje="El enlace no tiene el código de recuperación. Pide uno nuevo en «Olvidé mi contraseña»." />
      </MarcoAuth>
    );
  }

  return (
    <MarcoAuth
      titulo="Crear contraseña nueva"
      subtitulo="Por seguridad, se cerrarán tus sesiones abiertas."
      pie={pie}
    >
      {listo ? (
        <p
          role="status"
          className={`flex items-center gap-2 rounded-xl border p-3 ${CLASES_TONO.ok}`}
        >
          <CircleCheck aria-hidden="true" className="size-5" />
          Contraseña actualizada. Ya puedes iniciar sesión.
        </p>
      ) : (
        <>
          <MensajeError mensaje={error} />
          <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
            <CampoTexto
              etiqueta="Contraseña nueva"
              type="password"
              autoComplete="new-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              error={errores.contrasena}
              ayuda="Mínimo 8 caracteres, con al menos una letra y un número."
            />
            <CampoTexto
              etiqueta="Repite la contraseña"
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              error={errores.confirmar}
            />
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-vacio px-4 py-2.5 font-semibold text-white disabled:opacity-60"
            >
              {enviando ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        </>
      )}
    </MarcoAuth>
  );
}
