---
name: crear-agente-especialista
description: Crea o modifica un agente especialista de WhatsApp en wa-crm (prompt, registro y pruebas). Úsala cuando pidan un agente nuevo o cambiar uno.
---

# Crear o modificar un agente especialista

Antes de empezar lee `CLAUDE.md` (reglas de oro y límites duros), `docs/PRD.md` §3 y `docs/negocio/playbook-ventas.md` §3, §6 y §8. Si lo que piden contradice el PRD o un ADR, avísalo antes de escribir.

1. **Pregunta**: nombre, objetivo, qué archivos de `docs/negocio/` usa y cuándo escala a humano. Omite lo que ya te dijeron. Para el escalamiento propón los tipos del playbook §6 que apliquen y confírmalos.
2. **Crea** `server/src/agents/<nombre>/prompt.md` desde [plantilla.md](plantilla.md). Reemplaza cada `{{...}}`; no dejes ninguno sin llenar. Al modificar un agente existente, edita su prompt y actualiza sus casos.
3. **Regístralo** en `server/src/agents/registry.js` con esta forma (una entrada por agente, en el arreglo `AGENTS`):
   `{ name, label, description, promptPath, sources, escalations, connected }`
   - `name`: identificador de solo letras minúsculas sin acentos (`^[a-z]+$`), igual al de la carpeta y al campo `agent` del contrato.
   - `sources`: rutas de `docs/negocio/` que el agente puede usar; deben existir y el prompt debe citar cada una con su ruta completa (`docs/negocio/x.md`).
   - `escalations`: tipos que el agente puede escalar él mismo (`PAGO`, `FUERA_DE_CONOCIMIENTO`, `SOLICITUD_HUMANO`, `QUEJA_NEGOCIACION`, `TRAMITE_RECEPCION`, `EMERGENCIA`). Un tipo que solo deriva a otro agente no se declara. El prompt debe nombrar cada uno entre backticks.
   - `connected`: `false` hasta que un ejecutor llame al LLM con este prompt.
4. **Crea 5 casos** como mínimo en `server/test/conversaciones/<nombre>.json`: uno por cada camino principal del agente y uno por cada límite duro y tipo de escalamiento que pueda tocar. Es un arreglo de:
   ```json
   {
     "id": "kebab-case-unico",
     "description": "qué comprueba, en español",
     "messages": [{ "role": "user", "content": "texto del lead" }],
     "expect": {
       "action": "NINGUNA | DERIVAR | REGISTRAR_DATOS | ESCALAR",
       "handoffTarget": null,
       "escalation": null,
       "replyNull": false,
       "mustMatch": ["regex"],
       "mustNotMatch": ["regex"]
     }
   }
   ```
   Debe haber al menos un caso por cada tipo de `escalations` y uno por cada agente al que `DERIVAR`. `replyNull` es `true` en todo `DERIVAR` y en todo `ESCALAR` que pausa a la IA. Hoy los casos son datos para un ejecutor futuro: solo se valida su forma. No escribas precios en ellos; usa `mustNotMatch` para lo prohibido (por ejemplo `"\\$\\s?\\d"` cuando no deba dar cifras).
5. **Verifica** con `npm test -w server`: hay una prueba que revisa el registro, el prompt (sin `{{` sobrantes, con el contrato y sin cifras en pesos) y los casos.
6. **Reporta** los supuestos y pendientes nuevos. No hagas commit.

## Reglas
- La salida del agente es **siempre** el contrato JSON de la plantilla: `{ agent, reply, stage, action, handoff, confidence, notes }`. Nunca texto fuera del JSON.
- **Nunca precios fuera de `catalogo.md`**: el prompt no lleva cifras en pesos; los precios y promociones salen solo de lo que el agente recibe de `catalogo.md`. Nunca inventa promociones ni descuentos.
- `stage` solo admite `null`, `NUEVO` o `EN_CONVERSACION`. Nunca `VISITA_AGENDADA`, `VISITO`, `PAGO_EN_REVISION`, `SOCIO` ni `PERDIDO`: los mueve Recepción (playbook §3; regla de oro 3).
- Recepción es el **personal humano**; el agente nunca se llama a sí mismo "recepción" ni le atribuye acciones que no hizo. Si el agente se llama `recepcion`, el nombre es solo el identificador técnico.
- Tono de WhatsApp de México, máximo 3 líneas, sin listas largas. Persona común: Sofía, asistente virtual de Fuerza Gym (PRD §3).
- Los avisos de escalamiento al lead los envía el sistema, no el agente (ADR-003 §9, S61). La única excepción es `EMERGENCIA`, que sale siempre de inmediato con el texto fijo del playbook §6.
- Prompts, mensajes y casos en español de México; código e identificadores en inglés.
