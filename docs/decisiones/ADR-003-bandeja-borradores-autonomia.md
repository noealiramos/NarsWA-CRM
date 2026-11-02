# ADR-003 — Bandeja de borradores y niveles de autonomía de los agentes

| Campo | Valor |
|---|---|
| Estado | Aceptado (2026-11-02, tras dos revisiones del `revisor`) |
| Fecha | 2026-11-02 |
| Relacionado | [PRD](../PRD.md) §3.3 (enmienda), §5, §6.1, C1, C2, E1 y §8 · [SUPUESTOS](../SUPUESTOS.md) S40, S41, S43, S51, S54–S64 · [PENDIENTES](../PENDIENTES.md) #40, #41, #42, #47, #50, #84–#98 · [ADR-001](ADR-001-stack.md) |

## Contexto

El PRD describe agentes que atienden 24/7 sin aprobación previa; no menciona borradores ni niveles de autonomía. Hoy `server/src/services/inbound.js` responde cada mensaje entrante en modo `IA` con el texto fijo de `agents/provisionalResponder.js`, enviado directamente por `outbox/gate.js` (llave `reply:<inbound>`).

Antes de conectar los agentes reales, el usuario decidió (decisiones de producto, PRD §3.3 y S54):

1. **Dos niveles de autonomía:** `SUPERVISADO` (el agente propone un borrador y un humano lo aprueba, edita o rechaza) y `AUTONOMO` (envía directo, como hoy). `SUPERVISADO` por defecto.
2. **Toggle global** en esta versión; por agente, después, sin migración dolorosa.
3. **Cinco pantallas:** Pipeline (kanban de 7 etapas), Bandeja (borradores), Conversaciones (estilo WhatsApp + ContactPanel), Agentes (AgentStatsRow + AutonomyToggle) y Simulador (lead escribe → borrador → Bandeja → aprobación → enviado).
4. Los borradores se generan con **datos simulados**: sin LLM y sin WhatsApp real.

Restricciones del código actual que condicionan el diseño:

