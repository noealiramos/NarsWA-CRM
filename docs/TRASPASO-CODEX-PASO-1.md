# Traspaso de Codex a Claude Code — paso 1

Fecha: 2026-11-06. Todo está guardado en el árbol de trabajo, sin `git add`, commits ni publicación.

## Alcance y punto de parada

Implementadas las entregas **1a–1d** autorizadas del ADR-005. Los ADR-005 y ADR-006 conservan el estado «Propuesto; paso 1 autorizado». **No se inició el paso 2**. El usuario pidió a Codex continuar temporalmente cuando Claude detuvo sus agentes.

El orquestador existe y se prueba con LLM falso; **todavía no está conectado al simulador**. El paso 1 no demuestra borradores persistidos, aprobación, entrega al canal ni el checkpoint completo. Tampoco existen el runner de evals ni `/probar-agente` (paso 7).

## Trabajo recibido de Claude

- Documentación: S75–S90, pendientes #123–#136, nota de conciliación del ADR-003 y los dos ADR propuestos.
- 1a: `config/env.js`, `vitest.config.js`, `contract.js`, `escalationTypes.js`, `noticeTexts.js`, `replyGuard.js`, pruebas asociadas y sustitución de la lista local de escalamientos en `agents.test.js`.
- Claude reportó 234 pruebas del servidor y revisión independiente interrumpida, sin resultados. Codex no atribuye a ese revisor una aprobación posterior.

## Trabajo de Codex

### 1a — revisión y correcciones

- Umbral de confianza: un string compuesto solo de espacios usa 0.5 en lugar de convertirse en cero.
- G2 consume una expresión monetaria una sola vez: `$199 MXN 30 días` contiene el monto 199, no 30.
- G2 rechaza `$1.500` como formato ambiguo; no lo interpreta como $1.50. Conserva centavos, separadores de miles admitidos y puntuación de fin de oración.
- Pruebas de regresión para esos casos. Se conservan las limitaciones aceptadas de G1/G3/G4.

### 1b — digestos y contexto

- Nuevos `recepcion/knowledge.md` y `ventas/knowledge.md`, con hashes SHA-256 de fuentes normalizadas a LF. Mantienen `[CONFIRMAR]` y `[PENDIENTE]`; no validan datos de negocio.
- Recepción: tabla de escalamientos del playbook §6, textos fijos y títulos del FAQ para clasificación. Las reglas del prompt prevalecen sobre el extracto; no se resuelven #119/#120.
- Ventas: catálogo §§3, 4, 6, 7 y 8; playbook §§7, 8.4 y 10; avisos fijos. Son extractos de las fuentes, sin datos comerciales nuevos. Lo omitido debe escalarse.
- `registry.js`: `knowledge`, `model`, `maxSystemChars` y `maxKnowledgeChars`; ambos agentes siguen `connected: false`.
- Los prompts ahora describen un extracto, en lugar de prometer fuentes completas.
- `context.js`: `buildSystem`, `assertAgentContexts`, `parseKnowledge`, `sourceHash` y fábrica inyectable para pruebas. Valida fuentes y presupuestos antes de reutilizar caché por agente/día. Fecha en `America/Mexico_City`.
- Medición con fecha 2026-11-06: Recepción **10 355** caracteres y Ventas **18 207**, dentro de sus presupuestos y del tope 24 000. Puede variar ligeramente con el nombre del día.
- `assertAgentContexts()` todavía **no** se llama desde el arranque (paso 5).

### 1c — historial y orquestador

- `history.js`: solo `normalizeHistory`, últimos 20 turnos normalizados y nota sintética cuando el primero es `assistant`. Devuelve copias y exige último turno `user`.
- La consulta a Mongo, el orden por `_id`, el filtro de entregados y los marcadores de media corresponden a **buildHistory del paso 5**; no se han implementado ni acreditado aquí.
- `orchestrator.js`: `runAgentTurn`, traspaso en el mismo turno, tope de dos saltos y prevención de ciclos, modo aislado, validación estricta, una corrección y un reintento de proveedor por agente, plazo compartido de 120 s con llamadas de hasta 45 s y mínimo útil de 1 s.
- Resultados seguros de configuración, proveedor, plazo, salida inválida, confianza baja y destino inexistente. Los errores del proveedor no se copian a los resultados.
- **EMERGENCIA:** ignora el reply del modelo y devuelve el aviso fijo en `escalation.notice`; no aplica G4 al texto descartado. No envía nada: el futuro servicio enviará antes de pausar.
- `PAGO`/`TRAMITE_RECEPCION`: resultado `RESPUESTA` con `escalation` simultánea y sin pausa.
- `stage` se conserva como propuesta con `applied:false`; no hay cambios de contacto.
- `fakeGenerate.js`: generador guionado e inspección de llamadas, sin proveedor real.

### 1d — esquemas y casos

