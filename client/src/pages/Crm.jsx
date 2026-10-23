import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api.js';
import { AUTHOR_LABELS, STAGE_LABELS, formatDateTime } from '../labels.js';
import { useSocketEvent } from '../socket.js';

// Vista CRM mínima (solo lectura): contactos, etapas y conversaciones.
export default function Crm() {
  const [stage, setStage] = useState('');
  const [contacts, setContacts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadContacts = useCallback(async () => {
    try {
      const data = await apiRequest(`/contacts${stage ? `?stage=${stage}` : ''}`);
      setContacts(data.contacts);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [stage]);

  const loadDetail = useCallback(async (id) => {
    if (!id) return setDetail(null);
    try {
      setDetail(await apiRequest(`/contacts/${id}`));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useSocketEvent('crm:message', (event) => {
    loadContacts();
    if (event.contactId === selectedId) loadDetail(selectedId);
  });

  return (
    <section className="crm">
      <div className="crm-list">
        <div className="crm-toolbar">
          <h1>Contactos</h1>
          <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Filtrar por etapa">
            <option value="">Todas las etapas</option>
            {Object.entries(STAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="alert" role="alert">{error}</div>}
        {loading && <p className="muted">Cargando…</p>}
        {!loading && contacts.length === 0 && (
          <p className="muted">
            Aún no hay contactos{stage ? ' en esta etapa' : ''}. Envía un mensaje desde el <a href="/simulador">simulador</a>.
          </p>
        )}

        <ul className="contact-list">
          {contacts.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`contact ${c.id === selectedId ? 'contact-active' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <span className="contact-main">
                  <strong>{c.name ?? c.phone}</strong>
                  <span className={`stage stage-${c.stage}`}>{STAGE_LABELS[c.stage] ?? c.stage}</span>
                </span>
                <span className="contact-sub">
                  {c.name && <span>{c.phone}</span>}
                  <span>{c.messageCount} mensajes</span>
                  <span>{formatDateTime(c.lastMessage?.createdAt)}</span>
                </span>
                {c.lastMessage && <span className="contact-preview">{c.lastMessage.text}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="crm-detail">
        {!detail && <p className="muted">Selecciona un contacto para ver su conversación.</p>}
        {detail && (
          <>
            <div className="detail-header">
              <h2>{detail.contact.name ?? detail.contact.phone}</h2>
              <span className={`stage stage-${detail.contact.stage}`}>{STAGE_LABELS[detail.contact.stage]}</span>
              {detail.conversation && <span className="badge">Modo {detail.conversation.mode}</span>}
            </div>
            <p className="muted">
              {detail.contact.phone} · Origen: {detail.contact.source === 'ANUNCIO' ? 'Anuncio' : 'Orgánico'} · Alta:{' '}
              {formatDateTime(detail.contact.createdAt)}
            </p>
            <div className="chat chat-crm">
              {detail.messages.map((m) => (
                <div key={m.id} className={`bubble ${m.direction === 'ENTRANTE' ? 'bubble-in' : 'bubble-out'}`}>
                  <small>
                    {AUTHOR_LABELS[m.author.kind] ?? m.author.kind}
                    {m.author.kind === 'AGENTE' ? ` · ${m.author.ref}` : ''}
                  </small>
                  <span>{m.text}</span>
                  <time>
                    {formatDateTime(m.createdAt)} · {m.deliveryStatus}
                  </time>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
