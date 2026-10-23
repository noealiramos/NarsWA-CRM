import HealthBadge from './components/HealthBadge.jsx';
import Crm from './pages/Crm.jsx';
import Simulator from './pages/Simulator.jsx';

// Dos rutas por ahora; sin librería de ruteo hasta que haga falta.
const ROUTES = [
  { path: '/', label: 'CRM', Page: Crm },
  { path: '/simulador', label: 'Simulador', Page: Simulator },
];

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const route = ROUTES.find((r) => r.path === path);

  return (
    <div className="app">
      <header className="topbar">
        <strong className="brand">Fuerza Gym CRM</strong>
        <nav>
          {ROUTES.map((r) => (
            <a key={r.path} href={r.path} className={r === route ? 'nav-active' : undefined}>
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
