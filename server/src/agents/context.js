import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { MAX_SYSTEM_CHARS } from '../llm/schemas.js';
import { AGENTS } from './registry.js';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const normalize = (text) => text.replace(/\r\n/g, '\n');
export const sourceHash = (text) => createHash('sha256').update(normalize(text)).digest('hex');
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);

// Solo el encabezado acotado del ADR-005; no se evalúa YAML ni código.
export function parseKnowledge(text) {
  const match = normalize(text).match(/^---\nversion: 1\nsources:\n((?:  [^\n]+\n)+)---\n([\s\S]*)$/);
  if (!match) throw new Error('Encabezado de conocimiento inválido');
  const hashes = {};
  for (const line of match[1].trimEnd().split('\n')) {
    const entry = line.match(/^  ([\w./-]+): sha256:([a-f0-9]{64})$/);
    if (!entry || Object.hasOwn(hashes, entry[1])) throw new Error('Fuente de conocimiento inválida o repetida');
    hashes[entry[1]] = hashSchema.parse(entry[2]);
  }
  return { hashes, knowledge: match[2] };
}

// Caché por agente y día, invalidada también si cambia el contenido o las fuentes.
export function createContextBuilder({ read = (path) => readFileSync(path, 'utf8'), root = ROOT } = {}) {
  const cache = new Map();
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const weekday = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long' });

  function buildSystem(agent, { now = new Date() } = {}) {
    if (!agent?.knowledge || !agent.promptPath || !Array.isArray(agent.sources) || !agent.sources.length) {
      throw new Error('Agente sin contexto implementado');
    }
    if (!Number.isInteger(agent.maxSystemChars) || agent.maxSystemChars > MAX_SYSTEM_CHARS - 1500
      || !Number.isInteger(agent.maxKnowledgeChars)) throw new Error('Presupuesto de contexto inválido');
    const prompt = normalize(read(agent.promptPath));
    const digest = parseKnowledge(read(agent.knowledge));
    const expected = [...agent.sources].sort();
    if (JSON.stringify(Object.keys(digest.hashes).sort()) !== JSON.stringify(expected)) {
      throw new Error(`Fuentes del digesto no coinciden: ${agent.name}`);
    }
    for (const source of expected) {
      if (sourceHash(read(resolve(root, source))) !== digest.hashes[source]) {
        throw new Error(`Digesto desactualizado: ${agent.name}; revisa knowledge.md`);
      }
    }
    if (digest.knowledge.length > agent.maxKnowledgeChars) throw new Error(`Conocimiento excede presupuesto: ${agent.name}`);
    const parts = dateFormatter.formatToParts(now);
    const date = ['year', 'month', 'day'].map((type) => parts.find((p) => p.type === type).value).join('-');
    const system = `${prompt}\n\n## Base de conocimiento\n${digest.knowledge}\n\n## Fecha actual\nHoy es ${weekday.format(now)} ${date} (America/Mexico_City).`;
    if (system.length > agent.maxSystemChars || system.length > MAX_SYSTEM_CHARS || system.trimStart().startsWith('-')) {
      throw new Error(`System excede presupuesto o formato: ${agent.name} (${system.length})`);
    }
    const key = `${agent.name}:${date}`;
    const previous = cache.get(key);
    if (previous === system) return previous;
    // Conjunto pequeño: conservar como máximo el día vigente por agente.
    for (const old of cache.keys()) if (old.startsWith(`${agent.name}:`)) cache.delete(old);
    cache.set(key, system);
    return system;
  }

  function assertAgentContexts(agents = AGENTS, options) {
    // Un agente del registro sin metadatos debe fallar, no desaparecer del chequeo.
    if (!agents.length) throw new Error('No hay agentes implementados para revisar');
    return agents.map((agent) => ({ name: agent.name, systemChars: buildSystem(agent, options).length }));
  }
  return { buildSystem, assertAgentContexts };
}

const builder = createContextBuilder();
export const buildSystem = builder.buildSystem;
export const assertAgentContexts = builder.assertAgentContexts;
