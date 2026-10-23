import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../api.js';
import { E164, formatDateTime, mergeMessages } from '../labels.js';
import { useSocketConnected, useSocketEvent } from '../socket.js';

const DEFAULT_PHONE = '+5214490000001';

// Simulador de WhatsApp (ADR-001): el usuario actúa como lead.
export default function Simulator() {
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [name, setName] = useState('');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const connected = useSocketConnected();
  const endRef = useRef(null);
  const phoneValid = E164.test(phone);

  const loadHistory = useCallback(async (target) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/simulator/conversations/${encodeURIComponent(target)}/messages`);
      setMessages(data.messages);
    } catch (err) {
      setMessages([]);
      if (err.status !== 404) setError({ message: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (phoneValid) loadHistory(phone);
    else setMessages([]);
  }, [phone, phoneValid, loadHistory]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Respuestas "entregadas" al teléfono simulado (salen por outbox/gate.js).
  useSocketEvent('simulator:outbound', (event) => {
    if (event.to !== phone || !event.messageId) return;
    setMessages((current) =>
      mergeMessages(current, [
        { id: event.messageId, direction: 'SALIENTE', text: event.text, createdAt: event.sentAt, deliveryStatus: 'ENVIADO' },
      ]),
    );
  });

  async function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const data = await apiRequest('/simulator/messages', {
        method: 'POST',
        body: { phone, text, ...(name.trim() ? { name: name.trim() } : {}) },
      });
      const received = [data.inbound, data.reply?.message].filter(Boolean);
      setMessages((current) => mergeMessages(current, received));
      setDraft('');
      if (data.reply && data.reply.status !== 'ENVIADO') {
        setError({ message: `El sistema no respondió (${data.reply.reason ?? data.reply.status}).` });
      }
    } catch (err) {
      setError({ message: err.message, details: err.details });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="simulator">
      <div className="sim-config">
        <label>
          Teléfono del lead (E.164)
          <input value={phone} onChange={(e) => setPhone(e.target.value.trim())} aria-invalid={!phoneValid} />
        </label>
        <label>
          Nombre (opcional)
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Lead de prueba" />
        </label>
        {!phoneValid && <p className="hint-error">Usa formato internacional, por ejemplo {DEFAULT_PHONE}.</p>}
      </div>

      <div className="phone">
        <div className="phone-header">
          <strong>Fuerza Gym</strong>
          <span className={connected ? 'badge badge-ok' : 'badge badge-error'}>
            {connected ? 'Tiempo real conectado' : 'Tiempo real desconectado'}
          </span>
        </div>

        <div className="chat" aria-live="polite">
          {loading && <p className="chat-empty">Cargando conversación…</p>}
          {!loading && messages.length === 0 && <p className="chat-empty">Escribe un mensaje como si fueras un lead.</p>}
          {messages.map((m) => (
            <div key={m.id} className={`bubble ${m.direction === 'ENTRANTE' ? 'bubble-lead' : 'bubble-gym'}`}>
              <span>{m.text}</span>
              <time>{formatDateTime(m.createdAt)}</time>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {error && (
          <div className="alert" role="alert">
            {error.message}
            {error.details?.length > 0 && (
              <ul>
                {error.details.map((d) => (
                  <li key={d.path + d.message}>{d.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <form className="composer" onSubmit={handleSubmit}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe un mensaje"
            maxLength={4096}
            disabled={!phoneValid}
            aria-label="Mensaje"
          />
          <button type="submit" disabled={!phoneValid || sending || !draft.trim()}>
            {sending ? 'Enviando…' : 'Enviar'}
          </button>
        </form>
      </div>
    </section>
  );
}
