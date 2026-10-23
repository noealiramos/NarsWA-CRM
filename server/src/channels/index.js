import * as simulator from './simulator/outbound.js';

// Selecciona el adaptador de salida según WA_PROVIDER. Solo outbox/gate.js lo usa.
export function getOutboundChannel(provider) {
  if (provider === 'simulator') return simulator;
  throw new Error(`El canal "${provider}" todavía no está implementado (PENDIENTES #12).`);
}
