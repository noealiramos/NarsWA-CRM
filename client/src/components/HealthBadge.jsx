import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

// Indicador del estado del server y de MongoDB (GET /api/health).
export default function HealthBadge() {
  const [health, setHealth] = useState({ state: 'loading' });

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const data = await apiRequest('/health');
        if (active) setHealth({ state: 'ok', database: data.database });
      } catch (err) {
        if (active) setHealth({ state: 'error', message: err.status === 503 ? 'MongoDB desconectado' : err.message });
      }
    };
    check();
    const timer = setInterval(check, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (health.state === 'loading') return <span className="badge">Verificando…</span>;
  if (health.state === 'error') return <span className="badge badge-error" title={health.message}>Sin conexión</span>;
  return <span className="badge badge-ok" title={`Base de datos: ${health.database}`}>Server y BD en línea</span>;
}
