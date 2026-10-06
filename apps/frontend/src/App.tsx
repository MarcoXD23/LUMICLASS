import { Navigate, Route, Routes } from 'react-router';
import { Marco } from './componentes/Marco';
import { ProveedorTiempoReal } from './hooks/useTiempoReal';
import { Control } from './paginas/Control';
import { Estadisticas } from './paginas/Estadisticas';
import { Historial } from './paginas/Historial';
import { Inicio } from './paginas/Inicio';
import { ListaEventos } from './paginas/ListaEventos';
import { Reglas } from './paginas/Reglas';
import { Sensores } from './paginas/Sensores';
import { Simulador } from './paginas/Simulador';

/** Rutas de la aplicación. El router (BrowserRouter) se monta en main.tsx. */
export function App() {
  return (
    <ProveedorTiempoReal>
      <Routes>
        <Route element={<Marco />}>
          <Route index element={<Inicio />} />
          <Route path="control" element={<Control />} />
          <Route path="sensores" element={<Sensores />} />
          <Route path="reglas" element={<Reglas />} />
          <Route path="historial" element={<Historial />}>
            <Route index element={<ListaEventos />} />
            <Route path="estadisticas" element={<Estadisticas />} />
          </Route>
          <Route path="simulador" element={<Simulador />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ProveedorTiempoReal>
  );
}