- Esquema reutilizable de datos en `server/test/helpers/conversationCases.js`. No es un runner.
- Acepta campos de integración, avisos, `hardLimit`, `forbidden` y `priceClaims`. `action:null` solo para resultado seguro de integración con causa y campos coherentes.
- `forbidden` exige límite declarado y ejemplos positivos/negativos que correspondan al patrón. `mustNotMatch` permanece separado.
- Actualizados los dos casos de emergencia: `replyNull:true`, `noticeKind:EMERGENCIA`, `noticeMustMatch`; ya no esperan el 911 en reply.
- Creado `integracion.json` con los cuatro casos previstos. `agents.test.js` valida los tres archivos, sus claves, regex y textos fijos en esta misma entrega.
- No se añadieron etiquetas `forbidden`/`priceClaims` a los casos existentes ni su evaluador: corresponden al paso 7.

## Verificación ejecutada por Codex

Último `npm.cmd test` desde la raíz, después de todos los cambios de código:

- **23 archivos / 280 pruebas del servidor aprobadas.**
- **12 pruebas del hook aprobadas.**
- Pruebas con Mongo exclusivamente en `fuerza-gym-crm-test`; las nuevas piezas puras no usan DB. Ninguna prueba llama a un LLM real.
- `git diff --check` sin errores de whitespace; Git advierte conversiones LF/CRLF ya conocidas.
- Verificado diff vacío para `inbound.js`, modelos, gate, `index.js`, `client/`, manifiestos raíz y lockfile. No se ejecutaron seed, instalación de dependencias ni cambios de entorno.
- No se repitió el build del frontend: no hubo cambios de cliente.

## Revisión y límites

Codex hizo revisión propia del código, de los extractos contra las fuentes y de los resultados de pruebas. No afirma haber obtenido una revisión independiente de otro agente. Al retomar, el revisor de Claude puede revisar el árbol completo, incluidos los archivos **sin seguimiento**: un `git diff` solo no los incluye.

- G3 puede rechazar una mención inocua de «promociones» sin negación. G4 puede rechazar «Dolores» y «mediciones». G1/G3 conservan la ventana de negación y sus falsos negativos documentados. Seguimiento en #127; no son garantías absolutas.
- G2 no detecta montos en palabras, abreviados o sin marcador ni asociación monto–plan. `priceClaims` tiene esquema, no implementación evaluadora.
- La revisión de fidelidad de los digestos no autoriza a retirar marcas ni usar datos con personas reales.
- El SDK/CLI real, calidad de respuesta, confianza y latencia real no se evaluaron.
- `info` y `pagos` siguen sin implementar. El modo real no está habilitado en el flujo entrante.

## Para retomar con Claude o Codex

1. Lee este archivo, CLAUDE.md, ADR-005 y ADR-006 y comprueba `git status`.
2. Revisa la implementación 1a–1d, incluyendo archivos nuevos sin seguimiento. Conserva los cambios de Claude y Codex.
3. Repite `npm test` si corriges código o aparecen nuevas dudas. La última evidencia es 280 + 12, no 160 ni 234.
4. Entrega hallazgos y el siguiente alcance concreto. **No empieces el paso 2 sin nueva autorización del usuario** (#123).
5. No ejecutes `git add`, commits ni publicación sin autorización correspondiente; push sigue prohibido.

Decisiones sin resolver: #101, #107, #110, #118, #119, #120 y #124 (bloqueo frente a emergencia). Umbral 0.5, SIMULADO inicial, autonomía inicial SUPERVISADO y aprobación sin cambio de etapa se conservan. La diferencia literal con el maestro sigue declarada.

## Pausa solicitada por el usuario

El 2026-11-06 el usuario pidió detener el trabajo para apagar el equipo. Se comprobó que este documento y los archivos de implementación están guardados en disco. Los cambios siguen sin staging ni commits; los archivos nuevos siguen sin seguimiento. No se iniciaron tareas adicionales de implementación. La evidencia de pruebas indicada arriba corresponde a la ejecución anterior a esta pausa; no se repitieron las pruebas para este ajuste documental.

Prompt para un nuevo chat de Claude Code o Codex:

```text
Retomemos Fuerza Gym CRM en D:\MyDocuments\2026.wa-crm.
Primero lee CLAUDE.md y docs/TRASPASO-CODEX-PASO-1.md; después consulta los ADR-005 y ADR-006, SUPUESTOS y PENDIENTES que allí se referencian.
Claude y Codex dejaron implementadas las entregas 1a–1d del paso 1. La última ejecución registrada pasó 280 pruebas del servidor y 12 del hook. Falta revisión independiente; el orquestador aún no está conectado al simulador y el checkpoint completo no está cumplido.
Comprueba git status y revisa lo implementado, incluyendo archivos nuevos sin seguimiento. Conserva todos los cambios existentes. Antes de editar, confirma que no haya otro ejecutor trabajando sobre los mismos archivos.
Corrige los hallazgos bloqueantes o importantes dentro del paso 1 y ejecuta las pruebas pertinentes si cambias código. Entrega un resumen verificable y el siguiente alcance propuesto.
No empieces los pasos 2–8 sin mi autorización. No hagas git add, commits ni push; no uses LLM real, no cambies .env ni ejecutes seed. Las pruebas con BD deben usar exclusivamente fuerza-gym-crm-test. Mantén inbound.js sin cambios y los agentes con connected:false.
Conserva SIMULADO, confianza 0.5, SUPERVISADO inicial, aprobación sin cambio de etapa y Escalation separada del Draft. No resuelvas por tu cuenta #101, #107, #110, #118, #119, #120 ni #124.
```