- `Message` representa mensajes **del canal**. Sus índices únicos (`externalId`, `idempotencyKey`), la línea de tiempo (`conversation, createdAt`) y las métricas del PRD §8 asumen que todo `Message` saliente salió (o intentó salir) por el gate.
- Validación: los errores de zod responden 400 en el error handler central (`middleware/errors.js`).
- No hay autenticación ni modelo de usuarios (PENDIENTES #41). `Conversation.assignedUser` es `ObjectId` sin modelo.
- `inbound.js` cambia la etapa con `contact.save()` sobre un documento leído antes: podría pisar un cambio manual concurrente.

## Alcance de la supervisión (S62)

- La autonomía (`SUPERVISADO`/`AUTONOMO`) aplica **solo a las respuestas generadas para un mensaje entrante** del lead.
- Quedan **fuera** hasta que tengan su propio ADR: los jobs y las plantillas (bienvenida B5, seguimientos A7/F4, recordatorios de visita y de renovación B6/F5). Cuando se diseñen, ese ADR decidirá si se supervisan.
- Los **avisos de escalamiento** al lead tampoco se supervisan (S61, §9).

## Decisión

### 1. Autonomía: configuración y valor inicial

- **Variable de entorno** `AGENT_AUTONOMY_DEFAULT`, validada en `config/env.js`: `z.preprocess(emptyToUndefined, z.enum(['SUPERVISADO', 'AUTONOMO']).default('SUPERVISADO'))`. El `preprocess` va igual que en `MONGODB_URI` (`config/env.js:15`), para que una variable vacía (`AGENT_AUTONOMY_DEFAULT=`) tome el valor por defecto en lugar de fallar el enum. Solo es el **valor inicial** cuando no existe documento en la base; no se consulta si hay configuración guardada.
- `server/vitest.config.js` fija `AGENT_AUTONOMY_DEFAULT: 'AUTONOMO'`. Con eso, las pruebas existentes (`simulator.test.js`, `crm.test.js`) deben pasar sin modificarse, siempre que la transición S41 reasigne el contacto devuelto por la base (§5; `simulator.test.js:39` espera `contact.stage === 'EN_CONVERSACION'` en la respuesta). Si alguna tuviera que cambiar, backend lo justifica en el commit.
- `clearTestDb` vacía solo los modelos registrados en `mongoose.models`: `Draft` y `AgentSetting` **deben exportarse en `models/index.js`** para que se registren y se vacíen. Así cada prueba arranca sin documento de autonomía, con el valor del entorno. Las pruebas nuevas **fijan el modo explícitamente** (con `PUT /api/settings/autonomy` o con el servicio).
- **Resolución** (`services/autonomy.js`, `getEffectiveAutonomy({ agent })`): documento del agente → documento global → `config.AGENT_AUTONOMY_DEFAULT`. En esta versión no se crean documentos por agente, pero la función ya recibe `agent`.

### 2. Modelo `AgentSetting` (colección `agentsettings`)

| Campo | Tipo | Notas |
|---|---|---|
| `scope` | enum `GLOBAL` \| `AGENTE` | Hoy solo `GLOBAL` |
| `agent` | String \| null | `null` para `GLOBAL`; nombre del catálogo para `AGENTE` |
| `autonomy` | enum `SUPERVISADO` \| `AUTONOMO` | requerido |
| `updatedBy` | `{ kind, ref }` | mismo formato que `AuditLog.actor` |
| timestamps | | |

Índice **único** `{ scope: 1, agent: 1 }` (un solo `GLOBAL` con `agent: null`; uno por agente en el futuro). Extenderlo por agente es agregar documentos `scope: 'AGENTE'` y un parámetro opcional `agent` en la API: sin migración. No hay datos que migrar: si no hay documento, rige el entorno.

**Escritura** (`setAutonomy`): `findOneAndUpdate({ scope: 'GLOBAL', agent: null }, { $set: { autonomy, updatedBy } }, { upsert: true, returnDocument: 'before' })`, envuelto en un reintento ante 11000. Es el mismo patrón que `withDuplicateRetry` de `inbound.js`, para que dos primeros `PUT` en paralelo no fallen. El valor previo es el del documento devuelto o, si no existía, el del entorno. Solo si cambió se escribe `AuditLog` `AUTONOMIA_CAMBIADA` `{ scope, agent, from, to }` y se emite `crm:settings`.

### 3. Modelo `Draft` (colección `drafts`, nueva)

Un borrador **no** es un estado de `Message`: mezclarlos ensuciaría la línea de tiempo, obligaría a excluir borradores en cada consulta de métricas y rompería el supuesto de que todo `Message` saliente pasó por el gate.

| Campo | Tipo | Notas |
|---|---|---|
| `conversation`, `contact` | ObjectId | requeridos |
| `inboundMessage` | ObjectId → Message | mensaje del lead que lo originó; requerido |
| `agent` | String | nombre del catálogo (hoy `respondedor-provisional`) |
| `generator` | enum `SIMULADO` \| `LLM` | hoy siempre `SIMULADO`; separa métricas futuras |
| `proposedText` | String ≤ 4096 | lo que propuso el agente; inmutable |
| `finalText` | String ≤ 4096 | **siempre se llena al aprobar**: el texto editado o, si no hubo edición, `proposedText`. Es lo que se envió o intentó enviar. `null` mientras no se apruebe |
| `edited` | Boolean | `true` si `finalText !== proposedText` (se calcula en la misma actualización atómica, §5) |
| `status` | enum (abajo) | default `PENDIENTE` |
| `decision` | enum `APROBADO` \| `RECHAZADO` \| null | decisión humana, independiente del resultado del gate |
| `reviewedBy` | `{ kind, ref }` | actor (§8) |
| `reviewedAt` | Date | |
| `rejectReason` | String ≤ 500 | requerido al rechazar |
| `blockReason` | String | `reason` del gate (`MODO_HUMANO`, `FUERA_DE_VENTANA_24H`) |
| `error` | String | excepción o fallo del canal |
| `supersededByMessage` | ObjectId → Message | mensaje entrante más reciente que lo reemplazó (`REEMPLAZADO`). Apunta al mensaje y no a otro borrador porque en modo `HUMANO` o `AUTONOMO` no se crea borrador nuevo (S60) |
| `sentMessage` | ObjectId → Message | mensaje creado por el gate |
| timestamps | | |

**Estados:** `PENDIENTE` → `ENVIANDO` → `ENVIADO` \| `BLOQUEADO` \| `FALLIDO`; `PENDIENTE` → `RECHAZADO`; `PENDIENTE` → `REEMPLAZADO`. Solo `PENDIENTE` admite acciones; todos los demás salvo `ENVIANDO` son finales. La lista completa (`PENDIENTE`, `ENVIANDO`, `ENVIADO`, `BLOQUEADO`, `FALLIDO`, `RECHAZADO`, `REEMPLAZADO`) es la que debe reflejar el PRD §5 (entidad Borrador).

**Índices:** único `{ inboundMessage: 1 }` (un borrador por mensaje entrante, idempotencia de creación); `{ status: 1, createdAt: 1 }` (cola de la Bandeja); `{ conversation: 1, status: 1 }` (reemplazo y ContactPanel); `{ agent: 1, decision: 1 }` (estadísticas).

`Message` y el gate **no cambian**: la relación es `Draft.sentMessage`.

### 4. Generador simulado

`server/src/agents/replyGenerator.js` exporta `generateReply({ isFirstMessage })` → `{ agent: 'respondedor-provisional', generator: 'SIMULADO', text }`, con los textos de `provisionalResponder.js` (sin precios, horarios, promociones, descuentos, consejos médicos ni confirmaciones de pago: regla de oro 4). Lo usan **ambos** modos. `isFirstMessage` pasa a significar "la conversación **no tiene mensajes `SALIENTE` con `deliveryStatus` `ENVIADO`, `ENTREGADO` o `LEIDO`**", es decir, el lead todavía no recibió el saludo. En `SUPERVISADO`, si el primer borrador se reemplaza, se rechaza o queda bloqueado, el siguiente borrador vuelve a saludar.

En `AUTONOMO` el comportamiento es el de hoy **salvo dos casos**: (a) una conversación que empezó en modo `HUMANO` y se devolvió a la IA recibe el saludo en su primera respuesta de agente, aunque el lead ya hubiera escrito antes (hoy recibiría el seguimiento); (b) si el primer saludo quedó `FALLIDO` o `BLOQUEADO`, la siguiente respuesta saluda otra vez. Los mensajes de personal (`USUARIO`) cuentan como salientes: si recepción ya contestó, no se saluda. Cuando llegue el LLM, su salida se valida con zod (`{ agent: enum del catálogo, text: 1..4096 }`) antes de crear el borrador.

### 5. Flujo

**Entrada.** Reparto único:
- `inbound.js` ejecuta los pasos 1 a 3: S41, reemplazo y salida si no es `IA`. Conserva y reasigna el contacto, así que `simulator.test.js:39` sigue pasando.
- `services/replies.js` → `respondToInbound({ contact, conversation, inbound })` ejecuta los pasos 4 a 6 y devuelve `{ reply, draft }`.

1. **Transición S41 atómica:** `contact = await Contact.findOneAndUpdate({ _id, stage: 'NUEVO' }, { stage: 'EN_CONVERSACION' }, { returnDocument: 'after' }) ?? contact`. Se ejecuta solo si `previousMessages > 0`, como hoy. Se **reasigna** el contacto para que la respuesta del simulador refleje la etapa, y se emite `crm:contact`. En `SUPERVISADO` el lead pasa a `EN_CONVERSACION` con su segundo mensaje entrante **aunque todavía no se haya aprobado ninguna respuesta** (S63): S41 cuenta mensajes, no intercambios entregados.
2. **Reemplazo en cualquier modo (D4, S60), antes de mirar el modo:** `replaceOlderPending({ conversation, newestInbound })` marca como `REEMPLAZADO` todos los `PENDIENTE` de la conversación con `inboundMessage < newestInbound._id`, con `supersededByMessage: newestInbound._id`. Pasa con conversación en `IA` o `HUMANO` y con cualquier autonomía.

   **Emisión por borrador:** primero busca los ids candidatos (`find({ conversation, status: 'PENDIENTE', inboundMessage: { $lt: newestInbound._id } }, { _id: 1 })`). Luego, por cada id, hace `findOneAndUpdate({ _id, status: 'PENDIENTE' }, { status: 'REEMPLAZADO', supersededByMessage }, { returnDocument: 'after' })` y emite `crm:draft` (`updated`) **solo si devuelve documento**. Así no se emite por un borrador que ganó un `approve` o un `reject` concurrente. Con el volumen del PRD (§9) bastan updates individuales en lugar de un `updateMany`.
3. Si `conversation.mode !== 'IA'`: termina aquí (no hay respuesta ni borrador).
4. `generateReply(...)` y `getEffectiveAutonomy({ agent })`.
5. `AUTONOMO`: `sendMessage` con `reply:<inbound>` y autor `{ kind: 'AGENTE', ref: agent }` (sin cambios).
6. `SUPERVISADO`: crea el `Draft` (`PENDIENTE`); si choca con el índice único (11000), toma el existente. **No envía nada.** Después vuelve a llamar a `replaceOlderPending` con el `ENTRANTE` **más reciente** de la conversación, que no necesariamente es el suyo. Esta segunda pasada resuelve la carrera de dos entrantes en paralelo:
   - **Mismo número, A anterior a B:** si B hace su pasada antes de que exista el borrador de A, A lo reemplaza él mismo al ver que el entrante más reciente es B.
   - **Resultado:** queda exactamente un `PENDIENTE`, el de B.
   - **Por qué se compara contra el entrante más reciente y no contra `_id < nuevo._id` del borrador:** este último no cubre el caso en que el borrador del mensaje anterior se crea después que el del nuevo.
   - **Orden:** se usa el `_id` de los `Message` entrantes, que el server genera en orden de llegada. Es válido con una sola instancia del server; con varias instancias habría que ordenar por `createdAt` + `_id` (PENDIENTES #98).
   - **Respuesta:** después de la segunda pasada, `respondToInbound` **vuelve a leer** el borrador (`Draft.findById`) y devuelve ese documento. Si la pasada lo dejó `REEMPLAZADO`, el simulador lo recibe así y no como `PENDIENTE`.

**Aprobar** (`services/drafts.js`, `approveDraft({ id, text, actor })`):

1. Transición atómica con **update de pipeline**, para calcular `finalText` y `edited` contra `$proposedText` en la misma operación: `findOneAndUpdate({ _id, status: 'PENDIENTE' }, [{ $set: { status: 'ENVIANDO', decision: 'APROBADO', finalText: text === undefined ? '$proposedText' : { $literal: text }, edited: text === undefined ? false : { $ne: [{ $literal: text }, '$proposedText'] }, reviewedBy, reviewedAt } }], { returnDocument: 'after', updatePipeline: true })`.
   - **`updatePipeline: true` es obligatorio:** Mongoose 9 (el proyecto usa 9.11.3) lanza "Cannot pass an array to query updates unless the `updatePipeline` option is set".
   - El `$literal` también es obligatorio: si no, un texto que empiece con `$` se interpretaría como ruta de campo.
   - **Los updates con pipeline no pasan por el casteo ni por los validadores del esquema** (por ejemplo, el `maxlength: 4096` de `finalText`). Ese límite lo garantiza **solo** zod en la ruta (`text` ≤ 4096); los timestamps sí se aplican. Ningún otro llamador debe usar `approveDraft` sin validar antes con el mismo esquema.
   - Si devuelve `null`: 404 si no existe, 409 si existe en otro estado.
2. `AuditLog` `BORRADOR_APROBADO` `{ draftId, edited }` y `crm:draft` (`ENVIANDO`).
3. `sendMessage({ conversationId, text: finalText, author: { kind: 'AGENTE', ref: draft.agent }, idempotencyKey: 'draft:<id>' })`. **El autor sigue siendo el agente**: así el gate aplica la regla de modo `HUMANO` a los mensajes de agente. Quién aprobó y si editó queda en el `Draft` y en la bitácora.
4. Resultado → `ENVIADO` con `sentMessage`, `BLOQUEADO` con `blockReason` o `FALLIDO` con `sentMessage` y `error`. Si el gate responde `DUPLICADO` (ya existía un `Message` con `draft:<id>`), el estado sale del `deliveryStatus` de ese mensaje: `ENVIADO`/`ENTREGADO`/`LEIDO` → `ENVIADO`; `FALLIDO` → `FALLIDO`; `PENDIENTE` → el borrador se queda en `ENVIANDO` (lo concilia PENDIENTES #85). Si `sendMessage` lanza una excepción, el borrador pasa a `FALLIDO` con `error`; nunca se queda en `ENVIANDO` mientras el proceso siga vivo. Emite `crm:draft`.

**Rechazar:** `findOneAndUpdate({ _id, status: 'PENDIENTE' }, { status: 'RECHAZADO', decision: 'RECHAZADO', rejectReason, reviewedBy, reviewedAt })`, `AuditLog` `BORRADOR_RECHAZADO` y `crm:draft`. **Nunca llama al gate.** No cambia el modo de la conversación: si el lead necesita respuesta, Recepción toma la conversación (C2). En esta versión, un borrador rechazado deja al lead sin respuesta **y sin alerta** que obligue a darle seguimiento (PENDIENTES #97).

### 6. Casos borde

| Caso | Decisión |
|---|---|
| Doble clic o dos usuarios aprueban a la vez | La transición atómica `PENDIENTE → ENVIANDO` deja ganar al primero; el segundo recibe 409. La llave `draft:<id>` en el gate es la segunda barrera |
| Aprobar o rechazar un borrador `RECHAZADO`, `REEMPLAZADO`, `ENVIADO`, etc. | 409 con el estado actual |
| Conversación pasa a `HUMANO` con borradores pendientes | Tomar la conversación no los toca: siguen `PENDIENTE` hasta el siguiente mensaje del lead, que los reemplaza aunque la conversación siga en `HUMANO` (D4, S60). Mientras tanto, la Bandeja muestra el aviso y deshabilita Aprobar; si se aprueba de todos modos, el gate bloquea → `BLOQUEADO` / `MODO_HUMANO` |
| Ventana de 24 h vencida antes de aprobar | No hay expiración automática. La Bandeja muestra `windowExpiresAt`; al aprobar, el gate bloquea → `BLOQUEADO` / `FUERA_DE_VENTANA_24H` |
| El lead envía otro mensaje con un borrador pendiente | En cualquier modo y con cualquier autonomía, los `PENDIENTE` anteriores pasan a `REEMPLAZADO` con `supersededByMessage` (S60). Un borrador ya en `ENVIANDO` no se toca |
| Dos mensajes entrantes en paralelo | Queda exactamente un `PENDIENTE`: el del entrante más reciente (segunda pasada de reemplazo, §5 paso 6) |
| Cambio de autonomía con borradores pendientes | Cambiar la autonomía no los toca: siguen `PENDIENTE`. Pasar a `AUTONOMO` **no** envía borradores viejos sin revisión. El siguiente mensaje del lead los reemplaza y, ya en `AUTONOMO`, se responde directo (D4) |
| Webhook duplicado | `inbound.js` ya lo descarta por `externalId`; además el índice único de `inboundMessage` impide un segundo borrador |
| Texto editado vacío (tras `trim`) o > 4096 | 400 (zod) |
| Texto editado igual al propuesto | `edited: false` |
| Caída del proceso entre `ENVIANDO` y el resultado del gate | El borrador queda en `ENVIANDO` (409 al reintentar). Lo concilia PENDIENTES #85 |
| `FALLIDO` | Final en esta versión: el gate devolvería `DUPLICADO` con la misma llave. El reintento queda pendiente (PENDIENTES #86) |

### 7. Contratos de API

Todas bajo `/api`, sin autenticación (§8). Ids: `z.string().regex(/^[a-f\d]{24}$/i)` → 400 si no cumplen. Errores con el formato actual `{ error, details? }`. **Ojo con `details`:** en los 400 de zod es un **arreglo** `[{ path, message }]` (error handler central); en los 409 y 422 de este ADR es un **objeto** (por ejemplo `{ status }` o `{ from, to }`). El cliente no debe asumir una sola forma.

**Borradores** (`routes/drafts.js`)

| Método y ruta | Entrada (zod) | Respuesta | Errores |
|---|---|---|---|
| `GET /drafts` | query `{ status: z.enum(DRAFT_STATUSES).default('PENDIENTE'), conversationId?: id, limit: z.coerce.number().int().min(1).max(200).default(50) }` | 200 `{ drafts: DraftView[], pendingCount }`. `PENDIENTE` del más antiguo al más reciente (como la cola de B3); el resto, del más reciente al más antiguo | 400 |
| `POST /drafts/:id/approve` | body `{ text?: z.string().trim().min(1).max(4096) }` | 200 `{ draft: DraftView }` en `ENVIADO`, `BLOQUEADO` o `FALLIDO` (la aprobación sí ocurrió; el cliente lee `status` y `blockReason`) | 400, 404, 409 `{ error, details: { status } }` |
| `POST /drafts/:id/reject` | body `{ reason: z.string().trim().min(1).max(500) }` | 200 `{ draft: DraftView }` | 400, 404, 409 |

`DraftView` (`serializeDraft` en `serializers.js`): `{ id, conversationId, contactId, agent, generator, inboundMessageId, proposedText, finalText, edited, status, decision, reviewedBy, reviewedAt, rejectReason, blockReason, error, supersededByMessageId, sentMessageId, createdAt, updatedAt, context: { contact: { id, name, phone, stage }, conversationMode, inboundText, windowExpiresAt } }`. `windowExpiresAt = contact.lastInboundAt + 24 h`.

**Autonomía** (`routes/settings.js`)

| Método y ruta | Entrada | Respuesta | Errores |
|---|---|---|---|
| `GET /settings/autonomy` | — | 200 `{ scope: 'GLOBAL', autonomy, source: 'CONFIGURACION' \| 'ENTORNO', updatedBy, updatedAt }`. Con `source: 'ENTORNO'` (no hay documento), `updatedBy` y `updatedAt` valen `null` | — |
| `PUT /settings/autonomy` | body `{ autonomy: z.enum(['SUPERVISADO', 'AUTONOMO']) }` (después se agregará `agent?` opcional) | 200, misma forma. Upsert con reintento ante 11000 (§2). Si el valor no cambia, no audita ni emite | 400 |

**Agentes** (`routes/agents.js`, catálogo fijo en `agents/catalog.js`)

`GET /agents`, query `{ from?, to? }` (formato en "Contactos"). Respuesta 200:
`{ autonomy: <GET /settings/autonomy>, agents: [{ name, label, description, connected, autonomy, stats }] }`.
Catálogo: `router`, `info`, `ventas`, `pagos` (`connected: false` hasta PENDIENTES #40) y `respondedor-provisional` (`connected: true`). `stats` por agente:

| Campo | Definición |
|---|---|
| `sent` | `Message` `SALIENTE`, `author.kind = 'AGENTE'`, `author.ref = name`, `deliveryStatus` ∈ `ENVIADO`/`ENTREGADO`/`LEIDO` |
| `pending` | `Draft` `PENDIENTE` |
| `approved` | `Draft` con `decision = 'APROBADO'` (aunque luego el gate bloqueara) |
| `edited` | `approved` con `edited = true` |
| `rejected` | `decision = 'RECHAZADO'` |
| `approvalRateUnedited` | `(approved − edited) / (approved + rejected)`; `null` si el denominador es 0 |
| `avgApprovalMs` | promedio de `reviewedAt − createdAt` de los aprobados; `null` si no hay |

Los `REEMPLAZADO` no cuentan como decisión. El rango filtra por `createdAt`.

**Contactos** (`routes/crm.js`)

- `GET /contacts`: query `{ stage?, source?: z.enum(SOURCE_TYPES), preferredSchedule?: z.enum(PREFERRED_SCHEDULES), from?, to? }`. `from` y `to` son `YYYY-MM-DD` (`z.iso.date()`), días completos en `America/Mexico_City` convertidos a UTC sobre `createdAt` (S64); `from > to` → 400. Sigue el tope de 200. La forma de la respuesta no cambia.
- `PATCH /contacts/:id/stage`: body `{ stage: z.enum(STAGES), fromStage?: z.enum(STAGES), reason?: z.string().trim().min(1).max(500) }`. Reglas (S55), en `services/stages.js` (`assertManualTransition(from, to, reason)`):

  | Origen | Destino permitido | Resto |
  |---|---|---|
  | `NUEVO`, `EN_CONVERSACION`, `VISITA_AGENDADA`, `VISITO`, `PERDIDO` | `NUEVO`, `EN_CONVERSACION`, `VISITA_AGENDADA`, `VISITO`, `PERDIDO` | — |
  | `PAGO_EN_REVISION` | solo `PERDIDO`, con `reason` **obligatorio** | 422 |
  | `SOCIO` | ninguno | 422 |

  - **Precedencia** (se evalúa en este orden y la primera que aplica responde):
    0. Id o body inválido (zod: etapa desconocida, `reason` vacío o > 500) → 400.
    1. Contacto inexistente → 404.
    2. `fromStage` enviado y distinto de la etapa actual → 409.
    3. Misma etapa que la actual → 200 `{ contact, changed: false }`, sin auditar (por ejemplo, `SOCIO → SOCIO` da 200 sin cambios).
    4. Transición no permitida por la tabla → 422.
    5. `PAGO_EN_REVISION → PERDIDO` sin `reason` → 422.
    6. Actualización atómica; si devuelve `null` (cambio concurrente) → 409.
  - Destino `PAGO_EN_REVISION` o `SOCIO` → **422** ("Esta etapa solo cambia con el flujo de pagos"): el valor es válido, la regla de negocio lo prohíbe (regla de oro 3, PRD B2–B4). Salir de `SOCIO` → 422 (S55): en esta versión ninguna acción manual saca a un socio de su etapa. Las transiciones con autorización por rol quedan en PENDIENTES #50. Desde `PAGO_EN_REVISION`, cualquier destino distinto de `PERDIDO` → 422.
  - **`PAGO_EN_REVISION → PERDIDO` sin `reason` → 422** ("Indica el motivo para marcar como perdido un lead con pago en revisión"). No es 400 porque el body es válido por sí mismo: la obligación depende de la etapa actual, que solo conoce el servidor.
  - **El motivo es obligatorio solo en `PAGO_EN_REVISION → PERDIDO` y opcional en todos los demás movimientos permitidos.** Si se envía en otro movimiento, se guarda en la bitácora; si no, se omite. En una petición a la misma etapa se ignora.
  - `fromStage` desactualizado → 409 (otro usuario ya lo movió). La regla se evalúa sobre la etapa leída y la actualización es atómica sobre esa misma etapa (`findOneAndUpdate({ _id, stage: from }, { stage }, { returnDocument: 'after' })`). Así, un lead que pasa a `SOCIO` entre la lectura y la escritura nunca se mueve.
  - Cambio → 200 `{ contact, changed: true }`, `AuditLog` `CONTACTO_ETAPA_CAMBIADA` `{ contactId, from, to, reason? }` y `crm:contact`.
  - Mientras no exista el modelo Pago, `PAGO_EN_REVISION → PERDIDO` solo cambia la etapa. Cuando exista, esta transición deberá resolver en el mismo flujo el Pago `EN_REVISION` del lead (rechazarlo o cancelarlo con el motivo; **nunca** confirmarlo) y cerrar su escalamiento `PAGO` (PENDIENTES #96).
- **Inconsistencia del PRD E1:** menciona `No asistió` como etapa, pero es un estado de **Cita** (PRD §5). No se agrega a `STAGES`: un lead que no asistió se queda en `VISITA_AGENDADA` o se mueve a mano a `EN_CONVERSACION` o `PERDIDO`.

**Handoff C2** (`routes/conversations.js`; **contrato para una fase posterior**, fase 9)

| Método y ruta | Entrada | Respuesta | Errores |
|---|---|---|---|
| `POST /conversations/:id/take` | — | 200 `{ conversation, changed }`; pasa a `HUMANO` de forma atómica. Ya en `HUMANO` → `changed: false` | 400, 404 |
| `POST /conversations/:id/release` | — | 200 `{ conversation, changed }`; pasa a `IA` | 400, 404 |
| `POST /conversations/:id/messages` | body `{ text: z.string().trim().min(1).max(4096), clientMessageId: z.uuid() }` | 201 `{ status: 'ENVIADO', message }`; 200 si `DUPLICADO` | 400, 404, 409 si la conversación no está en `HUMANO`, 409 `{ reason }` si el gate bloquea, 502 si `FALLIDO` |

El mensaje humano sale por el gate con `author: actor` (`USUARIO`) y la llave `human:<conversationId>:<clientMessageId>` (doble clic). `take` y `release` auditan `CONVERSACION_TOMADA` y `CONVERSACION_DEVUELTA` y emiten `crm:conversation`. `assignedUser` se queda en `null` hasta que exista el modelo de usuarios; el actor queda en la bitácora. Fuera de la ventana, el gate bloquea (S43; plantillas en PENDIENTES #42).

**Simulador** (`POST /api/simulator/messages`, cambio compatible): se agrega `draft: DraftView | null`. En `SUPERVISADO`: `reply: null` y `draft` con el borrador. En `AUTONOMO`: `draft: null` y `reply` como hoy. `reply: null` ya ocurría en modo `HUMANO`, así que el cliente actual no se rompe; la respuesta aprobada llega después por `simulator:outbound`.

### 8. Actor provisional (sin autenticación)

Un middleware `server/src/middleware/actor.js` asigna `req.actor = { kind: 'USUARIO', ref: 'recepcion-provisional' }` (constante). No se lee ningún header: un header cliente daría una falsa sensación de identidad. **No es seguridad**: cualquiera con acceso a la red puede aprobar, rechazar, mover etapas o cambiar la autonomía. Al implementar la autenticación (PENDIENTES #41), el middleware toma el usuario de la sesión, `ref` pasa a ser su id y `PUT /settings/autonomy` queda solo para `ADMIN`.

### 9. Bandeja de borradores frente a la bandeja de escalamientos

Son cosas distintas:

- **Borrador:** control de calidad de una respuesta que el agente **sí** sabe dar; existe solo en `SUPERVISADO` y la IA sigue activa.
- **Escalamiento** (PRD §3.2, §6.1, C1): el agente **no** debe responder (fuera de conocimiento, queja, solicitud de humano, pago) y, salvo `PAGO`/`TRAMITE_RECEPCION`, se pausa.

La pantalla **Bandeja** tendrá pestañas: **Borradores** (ahora) y **Escalamientos** (cuando exista el modelo `Escalation`, con su propio ADR). Reglas:

- Un borrador no crea ni cierra escalamientos.
- Aprobar o rechazar no cuenta como "intervención humana" en las métricas del §8.
- **Los avisos de escalamiento no pasan por supervisión (D5, S61).** Crear un escalamiento nunca requiere aprobación. El aviso al lead ("una persona del equipo te contestará") sale **directo por el gate**, con autor `AGENTE`, **antes** de pausar la IA o pasar la conversación a `HUMANO`; si no, el gate lo bloquearía por `MODO_HUMANO`.
- **`EMERGENCIA` sale siempre de inmediato**, sin importar la autonomía.
- Lo implementa el ADR de escalamientos (PENDIENTES #47). Este ADR solo fija que la autonomía no aplica a esos avisos.

### 10. Eventos de Socket.IO

| Evento | Cuándo | Payload |
|---|---|---|
| `crm:draft` | Creación y cada cambio de estado | `{ action: 'created' \| 'updated', draft: DraftView }` |
| `crm:contact` | `PATCH` de etapa y transición S41 | `{ contact: serializeContact, change: { field: 'stage', from, to, reason: string \| null } }` (`reason` solo viene en cambios manuales con motivo; en S41 es `null`) |
| `crm:conversation` | `take` / `release` | `{ conversation: serializeConversation }` |
| `crm:settings` | Cambio de autonomía | `{ autonomy: <forma de GET /settings/autonomy> }` |
| `crm:message`, `simulator:outbound` | Sin cambios | Igual que hoy |

### 11. Reglas de oro

1. **Salida única:** aprobar llama a `outbox/gate.js`; rechazar, reemplazar y crear borradores no envían nada. Ninguna ruta ni servicio nuevo importa `channels/` (lo verifica `outbox-rule.test.js`).
2. **Supuestos y pendientes:** registrados en [SUPUESTOS](../SUPUESTOS.md) S54–S64 y [PENDIENTES](../PENDIENTES.md) #84–#98.
3. **Pagos:** nada en este ADR confirma pagos. `PATCH` de etapa prohíbe mover a `PAGO_EN_REVISION` o a `SOCIO` y salir de `SOCIO`. La única salida manual de `PAGO_EN_REVISION` es `PERDIDO`, con motivo obligatorio y auditado; nunca acerca al lead a `SOCIO`. Con el modelo Pago, esa transición resolverá el pago sin confirmarlo.
4. **Base de conocimiento:** el generador simulado no contiene datos comerciales; la edición humana es responsabilidad del humano y queda auditada.
- **Idempotencia:** índice único por `inboundMessage`, transición atómica de estado y llave `draft:<id>` en el gate.

## Pruebas que debe escribir backend

- **Rechazar nunca envía:** tras `reject`, 0 `Message` `SALIENTE` y ningún `simulator:outbound`.
- **Aprobar es idempotente:** dos `approve` en paralelo → un 200 y un 409, y un solo `Message` con `idempotencyKey: 'draft:<id>'`.
- **Editar envía `finalText`:** el `Message` lleva el texto editado, `edited: true` y `proposedText` intacto. Aprobar sin `text`: `finalText === proposedText` y `edited: false`; con un `text` igual al propuesto, `edited: false`; con un `text` que empieza con `$`, se guarda literal.
- **DUPLICADO del gate:** con un `Message` `draft:<id>` ya existente, el borrador toma su estado (`ENVIADO` → `ENVIADO`, `FALLIDO` → `FALLIDO`, `PENDIENTE` → se queda `ENVIANDO`).
- **Modo `HUMANO`:** aprobar un borrador de una conversación que pasó a `HUMANO` → `BLOQUEADO` / `MODO_HUMANO` y 0 mensajes.
- **Ventana vencida:** `lastInboundAt` de hace más de 24 h → `BLOQUEADO` / `FUERA_DE_VENTANA_24H`.
- **SUPERVISADO no envía al recibir:** `POST /simulator/messages` → `reply: null`, `draft` `PENDIENTE` y solo el `Message` entrante.
- **AUTONOMO:** las pruebas actuales pasan sin modificación (incluida `simulator.test.js:39`, que depende de la reasignación del contacto en S41) y una prueba explícita fija `AUTONOMO` con `PUT`.
- **`isFirstMessage`:** si el primer saludo quedó `FALLIDO`, la siguiente respuesta vuelve a saludar; una conversación devuelta desde `HUMANO` sin salientes entregados recibe el saludo.
- **S41 en SUPERVISADO:** el segundo entrante deja al contacto en `EN_CONVERSACION` (en la base y en la respuesta) aunque no se haya aprobado ningún borrador.
- **Generador:** determinista; sin `$`, dígitos, `precio|costo|mxn|pesos`, `pago|confirmad|descuento|promoci` ni `dieta|lesi[oó]n|suplement|m[eé]dic` (mismo patrón que `responder.test.js:13-21`).
- **Reemplazo:** un segundo mensaje deja el primer borrador `REEMPLAZADO` con `supersededByMessage`; aprobarlo → 409.
- **Reemplazo en cualquier modo (S60):** con un borrador `PENDIENTE` y la conversación en `HUMANO`, un nuevo entrante lo deja `REEMPLAZADO` y no crea borrador. Lo mismo tras cambiar a `AUTONOMO`, donde además se envía la respuesta directa.
- **Carrera:** dos `POST /simulator/messages` del mismo número en paralelo (en `SUPERVISADO`) → exactamente un `PENDIENTE`, el del entrante más reciente.
- **Carrera determinista (prueba de servicio):** se fuerza el orden llamando directamente a los servicios.
  1. Se crean los entrantes A y B (B posterior).
  2. Se ejecuta la pasada de B (crea su borrador y su segunda pasada) **antes** de crear el borrador de A.
  3. Se crea el borrador de A y se ejecuta su segunda pasada.

  Resultado esperado: A queda `REEMPLAZADO` con `supersededByMessage = B`, B queda `PENDIENTE`, la lectura que devuelve `respondToInbound` para A trae `REEMPLAZADO`, y `crm:draft` se emite una sola vez por el reemplazo de A.
- **Reemplazo frente a `approve` concurrente:** si un candidato ya pasó a `ENVIANDO`, no se marca `REEMPLAZADO` ni se emite su `crm:draft` de reemplazo.
- **Límite del pipeline:** `approve` con `text` de 4097 caracteres → 400 (lo detiene zod, porque el update con pipeline no valida `maxlength`).
- **`AGENT_AUTONOMY_DEFAULT=''`:** `config.test.js` verifica que toma `SUPERVISADO`. `GET /settings/autonomy` sin documento → `source: 'ENTORNO'`, `updatedBy: null` y `updatedAt: null`.
- **Duplicado:** reintento con el mismo `externalId` → un solo borrador.
- **409:** aprobar un `RECHAZADO`; rechazar un `ENVIADO`. **400:** texto vacío, de 4097 caracteres, `reason` vacío e id inválido. **404:** id inexistente.
- **Autonomía:** valor inicial del entorno (`source: 'ENTORNO'`), `PUT` persiste y audita, `PUT` con el mismo valor no audita, valor inválido → 400. Dos primeros `PUT` en paralelo responden 200, dejan un solo documento y, si el valor cambió respecto al entorno, un solo `AUTONOMIA_CAMBIADA`. Los borradores pendientes siguen `PENDIENTE` tras cambiar a `AUTONOMO`. `config.test.js`: default `SUPERVISADO` y valor inválido rechazado.
- **Etapas:** `PATCH` a `SOCIO` y a `PAGO_EN_REVISION` → 422 sin cambios ni bitácora; desde `SOCIO` a cualquier etapa (incluida `PERDIDO`) → 422; `PAGO_EN_REVISION → PERDIDO` con motivo → 200 y `AuditLog` con `{ contactId, from, to, reason }`; la misma transición sin motivo (o con motivo vacío tras `trim`) → error (422 sin motivo, 400 vacío) y la etapa no cambia; `PAGO_EN_REVISION → VISITO` → 422; `EN_CONVERSACION → PERDIDO` sin motivo → 200 y con motivo → `reason` en la bitácora; a `VISITO` → 200 y `AuditLog` con `from`/`to`; `fromStage` desactualizado → 409; etapa inválida o `reason` de 501 caracteres → 400. **Precedencia:** id mal formado o `stage` desconocida → 400 antes de buscar el contacto; id inexistente con body prohibido → 404; `fromStage` desactualizado hacia `SOCIO` → 409 (no 422); `SOCIO → SOCIO` → 200 `changed: false` sin bitácora; `PAGO_EN_REVISION → VISITO` sin motivo → 422 por la transición (no por el motivo).
- **Filtros de contactos:** `source`, `preferredSchedule`, `from`/`to` (límite del día en `America/Mexico_City`) y `from > to` → 400.
- **Agentes:** catálogo con 5 entradas; las estadísticas cuadran con un escenario fijo (aprobado sin editar, editado, rechazado, reemplazado).

## Tareas

**Backend (`server/`)**

1. `config/env.js` (`AGENT_AUTONOMY_DEFAULT`), `vitest.config.js` (`AUTONOMO`) y `config.test.js`.
2. Modelos `Draft` y `AgentSetting` con sus índices, exportados en `models/index.js` con sus enums (obligatorio para que `clearTestDb` los vacíe).
3. `agents/catalog.js`, `agents/replyGenerator.js`, `services/autonomy.js`, `services/replies.js`, `services/drafts.js`, `services/stages.js` (reglas de transición manual, S55) y `serializeDraft`.
4. `inbound.js`, en el orden de §5: transición S41 con `findOneAndUpdate` y reasignación del contacto (`crm:contact`), reemplazo de pendientes en cualquier modo, salida si no es `IA`, y delegación en `respondToInbound` (con `isFirstMessage` por salientes entregados y segunda pasada de reemplazo).
5. Rutas `drafts.js`, `settings.js`, `agents.js` y, en la fase 9, `conversations.js`; extender `crm.js` (filtros y `PATCH`); `middleware/actor.js`; montarlas en `app.js`.
6. `POST /simulator/messages`: campo `draft`.

**Frontend (`client/`)**

1. Navegación con cinco rutas (`/pipeline`, `/bandeja`, `/conversaciones`, `/agentes`, `/simulador`; `/` muestra Pipeline), sin librería de ruteo nueva; el detalle se selecciona con query string (`?contacto=<id>`).
2. **Pipeline:** kanban de 7 columnas con filtros (origen, horario y fechas). Mover con un selector "Mover a…" en la tarjeta (usable en el celular, PRD §9); arrastrar y soltar con HTML5 es opcional. Las columnas `Pago en revisión` y `Socio` no aceptan destino. Las tarjetas de `Socio` no se mueven. Las de `Pago en revisión` solo ofrecen "Mover a Perdido", con un campo de motivo obligatorio (≤ 500) antes de confirmar. Al mover a `Perdido` desde otras etapas, el motivo es opcional. Envía `fromStage` y, ante 409/422, muestra el aviso y recarga. Escucha `crm:contact`.
3. **Bandeja:** pestaña Borradores (Escalamientos visible como "Próximamente"), contador de pendientes, tarjeta con mensaje del lead, propuesta, agente, antigüedad y vencimiento de la ventana. Aprobar, Editar (textarea ≤ 4096) y Rechazar (motivo obligatorio). Deshabilita botones durante la petición y si la conversación está en `HUMANO` o la ventana venció. Muestra el resultado `BLOQUEADO`/`FALLIDO` y maneja 409. Escucha `crm:draft`.
4. **Simulador:** con `draft` en la respuesta, muestra "Respuesta pendiente de aprobación en la Bandeja" (enlace); escucha `crm:draft` para mostrar rechazo, reemplazo o bloqueo. La respuesta aprobada llega por `simulator:outbound`. Muestra el modo de autonomía vigente.
5. **Conversaciones:** reutiliza `Crm.jsx` con burbujas estilo WhatsApp y ContactPanel (datos, etapa, origen, modo y borrador pendiente vía `GET /drafts?conversationId=`). En la fase 9: Tomar, Devolver y caja de respuesta (con `clientMessageId` por envío).
6. **Agentes:** AutonomyToggle global (con confirmación al pasar a `AUTONOMO`) y una AgentStatsRow por agente del catálogo, con "Sin conectar" en los no conectados. Escucha `crm:settings`.

## Fases de implementación

Cada fase es un commit pequeño con su revisión: (1) navegación; (2) Pipeline de lectura con filtros; (3) `PATCH` de etapa + UI de mover; (4) `Draft` + generador + `inbound` + `GET /drafts` + autonomía con entorno; (5) `approve`/`reject`; (6) UI Bandeja; (7) Simulador con borradores; (8) Conversaciones + ContactPanel; (9) handoff C2; (10) `GET /agents` + `PUT /settings/autonomy` + pantalla Agentes. La fase 4 incluye `GET/PUT /settings/autonomy` en el server para que las pruebas fijen el modo; la UI del toggle llega en la 10.

## Consecuencias

- (+) Se ejercita el ciclo completo de supervisión (y sus métricas) antes de conectar el LLM, sin riesgo para leads reales.
- (+) Gate y `Message` no cambian; la regla de oro 1 se sigue verificando igual.
- (+) Extender a autonomía por agente solo agrega documentos y un parámetro.
- (−) En `SUPERVISADO`, la meta de primera respuesta (PRD §8, p95 < 60 s, 24/7) **no se cumple**: depende de que haya alguien aprobando, y de noche los borradores pueden vencer la ventana de 24 h. La métrica debe reportarse separada por modo.
- (−) `AUTONOMO` cambia ligeramente respecto a hoy en el saludo (§4: conversaciones devueltas desde `HUMANO` y primer saludo fallido o bloqueado).
- (−) Un borrador rechazado deja al lead sin respuesta y sin alerta (PENDIENTES #97).
- (−) Un mensaje editado por un humano queda con autor `AGENTE`; la trazabilidad depende del `Draft` y de la bitácora.
- (−) Sin autenticación, cualquiera en la red puede aprobar, cambiar la autonomía o marcar como perdido un lead con pago en revisión (PENDIENTES #41).
- (−) Hasta que exista el modelo Pago, `PAGO_EN_REVISION → PERDIDO` puede dejar un comprobante sin resolver fuera del pipeline. Con el modelo Pago, la transición deberá resolver ese pago (nunca confirmarlo) y su escalamiento (PENDIENTES #96, S55).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Borrador como estado de `Message` (`deliveryStatus: 'BORRADOR'`) | Mezcla mensajes que nunca salieron con los del canal: rompe la línea de tiempo, obliga a filtrar en cada métrica y choca con la llave `reply:<inbound>` |
| Autor `USUARIO` (el aprobador) en el mensaje enviado | El gate dejaría de bloquear en modo `HUMANO` los mensajes que en realidad redactó un agente |
| Autonomía solo en variable de entorno | No se puede cambiar desde la pantalla Agentes sin redeploy |
| Reemplazar solo los `PENDIENTE` con `_id` menor que el del borrador nuevo | No cubre el caso en que el borrador del mensaje anterior se crea después que el del nuevo; se compara contra el entrante más reciente (§5) |
| Reemplazar pendientes solo en `IA`/`SUPERVISADO` | En `HUMANO` o tras pasar a `AUTONOMO` quedarían borradores obsoletos aprobables; decisión del usuario D4 (S60) |
| Supervisar también los avisos de escalamiento | Un aviso de `EMERGENCIA` o de "te contestará una persona" no puede esperar a que alguien apruebe; decisión del usuario D5 (S61) |
| Expirar o descartar borradores automáticamente al tomar la conversación o al vencer la ventana | Más estados y un job nuevo; el gate ya bloquea con el motivo correcto. Se reevalúa con datos de uso |
| Generador simulado por intención (atribuir a `ventas`, `pagos`, etc. según palabras clave) | Inflaría estadísticas de agentes que no existen y aumenta el riesgo de textos con datos comerciales sin base de conocimiento |
| Prohibir toda salida manual de `PAGO_EN_REVISION` | Decisión del usuario (S55): un lead con comprobante en revisión puede desistir; se permite solo `PERDIDO`, con motivo obligatorio y auditado |
| 400 cuando falta `reason` en `PAGO_EN_REVISION → PERDIDO` | El body es válido por sí solo; la obligación depende de la etapa actual del servidor, así que es una regla de negocio (422) |
| 409 para etapas prohibidas | 409 se reserva para conflictos de concurrencia (`fromStage`, estado del borrador); la etapa prohibida es una regla de negocio fija (422) |
| Identificar al actor con un header `X-Actor` | Da apariencia de identidad sin serlo; la constante deja claro que es provisional |
