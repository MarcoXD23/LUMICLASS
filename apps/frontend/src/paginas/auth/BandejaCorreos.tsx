import { Mail, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../../api/recursos';
import { Cargando, MensajeError, SinElementos } from '../../componentes/EstadoCarga';
import { MarcoAuth } from '../../componentes/MarcoAuth';
import { useConsulta } from '../../hooks/useConsulta';
import { CLASES_TONO } from '../../utilidades/estados';
import { haceCuanto } from '../../utilidades/formatoFecha';

/**
 * Bandeja de correos simulados (solo mientras no haya SMTP real).
 * Permite probar la recuperación de contraseña en la presentación.
 */
export function BandejaCorreos() {
  const correos = useConsulta(api.auth.correosSimulados, { intervaloMs: 5000 });

  return (
    <MarcoAuth
      titulo="Correos de prueba"
      subtitulo="Aquí llegan los correos mientras el envío real no está configurado."
      pie={
        <Link to="/login" className="text-vacio underline">
          Volver a iniciar sesión
        </Link>
      }
    >
      <p
        className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${CLASES_TONO.advertencia}`}
      >
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Solo para pruebas: con correo real esta bandeja se desactiva.
      </p>
      {correos.cargando && !correos.datos && <Cargando />}
      {correos.error && !correos.datos && <MensajeError mensaje={correos.error.message} />}
      {correos.datos?.length === 0 && <SinElementos texto="Todavía no hay correos." />}
      <ul className="flex flex-col gap-3">
        {correos.datos?.map((correo) => (
          <li key={correo.id} className="flex flex-col gap-1 rounded-xl border border-borde p-3">
            <p className="flex items-center gap-2 font-medium">
              <Mail aria-hidden="true" className="size-4" />
              {correo.asunto}
            </p>
            <p className="text-xs text-texto-suave">
              Para {correo.para} · {haceCuanto(correo.creadoEn)}
            </p>
            <p className="text-sm">{correo.cuerpo}</p>
            {correo.enlace && (
              <a href={correo.enlace} className="text-sm font-medium text-vacio underline">
                Abrir enlace para crear contraseña nueva
              </a>
            )}
          </li>
        ))}
      </ul>
    </MarcoAuth>
  );
}
