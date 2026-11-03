import { fileURLToPath } from 'node:url';

// Registro de agentes de WhatsApp (skill crear-agente-especialista; reemplaza al catalog.js previsto en el ADR-003).
// Hoy solo describe a los agentes: ningún ejecutor llama al LLM con estos prompts (`connected: false`).
// `promptPath` es absoluto; `sources` son rutas relativas a la raíz del repositorio.
const promptFile = (name) => fileURLToPath(new URL(`./${name}/prompt.md`, import.meta.url));

export const AGENTS = [
  {
    name: 'recepcion',
    label: 'Recepcionista',
    // Equivale al "Recepcionista / Router" del PRD §3. No confundir con Recepción, el personal humano.
    description:
      'Equivale al Recepcionista / Router del PRD §3: saluda, clasifica la intención y deriva al especialista ' +
      '(ventas, info o pagos) o escala a una persona. Solo responde saludos y el aviso de emergencia.',
    promptPath: promptFile('recepcion'),
    sources: ['docs/negocio/playbook-ventas.md', 'docs/negocio/faq.md'],
    escalations: ['SOLICITUD_HUMANO', 'QUEJA_NEGOCIACION', 'FUERA_DE_CONOCIMIENTO', 'EMERGENCIA'],
    connected: false,
  },
  {
    name: 'ventas',
    label: 'Ventas / Planes',
    description:
      'Califica objetivo, horario y presupuesto, recomienda un plan del catálogo, maneja objeciones sin ' +
      'descuentos y guía hacia la visita gratuita o la inscripción.',
    promptPath: promptFile('ventas'),
    sources: ['docs/negocio/catalogo.md', 'docs/negocio/playbook-ventas.md'],
    escalations: [
      'QUEJA_NEGOCIACION',
      'TRAMITE_RECEPCION',
      'FUERA_DE_CONOCIMIENTO',
      'SOLICITUD_HUMANO',
      'EMERGENCIA',
    ],
    connected: false,
  },
];

// Devuelve el agente por nombre, o undefined si no existe.
export function getAgent(name) {
  return AGENTS.find((agent) => agent.name === name);
}
