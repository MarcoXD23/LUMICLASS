import { esquemaRegistro } from '@lumiclass/compartido';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { mensajeDeError } from '../../api/cliente';
import { CampoTexto } from '../../componentes/CampoTexto';
import { MensajeError } from '../../componentes/EstadoCarga';
import { MarcoAuth } from '../../componentes/MarcoAuth';
import { useSesion } from '../../hooks/useSesion';
import { erroresPorCampo } from '../../utilidades/validacion';

/** Registro abierto: la cuenta nueva queda como "usuario" y entra directo al dashboard. */
export function Registro() {
  const { usuario, registrarse } = useSesion();
  const navegar = useNavigate();
  const [campos, setCampos] = useState({ nombre: '', correo: '', contrasena: '', confirmar: '' });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  const cambiar = (campo: keyof typeof campos) => (e: { target: { value: string } }) =>
    setCampos((c) => ({ ...c, [campo]: e.target.value }));

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    const { confirmar, ...datos } = campos;
    const resultado = esquemaRegistro.safeParse(datos);
    const nuevosErrores = resultado.success ? {} : erroresPorCampo(resultado.error);
    if (confirmar !== campos.contrasena) nuevosErrores.confirmar = 'Las contraseñas no coinciden';
    setErrores(nuevosErrores);
    if (!resultado.success || Object.keys(nuevosErrores).length > 0) return;

    setError(null);
    setEnviando(true);
    try {
      await registrarse(resultado.data);
      void navegar('/', { replace: true });
    } catch (causa) {
      setError(mensajeDeError(causa));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <MarcoAuth
      titulo="Crear cuenta"
      subtitulo="Tu cuenta podrá ver el salón y controlar las luces."
      pie={
        <p>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-vacio underline">
            Inicia sesión
          </Link>
        </p>
      }
    >
      <MensajeError mensaje={error} />
      <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
        <CampoTexto
          etiqueta="Nombre"
          autoComplete="name"
          value={campos.nombre}
          onChange={cambiar('nombre')}
          error={errores.nombre}
        />
        <CampoTexto
          etiqueta="Correo"
          type="email"
          autoComplete="email"
          value={campos.correo}
          onChange={cambiar('correo')}
          error={errores.correo}
        />
        <CampoTexto
          etiqueta="Contraseña"
          type="password"
          autoComplete="new-password"
          value={campos.contrasena}
          onChange={cambiar('contrasena')}
          error={errores.contrasena}
          ayuda="Mínimo 8 caracteres, con al menos una letra y un número."
        />
        <CampoTexto
          etiqueta="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          value={campos.confirmar}
          onChange={cambiar('confirmar')}
          error={errores.confirmar}
        />
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-vacio px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
    </MarcoAuth>
  );
}
