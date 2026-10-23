import HealthBadge from './components/HealthBadge.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <strong className="brand">Fuerza Gym CRM</strong>
        <HealthBadge />
      </header>
      <main className="page">
        <p>Esqueleto del CRM en construcción.</p>
      </main>
    </div>
  );
}
