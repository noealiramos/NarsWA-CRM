import HealthBadge from './components/HealthBadge.jsx';
import Agents from './pages/Agents.jsx';
import Crm from './pages/Crm.jsx';
import Inbox from './pages/Inbox.jsx';
import Pipeline from './pages/Pipeline.jsx';
import Simulator from './pages/Simulator.jsx';

// Cinco pantallas (ADR-003); sin librería de ruteo. Conversaciones reutiliza Crm.jsx; la fase 8 le agrega ContactPanel.
const ROUTES = [
  { path: '/pipeline', label: 'Pipeline', Page: Pipeline },
  { path: '/bandeja', label: 'Bandeja', Page: Inbox },
  { path: '/conversaciones', label: 'Conversaciones', Page: Crm },
  { path: '/agentes', label: 'Agentes', Page: Agents },
  { path: '/simulador', label: 'Simulador', Page: Simulator },
];
const HOME_PATH = '/pipeline';

// Solo el pathname cuenta: el query string (?contacto=<id>) y la barra final no cambian la ruta.
function currentPath() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return path === '/' ? HOME_PATH : path;
}

export default function App() {
  const path = currentPath();
  const route = ROUTES.find((r) => r.path === path);

  return (
    <div className="app">
      <header className="topbar">
        <strong className="brand">Fuerza Gym CRM</strong>
        <nav aria-label="Principal">
          {ROUTES.map((r) => (
            <a
              key={r.path}
              href={r.path}
              className={r === route ? 'nav-active' : undefined}
              aria-current={r === route ? 'page' : undefined}
            >
              {r.label}
            </a>
          ))}
        </nav>
        <HealthBadge />
      </header>
      <main className="page">{route ? <route.Page /> : <p>Página no encontrada.</p>}</main>
    </div>
  );
}
