import { Navigate, Route, Routes } from 'react-router';
import { Marco } from './componentes/Marco';
import { RutaProtegida, SoloAdmin } from './componentes/RutaProtegida';
import { ProveedorSesion } from './hooks/useSesion';
import { ProveedorTiempoReal } from './hooks/useTiempoReal';
import { BandejaCorreos } from './paginas/auth/BandejaCorreos';
import { Login } from './paginas/auth/Login';
import { Recuperar } from './paginas/auth/Recuperar';
import { Registro } from './paginas/auth/Registro';
import { Restablecer } from './paginas/auth/Restablecer';
import { Control } from './paginas/Control';
import { Estadisticas } from './paginas/Estadisticas';
import { Historial } from './paginas/Historial';
import { Inicio } from './paginas/Inicio';
import { ListaEventos } from './paginas/ListaEventos';
import { Reglas } from './paginas/Reglas';
import { Sensores } from './paginas/Sensores';
import { Simulador } from './paginas/Simulador';
import { Usuarios } from './paginas/Usuarios';

/** Rutas de la aplicación. El router (BrowserRouter) se monta en main.tsx. */
export function App() {
  return (
    <ProveedorSesion>
      <Routes>
        {/* Públicas */}
        <Route path="login" element={<Login />} />
        <Route path="registro" element={<Registro />} />
        <Route path="recuperar" element={<Recuperar />} />
        <Route path="restablecer" element={<Restablecer />} />
        <Route path="correos" element={<BandejaCorreos />} />

        {/* Con sesión iniciada (el tiempo real solo se abre después de entrar) */}
        <Route
          element={
            <RutaProtegida>
              <ProveedorTiempoReal>
                <Marco />
              </ProveedorTiempoReal>
            </RutaProtegida>
          }
        >
          <Route index element={<Inicio />} />
          <Route path="control" element={<Control />} />
          <Route path="sensores" element={<Sensores />} />
          <Route path="reglas" element={<Reglas />} />
          <Route path="historial" element={<Historial />}>
            <Route index element={<ListaEventos />} />
            <Route path="estadisticas" element={<Estadisticas />} />
          </Route>
          <Route path="simulador" element={<Simulador />} />
          <Route
            path="usuarios"
            element={
              <SoloAdmin>
                <Usuarios />
              </SoloAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ProveedorSesion>
  );
}
