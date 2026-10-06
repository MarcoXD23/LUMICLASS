import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSesion } from '../hooks/useSesion';
import { Cargando, MensajeError } from './EstadoCarga';

/** Solo deja pasar con sesión iniciada; si no, manda al login y recuerda a dónde iba. */
export function RutaProtegida({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  const { pathname } = useLocation();
  if (cargando) return <Cargando texto="Comprobando tu sesión…" />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: pathname }} />;
  return <>{children}</>;
}

/** Solo para el admin; a los demás les explica por qué no pueden entrar. */
export function SoloAdmin({ children }: { children: ReactNode }) {
  const { esAdmin } = useSesion();
  if (!esAdmin) return <MensajeError mensaje="Esta sección es solo para el administrador." />;
  return <>{children}</>;
}
