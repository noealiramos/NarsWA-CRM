# ADR-002 — El seed de datos de prueba vive en `scripts/` (excepción a "backend solo en `server/`")

| Campo | Valor |
|---|---|
| Estado | Aceptado |
| Fecha | 2026-10-23 |
| Relacionado | [SUPUESTOS](../SUPUESTOS.md) S49–S51, [PENDIENTES](../PENDIENTES.md) #57–#67, revisión del commit `0da2f39` |

## Contexto

El seed de la Fase 4 ([`scripts/seed.js`](../../scripts/seed.js), `npm run seed` desde la raíz) carga 10 contactos ficticios con sus conversaciones y mensajes en la base local `fuerza-gym-crm`.

La revisión del commit `0da2f39` señaló que es código de backend fuera de `server/`:

- `CLAUDE.md` documenta el backend solo en `server/`, y la estructura no incluye `scripts/`.
- El script importa piezas internas del server (`../server/src/config`, `db.js` y `models/`).
- La prueba del server ([`server/test/seed.test.js`](../../server/test/seed.test.js)) importa `../../scripts/seed.js`, así que cruza el límite entre workspaces.

## Decisión

**El seed se queda en `scripts/seed.js`, en la raíz del repositorio.** Es una instrucción explícita del profesor del curso. Es una excepción acotada: no autoriza poner otro código de backend fuera de `server/`.

Reglas de la excepción:

1. `scripts/` solo contiene utilidades de desarrollo que se ejecutan a mano (hoy, solo el seed). No se importan desde `server/src/` ni se despliegan.
2. El seed puede importar `server/src/config/`, `server/src/db.js` y `server/src/models/`. **Nunca** importa canales, `outbox/gate.js`, agentes, jobs ni Socket.IO (regla de oro 1; el seed no envía mensajes).
3. Solo la prueba `server/test/seed.test.js` puede importar desde `scripts/`.
4. **Mantenimiento:** el subagente `backend` sigue limitado a `server/`. Cualquier cambio a `scripts/seed.js` lo coordina la sesión principal, que puede apoyarse en `backend` solo para `server/test/seed.test.js` y en `revisor` para revisar el diff.

## Consecuencias

- Hay dos raíces de código que dependen de `server/src/`. Si cambia un modelo, hay que revisar también el seed (la prueba del seed falla si quedan incoherentes).
- `CLAUDE.md` debe mencionar `scripts/` en la estructura y `npm run seed` en los comandos (PENDIENTES #58). No se hizo en este cambio para no mezclarlo con el commit del equipo de subagentes.
- Si en el futuro el seed crece o se necesitan más scripts con lógica de negocio, se reevalúa moverlos a `server/scripts/` con un ADR nuevo.

## Alternativa descartada

| Alternativa | Por qué no |
|---|---|
| Mover el seed a `server/scripts/seed.js` con un alias `npm run seed -w server` | Es la opción más limpia técnicamente, pero contradice la instrucción del profesor. |
