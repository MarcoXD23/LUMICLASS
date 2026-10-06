/* eslint-disable react-refresh/only-export-components -- el proveedor y su hook van juntos a propósito */
import type { DatosLogin, DatosRegistro } from '@lumiclass/compartido';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { avisosSesionVencida, ErrorApi } from '../api/cliente';
import { api, type UsuarioSesion } from '../api/recursos';

interface ContextoSesion {
  usuario: UsuarioSesion | null;
  /** true mientras se pregunta al servidor si hay sesión (al abrir la app). */
  cargando: boolean;
  /** Mensaje para mostrar en el login (p. ej. "Tu sesión venció"). */
  aviso: string | null;
  esAdmin: boolean;
  iniciarSesion: (datos: DatosLogin) => Promise<void>;
  registrarse: (datos: DatosRegistro) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const Contexto = createContext<ContextoSesion | null>(null);

/**
 * Sesión del usuario. La sesión vive en el servidor (cookie httpOnly + base de datos):
 * aquí solo se pregunta quién está conectado. Recargar la página no la pierde.
 */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    const controlador = new AbortController();
    api.auth
      .sesion(controlador.signal)
      .then(setUsuario)
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return;
        // Sin sesión es lo normal; solo se avisa si el servidor no responde.
        if (error instanceof ErrorApi && error.sinConexion) setAviso(error.message);
        setUsuario(null);
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });
    return () => controlador.abort();
  }, []);

  useEffect(() => {
    const alVencer = () => {
      setUsuario((anterior) => {
        if (anterior) setAviso('Tu sesión venció o se cerró. Inicia sesión de nuevo.');
        return null;
      });
    };
    avisosSesionVencida.add(alVencer);
    return () => {
      avisosSesionVencida.delete(alVencer);
    };
  }, []);

  const iniciarSesion = useCallback(async (datos: DatosLogin) => {
    const { id, nombre, correo, rol } = await api.auth.login(datos);
    setAviso(null);
    setUsuario({ id, nombre, correo, rol });
  }, []);

  const registrarse = useCallback(async (datos: DatosRegistro) => {
    const { id, nombre, correo, rol } = await api.auth.registro(datos);
    setAviso(null);
    setUsuario({ id, nombre, correo, rol });
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setUsuario(null);
    }
  }, []);

  const valor = useMemo<ContextoSesion>(
    () => ({
      usuario,
      cargando,
      aviso,
      esAdmin: usuario?.rol === 'admin',
      iniciarSesion,
      registrarse,
      cerrarSesion,
    }),
    [usuario, cargando, aviso, iniciarSesion, registrarse, cerrarSesion],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>');
  return contexto;
}
