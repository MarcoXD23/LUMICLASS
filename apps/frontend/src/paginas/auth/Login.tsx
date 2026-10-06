import { esquemaLogin } from '@lumiclass/compartido';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { mensajeDeError } from '../../api/cliente';
import { CampoTexto } from '../../componentes/CampoTexto';
import { MensajeError } from '../../componentes/EstadoCarga';
import { MarcoAuth } from '../../componentes/MarcoAuth';
import { useSesion } from '../../hooks/useSesion';
import { erroresPorCampo } from '../../utilidades/validacion';

/** Inicio de sesión. Al entrar, va al dashboard (o a la página que se quería ver). */
export function Login() {
  const { usuario, aviso, iniciarSesion } = useSesion();
  const navegar = useNavigate();
  const { state } = useLocation() as { state: { desde?: string } | null };
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={state?.desde ?? '/'} replace />;

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = esquemaLogin.safeParse({ correo, contrasena });
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error));
      return;
    }
    setErrores({});
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion(resultado.data);
      void navegar(state?.desde ?? '/', { replace: true });
    } catch (causa) {
      setError(mensajeDeError(causa));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <MarcoAuth
      titulo="Iniciar sesión"
      subtitulo="Controla y monitorea las luces del salón."
      pie={
        <>
          <p>
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="font-medium text-vacio underline">
              Regístrate
            </Link>
          </p>
          <Link to="/recuperar" className="text-vacio underline">
            Olvidé mi contraseña
          </Link>
        </>
      }
    >
      {aviso && <MensajeError mensaje={aviso} />}
      <MensajeError mensaje={error} />
      <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
        <CampoTexto
          etiqueta="Correo"
          type="email"
          autoComplete="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          error={errores.correo}
        />
        <CampoTexto
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          error={errores.contrasena}
        />
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-vacio px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </MarcoAuth>
  );
}
