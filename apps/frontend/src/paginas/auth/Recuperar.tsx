import { esquemaRecuperar } from '@lumiclass/compartido';
import { MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { mensajeDeError } from '../../api/cliente';
import { api } from '../../api/recursos';
import { CampoTexto } from '../../componentes/CampoTexto';
import { MensajeError } from '../../componentes/EstadoCarga';
import { MarcoAuth } from '../../componentes/MarcoAuth';
import { CLASES_TONO } from '../../utilidades/estados';
import { erroresPorCampo } from '../../utilidades/validacion';

/** "Olvidé mi contraseña": envía un enlace de un solo uso (30 min). */
export function Recuperar() {
  const [correo, setCorreo] = useState('');
  const [errorCampo, setErrorCampo] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = esquemaRecuperar.safeParse({ correo });
    if (!resultado.success) {
      setErrorCampo(erroresPorCampo(resultado.error).correo);
      return;
    }
    setErrorCampo(undefined);
    setError(null);
    setEnviando(true);
    try {
      setMensaje((await api.auth.recuperar(resultado.data.correo)).mensaje);
    } catch (causa) {
      setError(mensajeDeError(causa));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <MarcoAuth
      titulo="Recuperar contraseña"
      subtitulo="Te enviaremos un enlace para crear una contraseña nueva."
      pie={
        <Link to="/login" className="text-vacio underline">
          Volver a iniciar sesión
        </Link>
      }
    >
      <MensajeError mensaje={error} />
      {mensaje ? (
        <div
          className={`flex flex-col gap-2 rounded-xl border p-3 ${CLASES_TONO.ok}`}
          role="status"
        >
          <p className="flex items-center gap-2 font-medium">
            <MailCheck aria-hidden="true" className="size-5" />
            {mensaje}
          </p>
          <p className="text-sm">
            Modo de prueba: el correo es simulado. Ábrelo en la{' '}
            <Link to="/correos" className="font-medium underline">
              bandeja de correos de prueba
            </Link>
            .
          </p>
        </div>
      ) : (
        <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
          <CampoTexto
            etiqueta="Correo de tu cuenta"
            type="email"
            autoComplete="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            error={errorCampo}
          />
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-vacio px-4 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {enviando ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>
      )}
    </MarcoAuth>
  );
}
