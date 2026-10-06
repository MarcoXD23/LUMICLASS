import {
  FlaskConical,
  House,
  ListChecks,
  Radar,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router';

interface Enlace {
  ruta: string;
  texto: string;
  icono: LucideIcon;
}

const ENLACES: Enlace[] = [
  { ruta: '/', texto: 'Inicio', icono: House },
  { ruta: '/control', texto: 'Control', icono: SlidersHorizontal },
  { ruta: '/sensores', texto: 'Sensores', icono: Radar },
  { ruta: '/reglas', texto: 'Reglas', icono: ListChecks },
];

const ENLACE_SIMULADOR: Enlace = { ruta: '/simulador', texto: 'Simulador', icono: FlaskConical };

/** Barra inferior en el celular y lateral en pantallas grandes. */
export function Navegacion({ mostrarSimulador }: { mostrarSimulador: boolean }) {
  const enlaces = mostrarSimulador ? [...ENLACES, ENLACE_SIMULADOR] : ENLACES;
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-borde bg-superficie md:static md:w-56 md:shrink-0 md:border-t-0 md:border-r md:bg-transparent"
    >
      <ul className="flex justify-around md:flex-col md:gap-1 md:p-3">
        {enlaces.map(({ ruta, texto, icono: Icono }) => (
          <li key={ruta} className="flex-1 md:flex-none">
            <NavLink
              to={ruta}
              end={ruta === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-2 text-xs md:flex-row md:gap-3 md:rounded-xl md:px-3 md:text-base ${
                  isActive
                    ? 'font-semibold text-vacio md:bg-vacio/10'
                    : 'text-texto-suave hover:text-texto'
                }`
              }
            >
              <Icono aria-hidden="true" className="size-6 md:size-5" />
              {texto}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
