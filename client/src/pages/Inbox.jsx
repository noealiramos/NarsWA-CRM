import { useRef } from 'react';

// Marcador de la fase 1 (ADR-003): estructura estática de la Bandeja, sin llamadas a la API.
// Los borradores llegan en la fase 6; los escalamientos, con su propio ADR (PENDIENTES #47).
const TABS = [
  { id: 'tab-drafts', panelId: 'panel-drafts', label: 'Borradores', active: true },
  { id: 'tab-escalations', panelId: null, label: 'Escalamientos — Próximamente', active: false },
];
const ACTIVE_TAB = TABS.find((tab) => tab.active);

export default function Inbox() {
  const tabRefs = useRef([]);

  // Patrón ARIA de pestañas: las flechas y Home/End solo mueven el foco; la pestaña
  // deshabilitada recibe foco pero no se activa (el cambio de pestaña llega en la fase 6).
  function handleKeyDown(event, index) {
    const last = TABS.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    tabRefs.current[next]?.focus();
  }

  return (
    <section className="placeholder">
      <h1>Bandeja</h1>
      <div className="tabs" role="tablist" aria-label="Bandeja">
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            id={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.active}
            aria-controls={tab.panelId ?? undefined}
            aria-disabled={tab.active ? undefined : 'true'}
            tabIndex={tab.active ? 0 : -1}
            className={tab.active ? 'tab tab-active' : 'tab'}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={ACTIVE_TAB.panelId} aria-labelledby={ACTIVE_TAB.id} tabIndex={0}>
        <p className="muted">Los borradores por aprobar llegarán en una fase posterior.</p>
      </div>
    </section>
  );
}
