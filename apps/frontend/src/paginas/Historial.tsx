import { NavLink, Outlet } from 'react-router';

const PESTANAS = [
  { ruta: '/historial', texto: 'Eventos', fin: true },
  { ruta: '/historial/estadisticas', texto: 'Estadísticas', fin: false },
];

/** Historial con dos pestañas: la lista de eventos y las estadísticas. */
export function Historial() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">Historial</h2>
      <nav aria-label="Secciones del historial">
        <ul className="flex gap-1 border-b border-borde">
          {PESTANAS.map((pestana) => (
            <li key={pestana.ruta}>
              <NavLink
                to={pestana.ruta}
                end={pestana.fin}
                className={({ isActive }) =>
                  `-mb-px block border-b-2 px-4 py-2 font-medium ${
                    isActive
                      ? 'border-vacio text-vacio'
                      : 'border-transparent text-texto-suave hover:text-texto'
                  }`
                }
              >
                {pestana.texto}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
