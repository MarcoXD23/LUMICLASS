import { Lightbulb } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  /** Enlaces al pie (p. ej. "¿No tienes cuenta? Regístrate"). */
  pie?: ReactNode;
}

/** Estructura común de login, registro y recuperación: tarjeta centrada con la marca. */
export function MarcoAuth({ titulo, subtitulo, children, pie }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="rounded-2xl border border-luz-on bg-luz-on/15 p-3">
            <Lightbulb aria-hidden="true" className="size-8 text-amber-700" />
          </span>
          <p className="text-2xl font-bold">LUMICLASS</p>
          <p className="text-sm text-texto-suave">Iluminación inteligente del salón</p>
        </div>
        <section className="flex flex-col gap-4 rounded-2xl border border-borde bg-superficie p-6 shadow-sm">
          <div>
            <h1 className="text-xl font-semibold">{titulo}</h1>
            {subtitulo && <p className="text-sm text-texto-suave">{subtitulo}</p>}
          </div>
          {children}
        </section>
        {pie && <div className="flex flex-col items-center gap-1 text-sm">{pie}</div>}
      </div>
    </main>
  );
}
