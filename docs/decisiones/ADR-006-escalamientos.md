# ADR-006 — Escalamientos: modelo, tipos, pausa, avisos al lead, bloqueo de contactos y auditoría de envíos

| Campo | Valor |
|---|---|
| Estado | Propuesto; paso 1 autorizado el 2026-11-06 (resto pendiente) |
| Fecha | 2026-11-06 |
| Relacionado | [PRD](../PRD.md) §3.1, §3.2, §3.3, §5, §6.1, F3, C1, C2, C3, §8 · [ADR-003](ADR-003-bandeja-borradores-autonomia.md) §5, §6, §7 (handoff C2), §9, §10 · [ADR-004](ADR-004-capa-llm.md) · [ADR-005](ADR-005-orquestador-agentes.md) · [SUPUESTOS](../SUPUESTOS.md) S3, S43, S48, S58–S62, S72, S73 · [PENDIENTES](../PENDIENTES.md) #41, #47, #48, #85, #91, #96, #97 · CLAUDE.md (reglas de oro 1, 3 y 4) |
| Cierra el diseño de | #47 (modelo Escalamiento y sus 6 tipos) y #91 (pestaña Escalamientos) |
| No resuelve | #101, #107, #110, #118, #119, #120 (decisiones del usuario) |
| Requisito NO cumplido tras la implementación base | **El bloqueo de contactos y el aviso de `EMERGENCIA` sobre un contacto bloqueado quedan fuera del alcance base (sección «Fuera del alcance base: bloqueo de contactos») y todavía NO estarán cumplidos.** S61 sigue vigente solo para los contactos no bloqueados |
| Decisiones del usuario (2026-11-06) | **Ratificadas:** `Escalation` separada del `Draft` como representación de «requiere humano»; autonomía inicial `SUPERVISADO`; umbral 0.5; aprobar no cambia la etapa (**diferencia declarada:** el punto literal del checkpoint del maestro «aprobar cambia etapa» **NO se cumple**); `AGENT_RUNTIME=SIMULADO` por defecto (ADR-005). **Sigue pendiente:** (a) bloqueo frente a `EMERGENCIA` (A/B/C) y detección en contactos bloqueados (sección propia, abajo). Ver «Diferencias con el maestro y acuerdos vigentes» |
| Alcance autorizado | **Solo el paso 1** del orden global (piezas puras de ADR-005, entregas 1a–1d; ver ADR-005 «Alcance autorizado: paso 1»). De este ADR, el paso 1 solo crea `agents/escalationTypes.js` y `agents/noticeTexts.js` con sus pruebas. Los pasos 2 a 8 (modelos, gate, servicio de escalamientos, rutas, UI) **no están autorizados**. El paso 1 no acredita por sí solo ningún punto del checkpoint |

## Contexto

El PRD define seis tipos de escalamiento (§3.2) y la regla de oro 3 y el PRD §3.1 exigen que un humano intervenga en pagos, dudas fuera de conocimiento, quejas, negociación y solicitudes de persona. El ADR-003 §9 fijó que los avisos de escalamiento **no** pasan por la supervisión y salen directo por el gate antes de pausar, y dejó la pestaña «Escalamientos» como «Próximamente».

Estado verificado en el código (2026-11-06), **no se supone que lo aceptado esté implementado**:

- No existe el modelo `Escalation`; `models/index.js` exporta `Contact`, `Conversation`, `Message` y `AuditLog`. Tampoco existen `Draft`, `services/replies.js`, las rutas de tomar/devolver (ADR-003 fase 9) ni `crm:escalation`.
- `outbox/gate.js` (`sendMessage({ conversationId, text, author, idempotencyKey, now })`): devuelve `DUPLICADO` **sin auditar**; bloquea a `AGENTE` en modo `HUMANO` (`MODO_HUMANO`) y todo envío si `lastInboundAt` falta o tiene más de 24 h (`FUERA_DE_VENTANA_24H`); audita `MENSAJE_BLOQUEADO`, `MENSAJE_ENVIADO` y `MENSAJE_FALLIDO`. Los bloqueados **no** crean `Message`. No tiene noción de bloqueo de contacto, de propósito del envío ni comprueba aprobación: quien llama al gate con autor `AGENTE` lo envía. El gate actual **ignora** las propiedades que no conoce (`purpose`, `ref`), de modo que los servicios pueden empezar a pasarlas antes de que el gate las use.
- `Contact` no tiene campos de bloqueo ni de exclusión comercial (#48). `AuditLog` no tiene índices de consulta.
- `agents/registry.js` ya declara los tipos permitidos por agente en `escalations` (S73 y los prompts los usan). `recepcion` no escala `PAGO` ni `TRAMITE_RECEPCION`.
- Los textos fijos existen en `docs/negocio/playbook-ventas.md`: §2 («Con gusto voy a canalizar tu consulta con nuestro equipo de recepción…», marcado `[CONFIRMAR]`), §6 (aviso del 911 de `EMERGENCIA` y «fuera del horario de recepción») y §8.5 (privacidad, `[PENDIENTE]`). Los marcadores se conservan.

## Alcance

- **Dentro (alcance base):** modelo y servicio `Escalation` con su registro de procesamiento, reglas de pausa, aviso al lead, incidente sistémico con cierre manual, API y eventos, la pestaña Escalamientos, el endurecimiento del gate (propósito y `ref`, aprobación comprobada fail-closed con lectores inyectables, «no iniciar contacto sin entrante previo» conservado y probado, auditoría de los cuatro resultados y `GET /audit/outbound`) y sus pruebas.
- **Fuera del alcance base (propuesta sin aprobar, condicionada a la decisión (a)):** bloqueo de contactos, `CONTACTO_BLOQUEADO` en el gate y la excepción/detección de `EMERGENCIA` sobre contactos bloqueados (sección «Fuera del alcance base: bloqueo de contactos»). **El requisito de bloqueo todavía NO estará cumplido tras la implementación base; S61 sigue vigente para contactos no bloqueados.**
- **Pospuesto (pendiente posterior):** auto-recuperación del incidente sistémico; el motivo separado `SIN_ENTRANTE_PREVIO` (el bloqueo sin entrante previo sí está en la base, §5); panel de auditoría de envíos en la UI.
- **Fuera:** notificaciones al personal por WhatsApp y email, y la alerta sonora configurable (PRD C1; dependen de plantillas #13, proveedor de email #18 y números del staff #19); el flujo de Pagos (#96 se cubre solo en lo que toca a `Escalation`); la exclusión comercial para seguimientos (#48, distinta del bloqueo); jobs; todo lo condicionado a la decisión pendiente (a).
- **Alcance mínimo del checkpoint académico:** borrador → aprobación → simulador; solicitud de persona → `Escalation` + «Requiere humano»; `AuditLog` de envíos y bloqueos. Lo demás de este ADR se implementa solo después y en el orden global. La evidencia de estos puntos se separa en tres niveles (evals del agente, pruebas de integración y demostración manual; [ADR-005](ADR-005-orquestador-agentes.md) §10.2): las pruebas de este ADR son **nivel 2** (ver «Cobertura del checkpoint»).

## Decisión

### 1. Modelo `Escalation` (colección `escalations`) y registro de procesamiento

`models/Escalation.js`; el catálogo de tipos vive en `agents/escalationTypes.js` (módulo puro compartido con el orquestador, ADR-005, y con `agents.test.js`).

| Campo | Tipo | Notas |
|---|---|---|
| `conversation`, `contact` | ObjectId | requeridos |
| `inboundMessage` | ObjectId → Message | mensaje del lead que **originó** el escalamiento; requerido |
| `type` | enum de 6 | `SOLICITUD_HUMANO`, `QUEJA_NEGOCIACION`, `FUERA_DE_CONOCIMIENTO`, `PAGO`, `TRAMITE_RECEPCION`, `EMERGENCIA` |
| `priority` / `priorityRank` | enum / 0–2 | `CRITICA`(0), `ALTA`(1), `NORMAL`(2); se guarda `priorityRank` para ordenar |
| `status` | enum | `ABIERTO` (default), `EN_PROCESO`, `RESUELTO` (valores del PRD §5) |
| `pausesAI` | Boolean | si **este** escalamiento pausó (o debía pausar) la IA; se guarda porque depende del tipo **y** de la causa |
| `source` | enum `AGENTE` \| `SISTEMA` | `SISTEMA`: umbral de confianza, salida inválida, proveedor, destino inexistente, ciclo o configuración (ADR-005 §5) |
| `cause` | enum \| null | `CONFIANZA_BAJA`, `SALIDA_INVALIDA`, `PROVEEDOR`, `DESTINO_INEXISTENTE`, `CICLO`, `CONFIGURACION`, `TIMEOUT_TURNO`; `null` si lo escaló un agente |
| `agent`, `trail` | String, [String] | agente final y cadena de agentes del turno (`['recepcion','ventas']`) |
| `reason` | String ≤ 300 | `handoff.reason` o texto fijo del sistema |
| `summary` | String ≤ 300 | `notes` del agente (resumen para Recepción, PRD C1) |
| `draft` | ObjectId → Draft \| null | borrador del mismo turno (p. ej. `TRAMITE_RECEPCION` con respuesta); informativo |
| `occurrences`, `lastInboundMessage` | Number (≥1), ObjectId | **derivados** del registro de procesamiento (abajo): `occurrences` = cantidad de registros de esta escalación y `lastInboundMessage` = el más reciente. Valen más de 1 **solo en el incidente sistémico** (único caso que fusiona); en los demás tipos son 1 y el propio entrante. Se actualizan solo tras una inserción nueva exitosa en el registro y se pueden recalcular (reconciliación). **No hay arreglo de mensajes absorbidos ni tope** |
| `dedupeKey` | String \| undefined | **solo** el incidente sistémico: `<conversationId>:SISTEMICA`, mientras esté abierto (`ABIERTO`/`EN_PROCESO`). `PAGO`, `TRAMITE_RECEPCION` y los tipos que pausan **no tienen** `dedupeKey` (una `Escalation` por entrante); ver «Identidad de los incidentes» e índices |
| `notice` | `{ kind, status, reason, message, attemptedAt }` | aviso al lead (§2). `kind`: `AVISO_FIJO`, `EMERGENCIA`, `NINGUNO`. `status`: `NO_APLICA`, `PENDIENTE`, `ENVIADO`, `BLOQUEADO`, `FALLIDO`, `DUPLICADO`. `reason`: motivo del gate o error (≤ 300). `message`: `Message` del aviso |
| `pausedAt` | Date \| null | cuándo pasó la conversación a `HUMANO` por este escalamiento |
| `takenBy`, `takenAt` | `{ kind, ref }`, Date | quién lo tomó (`EN_PROCESO`) |
| `resolvedBy`, `resolvedAt`, `resolvedVia`, `resolutionNote` | actor, Date, enum `MANUAL` \| `DEVOLUCION`, String ≤ 500 | `AUTO_RECUPERACION` **no existe** en el alcance base (pospuesta, ver «Pendientes») |
| timestamps | | |

**Registro de procesamiento: `EscalationInbound` (colección `escalation_inbounds`).** Un documento por mensaje entrante procesado por el servicio de escalamientos. Es la **autoridad de idempotencia**.

| Campo | Tipo | Notas |
|---|---|---|
| `escalation` | ObjectId → Escalation | el escalamiento que originó o absorbió el entrante (puede preasignarse, ver el orden de operaciones; `REPETICION` solo existe para el incidente sistémico) |
| `conversation`, `inboundMessage` | ObjectId | requeridos |
| `type` | enum de 6 | tipo solicitado para ese entrante |
| `role` | `ORIGEN` \| `REPETICION` | `ORIGEN` creó la escalación; `REPETICION` se fusionó en una abierta |
| `createdAt` | Date | solo `createdAt` (sin `updatedAt`) |

Índices: `{ inboundMessage: 1, type: 1 }` **único** (la autoridad); `{ escalation: 1, createdAt: 1 }` (conteo y reconciliación); `{ conversation: 1 }`. No tiene TTL ni tope: un entrante procesado lo está para siempre, incluso después de resolver la escalación y con cualquier cantidad de mensajes (decisión nueva: la propiedad que importa es «no volver a crear ni contar dos veces el mismo entrante»; el volumen del PRD §9 hace trivial el almacenamiento). Se exporta en `models/index.js` (obligatorio para `clearTestDb`).

**Tipos y reglas** (`ESCALATION_RULES`; la prioridad es un supuesto, el PRD solo nombra «prioridad»):

| Tipo | Pausa la IA | Prioridad | Aviso del sistema al lead | Quién lo crea |
|---|---|---|---|---|
| `EMERGENCIA` | **Sí, después del aviso** | `CRITICA` | `EMERGENCIA`: texto fijo del playbook §6 (el 911), **antes** de pausar | `recepcion`, `ventas`, y los futuros `info`/`pagos` |
| `SOLICITUD_HUMANO` | Sí | `ALTA` | `AVISO_FIJO`: texto fijo del playbook §2 | `recepcion`, `ventas` |
| `QUEJA_NEGOCIACION` | Sí | `ALTA` | `AVISO_FIJO` | `recepcion`, `ventas` |
| `FUERA_DE_CONOCIMIENTO` | Sí | `NORMAL` | `AVISO_FIJO` | agentes y sistema |
| `PAGO` | **No** (la IA sigue; nunca confirma) | `ALTA` | `NINGUNO`: «respuesta + escalamiento sin pausa» (abajo) | futuro agente `pagos` (hoy no existe) |
| `TRAMITE_RECEPCION` | **No** | `NORMAL` | `NINGUNO`: «respuesta + escalamiento sin pausa»; `ventas` registra la preferencia y no confirma la visita | `ventas` |

**Respuesta + escalamiento sin pausa (`PAGO` y `TRAMITE_RECEPCION`).** Dos efectos independientes sobre el mismo entrante, ambos obligatorios: (1) el agente **responde al lead** y el `reply` pasa por la supervisión según la autonomía (`Draft` `PENDIENTE` en `SUPERVISADO`; envío por el gate con `reply:<inbound>` en `AUTONOMO`); (2) se crea una `Escalation` propia de ese entrante (**sin fusión por contenido**: cada solicitud distinta conserva su `summary` y `reason`). La conversación **permanece en `IA`** y el sistema no envía aviso adicional. La `Escalation` se crea **antes** que el borrador (es el registro que Recepción necesita) y no depende de que el borrador se apruebe: si se rechaza o se reemplaza, la `Escalation` sigue abierta. Si falla el borrador, la `Escalation` ya existe, y viceversa.

**Fallos sistémicos: conducta única (idéntica a ADR-005 §5).** Las causas `PROVEEDOR`, `CONFIGURACION` y `TIMEOUT_TURNO` (el fallo es de la infraestructura, no del lead) producen una `Escalation` `FUERA_DE_CONOCIMIENTO` con `source: 'SISTEMA'`, **visible en la Bandeja**, **sin pausa** (`pausesAI: false`; una caída no debe dejar a todos los leads en `HUMANO`) y con el **aviso estándar** (`HANDOFF_NOTICE`) enviado **una sola vez por incidente abierto de esa conversación**, por el gate, sin supervisión (S61) y con llave idempotente. Todas las causas sistémicas comparten `dedupeKey = "<conversationId>:SISTEMICA"`: es el **único** incidente que se fusiona, porque por construcción es un solo incidente por conversación (la infraestructura falló, no hay "solicitudes distintas" que perder).

- **Qué NO se garantiza (silencio explícito aceptado).** El lead recibe respuesta del sistema **solo en el primer fallo del incidente** (el aviso). Los mensajes posteriores del mismo lead que también fallen mientras el incidente siga abierto **se fusionan en la misma `Escalation` (más `occurrences`, `lastInboundMessage`) y no reciben respuesta alguna**, ni aviso ni IA. Se acepta a propósito para no enviar el mismo aviso una y otra vez a quien insiste durante una caída (spam al lead y desgaste de la ventana de 24 h); el costo es que ese lead espera sin saber si lo leyeron. **Se conserva visible:** la tarjeta muestra el contador «N mensajes sin respuesta» (`occurrences`, menos el primero si recibió el aviso), el último mensaje sin respuesta (`lastInboundMessage` con su texto) y la antigüedad; los `EscalationInbound` conservan cada entrante. Alguien puede escribirle (tomar la conversación). No se promete que «el lead siempre recibe una respuesta».
- **Cierre manual del incidente (alcance base).** El incidente sistémico se cierra **solo a mano**: `PATCH /escalations/:id` a `RESUELTO` (ruta existente, §4), con `resolvedVia: 'MANUAL'` y `$unset dedupeKey` **en la misma operación atómica** que el cambio de estado (ver «Cierre atómico» abajo), `AuditLog` `ESCALAMIENTO_RESUELTO` y `crm:escalation`. **Un turno posterior exitoso de la conversación no lo cierra.** Un mensaje que falla **mientras** se cierra no se pierde: la fusión está condicionada a que el incidente siga abierto y, si ya no lo está, ese mensaje origina un incidente nuevo con su aviso (paso 4 del orden de operaciones). `resolvedVia` solo admite `MANUAL` y `DEVOLUCION`.
- **Mientras siga abierto.** Los mensajes posteriores que fallen por causa sistémica **siguen fusionándose y contándose** (`occurrences`, `lastInboundMessage`, `ESCALAMIENTO_REPETIDO`) y siguen siendo visibles en la Bandeja; los que **no** fallan se atienden con normalidad (la conversación no está pausada). **Costo explícito aceptado:** un lead puede quedar sin avisos de nuevos fallos (el incidente viejo los absorbe en silencio) hasta que alguien cierre el incidente; por eso la tarjeta se ordena por antigüedad y destaca las ocurrencias sin respuesta.
- **Un fallo posterior a un cierre abre un incidente nuevo.** Con la `dedupeKey` liberada, el siguiente fallo sistémico crea una `Escalation` nueva (otro `escalationId` y, por tanto, otra llave de aviso) y el lead vuelve a recibir el aviso estándar **una vez**.
- **Pendiente posterior: auto-recuperación** (`AUTO_RECUPERACION`, `autoRecoverSystemic`): cerrar el incidente al completar un turno sano **no está en el alcance base**. Razón: carrera entre un turno que completa con éxito y otro de la misma conversación que justo abre o fusiona un incidente (el cierre podría borrar un incidente recién abierto). Antes de implementarla hay que serializar los turnos por conversación o reintentar el paso 1 del registro de procesamiento tras el cierre.
- Las demás causas (`CONFIANZA_BAJA`, `SALIDA_INVALIDA`, `DESTINO_INEXISTENTE`, `CICLO`) **pausan y avisan**, sin cambio.

**Índices de `Escalation`:**

- `{ dedupeKey: 1 }` **único parcial** (`partialFilterExpression: { dedupeKey: { $type: 'string' } }`, mismo patrón que `Message.idempotencyKey`): evita dos incidentes sistémicos abiertos de la misma conversación en una carrera. Solo el incidente sistémico define `dedupeKey`, así que el índice no afecta a los demás tipos.
- `{ status: 1, priorityRank: 1, createdAt: 1 }` (cola de la pestaña); `{ conversation: 1, status: 1 }` (panel de la conversación, tomar y devolver); `{ resolvedAt: -1 }`.
- **Se elimina** el índice único `{ inboundMessage: 1, type: 1 }` de `Escalation` que proponía la versión anterior de este ADR y el multiclave de `absorbed`. Decisión y justificación: la autoridad de idempotencia es ahora `EscalationInbound` con ese mismo índice único; mantenerlo también en `Escalation` duplicaría la autoridad, generaría una segunda fuente de errores 11000 que habría que distinguir y, peor, con `role: 'REPETICION'` el `inboundMessage` de la escalación es solo el entrante de origen. Se conserva `Escalation.inboundMessage` como dato (para mostrar el mensaje origen), sin unicidad.

**Identidad de los incidentes (decisión).** Se elige la opción más simple que no pierde información:

| Tipo / causa | Identidad | `dedupeKey` | ¿Fusiona? |
|---|---|---|---|
| Incidente sistémico (`PROVEEDOR`, `CONFIGURACION`, `TIMEOUT_TURNO`) | uno por conversación mientras esté abierto | `<conversationId>:SISTEMICA` | **Sí** (`occurrences`, `lastInboundMessage`, registros `REPETICION`) |
| `PAGO`, `TRAMITE_RECEPCION` | una `Escalation` **por mensaje entrante** | ninguna | **No** |
| `SOLICITUD_HUMANO`, `QUEJA_NEGOCIACION`, `EMERGENCIA`, `FUERA_DE_CONOCIMIENTO` de agente, `CONFIANZA_BAJA`, `SALIDA_INVALIDA`, `DESTINO_INEXISTENTE`, `CICLO` | una por mensaje entrante (pausan la IA: no se esperan repeticiones) | ninguna | **No** |

Por qué: el contrato del agente no aporta de forma fiable la identidad lógica de una solicitud de trámite (`handoff.reason` es texto libre ≤ 300; una huella derivada de él colapsaría trámites distintos o separaría el mismo trámite redactado distinto). Fusionar por contenido perdería la información de la segunda solicitud (su `summary` y `reason`); no fusionar solo cuesta más tarjetas cuando el lead insiste. Cada solicitud distinta es su propia `Escalation` con su `summary`, `reason` y borrador. La idempotencia por entrante sigue en `EscalationInbound`.

**Idempotencia: orden de operaciones (`raiseEscalation(inbound, spec, { onStep } = {})`).**

**Principio: cada efecto lo aplica exactamente un proceso, el que gana una operación atómica.** Los efectos de `ORIGEN` (aviso, pausa, `ESCALAMIENTO_CREADO`, `CONVERSACION_PAUSADA`, `crm:escalation` `created`) los aplica **solo** el proceso cuyo `Escalation.create({ _id: target })` tuvo éxito. Los efectos de `REPETICION` (`$max`, `ESCALAMIENTO_REPETIDO`, `crm:escalation` `updated`) los aplica **solo** el proceso cuya inserción del registro tuvo éxito con `role: 'REPETICION'` o cuya corrección condicionada del registro (abajo) modificó un documento. Así no hace falta distinguir «otro proceso está en vuelo» de «el proceso cayó»: ambos casos se resuelven intentando la misma operación atómica, y quien la pierde hace no-op. `onStep(name, ctx)` es un gancho asíncrono opcional (por defecto no hace nada) que las pruebas usan para intercalar operaciones de forma determinista; no cambia ninguna decisión. `ctx = { inboundId, type, target, role }`. Nombres fijos (constantes exportadas como `ESCALATION_STEPS`):

| Gancho | Cuándo se llama | Prueba que lo usa |
|---|---|---|
| `'RECORD_INSERTED'` | Tras insertar con éxito el `EscalationInbound` (paso 2), antes del paso 3 o 4 | (d4): cerrar el incidente entre los pasos 2 y 4 |
| `'DEDUPE_CONFLICT'` | Tras el E11000 sobre `dedupeKey` del paso 3, antes de releer la candidata | (d): cerrar la ganadora antes de la relectura |
| `'BEFORE_MERGE'` | En el paso 4, tras `countDocuments` y antes del `$max` condicionado | (d4) variante y (f ii): cerrar o simular la caída antes de contar |
| `'ORIGIN_CREATED'` | Tras el `Escalation.create` ganador del paso 3, antes del aviso | (f): simular la caída antes del aviso (`notice.status = PENDIENTE`) |

1. **Candidata de fusión (solo incidente sistémico).** Si la causa es sistémica, busca `Escalation.findOne({ dedupeKey: '<conversationId>:SISTEMICA', status: { $in: ['ABIERTO','EN_PROCESO'] } })`. Si existe, `target = esa._id` y `role = 'REPETICION'`; si no (o si el tipo no es sistémico), `target = new ObjectId()` (preasignado) y `role = 'ORIGEN'`.
2. **Insertar primero el registro:** `EscalationInbound.create({ escalation: target, conversation, inboundMessage, type, role })`. El índice único `{ inboundMessage, type }` decide:
   - **Éxito:** este proceso es el **dueño** del registro; sigue en el paso 3 (`ORIGEN`) o 4 (`REPETICION`). Gancho `onStep('RECORD_INSERTED')`.
   - **E11000 (ya procesado o en proceso por otro):** se lee el registro existente. (a) Si su `escalation` apunta a una `Escalation` existente → **no-op total**: ni `occurrences`, ni aviso, ni auditoría, ni pausa, ni evento, y se devuelve la existente; vale antes y después de resolver la escalación y sin importar cuántos mensajes se hayan procesado (no hay tope). (b) Si el registro es `ORIGEN` y su `Escalation` no existe (el dueño **está en vuelo o cayó**: no se distingue), este proceso intenta el **paso 3** con `target = registro.escalation`, como cualquier otro: si su `create` gana, aplica los efectos (es una reanudación); si pierde por `_id`, no-op. (c) Si el registro es `REPETICION` y su `Escalation` no existe: no ocurre (las repeticiones apuntan a un incidente existente); se trata como (a) devolviendo `null` y lo reporta `reconcileEscalations()`.
3. **Rol `ORIGEN`:** `Escalation.create({ _id: target, …, occurrences: 1, lastInboundMessage: inbound._id, dedupeKey? })` (`dedupeKey` solo en el incidente sistémico). El error E11000 se distingue por `err.keyPattern`:
   - **E11000 sobre `_id`** (otro proceso, el dueño en vuelo o un reproceso, ya creó esta misma `Escalation`): **no-op** — se relee y se devuelve la existente, sin aviso, sin auditoría, sin pausa y sin evento.
   - **E11000 sobre `dedupeKey`** (otro entrante creó antes un incidente sistémico abierto): gancho `onStep('DEDUPE_CONFLICT')` y luego se relee la candidata (`findOne` del paso 1) **una sola vez**: (i) si aparece una ganadora abierta, se corrige el registro con una **actualización condicionada** `EscalationInbound.updateOne({ inboundMessage, type, role: 'ORIGEN', escalation: target }, { $set: { role: 'REPETICION', escalation: ganadora._id } })`; solo si `modifiedCount === 1` este proceso continúa como `REPETICION` (paso 4); si es 0, otro proceso ya lo corrigió → no-op. (ii) Si la ganadora ya no existe (se cerró entre medias), el registro **no se modifica** (sigue `ORIGEN` con `escalation = target`) y se repite solo el `create` de este paso con el mismo `target` (no se reinserta el registro ni choca con su propio E11000). Si el segundo `create` vuelve a chocar por `dedupeKey`, se agota el reintento: la operación lanza error, el registro `ORIGEN` queda sin `Escalation` (estado huérfano recuperable) y lo recupera el reproceso del entrante (paso 2 b) o lo reporta `reconcileEscalations()`.
   - Tras crear: aviso, pausa, auditoría `ESCALAMIENTO_CREADO` y `crm:escalation` (`created`) como en §2, una sola vez.
4. **Rol `REPETICION` (fusión condicionada a que el incidente siga abierto).** `n = countDocuments({ escalation: target })` y `r = Escalation.updateOne({ _id: target, status: { $in: ['ABIERTO','EN_PROCESO'] } }, { $max: { occurrences: n, lastInboundMessage: inbound._id } })`. Gancho `onStep('BEFORE_MERGE')` entre el conteo y el `$max`. `$max` es monótono, por lo que el orden de llegada no puede reducir el valor; el último registro confirmado cuenta después de su propia inserción y ve a todos, así que **por diseño** `occurrences` debe converger al total exacto bajo concurrencia. Es un razonamiento sobre el diseño, no algo comprobado: el código no existe todavía y lo acreditarán las pruebas (d) y (e) al implementarse.
   - **Si `r.matchedCount === 1`:** se audita `ESCALAMIENTO_REPETIDO` y se emite `crm:escalation` (`updated`). **No se reenvía el aviso.**
   - **Si `r.matchedCount === 0` (el incidente se cerró entre el paso 1 y este paso):** el mensaje **no** queda absorbido en un incidente cerrado. Se **reasigna** el registro con una actualización condicionada `EscalationInbound.updateOne({ inboundMessage, type, role: 'REPETICION', escalation: target }, { $set: { role: 'ORIGEN', escalation: nuevo } })` con `nuevo = new ObjectId()`; si `modifiedCount === 1`, este proceso continúa en el **paso 3** con `target = nuevo` (crea el incidente nuevo con `dedupeKey` y envía su aviso **una vez**, con la llave de ese `escalationId`; si choca por `dedupeKey` porque otro mensaje ya abrió el nuevo incidente, se aplica la regla (i) y se fusiona en él). Si es 0, otro proceso ya lo reasignó → no-op.
   - **Cota:** una llamada hace como máximo **una** reasignación. Si tras ella vuelve a darse `matchedCount === 0` (el incidente nuevo también se cerró antes de contar), el registro se deja como `ORIGEN` con un id preasignado sin `Escalation` (misma actualización condicionada) y la operación lanza error: es el estado huérfano recuperable del paso 3, **nunca** una `REPETICION` de un incidente cerrado sin contar.

`occurrences` y `lastInboundMessage` **nunca se actualizan antes** de una inserción nueva exitosa en el registro (o de su reasignación) ni sobre un incidente que ya no está abierto.

**Cierre atómico del incidente sistémico (pareja de la fusión condicionada).** El `PATCH` a `RESUELTO` (§4) es **una sola operación** `findOneAndUpdate({ _id, status: <estado previo> }, { $set: { status: 'RESUELTO', resolvedAt, resolvedBy, resolvedVia: 'MANUAL', resolutionNote }, $unset: { dedupeKey: '' } })`: el cambio de estado y la liberación de la `dedupeKey` ocurren juntos. Por tanto, una fusión que llega después ve `status: 'RESUELTO'` (no casa con su filtro) y un `create` nuevo ya no choca con la `dedupeKey` liberada; no existe un instante con el incidente cerrado y la llave todavía tomada, ni al revés.

**Caída entre pasos (recuperable, sin duplicar):**

| Dónde cae el proceso | Estado resultante | Recuperación |
|---|---|---|
| Tras insertar el registro `ORIGEN`, antes de crear la `Escalation` | Registro sin `Escalation` | Si el mismo entrante se reprocesa, el paso 2 (b) intenta el `create` con el id preasignado y, si gana, aplica los efectos una vez. Si el dueño seguía vivo y crea antes, el reproceso recibe E11000 sobre `_id` y hace no-op (o al revés). Si nadie lo reprocesa, `reconcileEscalations()` lo reporta como huérfano (no inventa una escalación) |
| Tras crear la `Escalation`, antes del aviso | `notice.status = PENDIENTE` | Conciliación por la llave `esc-notice:…` (§2); el reintento del entrante es no-op total |
| Tras insertar un registro `REPETICION`, antes de `$max` | `occurrences` por debajo del conteo de registros | Incidente abierto: `reconcileEscalations()` recalcula `occurrences` y `lastInboundMessage` desde los registros (misma operación `$max` condicionada, idempotente). La auditoría de esa repetición puede faltar (como máximo una vez); el registro conserva la evidencia. Incidente ya `RESUELTO`: `reconcileEscalations()` **reporta** (no corrige ni reabre) los incidentes resueltos cuyo `occurrences` es menor que su número de registros, para que una persona revise ese mensaje |
| Tras reasignar un registro (`REPETICION` → `ORIGEN`), antes de crear el incidente nuevo | Registro `ORIGEN` sin `Escalation` | Igual que la primera fila |

`reconcileEscalations()` (servicio) se ejecuta al arrancar el server y es invocable en las pruebas; programarla de forma periódica queda como pendiente. **Qué es necesario para el checkpoint: nada.** Ningún punto del checkpoint (borrador → aprobar → simulador, `Escalation` de solicitud de persona, `AuditLog` de envíos y bloqueos, `/probar-agente`) depende de la conciliación; es robustez ante caídas entre pasos. Mínimo recomendado en el paso 4: recalcular `occurrences`/`lastInboundMessage` de incidentes abiertos y reportar registros `ORIGEN` huérfanos. Prescindible si el paso 4 se recorta: el reporte de incidentes `RESUELTO` con registros sin contar y la ejecución en el arranque (puede invocarse solo desde las pruebas hasta que se programe).

**Relación con borradores:** una `Escalation` y un `Draft` pueden compartir el mismo `inboundMessage` (por ejemplo `TRAMITE_RECEPCION` con respuesta de `ventas`).

**Migración:** ninguna; colecciones nuevas. `Conversation` y `Message` no cambian de esquema. `Contact` no cambia en el alcance base (el campo de bloqueo es parte de la sección «Fuera del alcance base»).

### 2. Avisos al lead

**Textos fijos** (módulo puro `server/src/agents/noticeTexts.js`, definido en [ADR-005](ADR-005-orquestador-agentes.md) §4 y creado en el paso 1; sin ningún `import` ni acceso a `process.env`). **Decisión: `outbox/notices.js` no se crea** (lo proponía la versión anterior de este ADR): el orquestador y el `replyGuard` no pueden importar `outbox/`, y una sola fuente pura la pueden importar todos los que la necesitan: `agents/orchestrator.js`, `agents/replyGuard.js`, `outbox/gate.js` y `services/escalations.js`.

| Constante | Origen | Marcador | Quién la usa |
|---|---|---|---|
| `HANDOFF_NOTICE` | playbook §2: «Con gusto voy a canalizar tu consulta con nuestro equipo de recepción para que puedan ayudarte personalmente.» + emoji, tal cual aparece | `[CONFIRMAR]` (S44) | orquestador (`notice.text`), `services/escalations.js` (envío), gate (comprobación) |
| `EMERGENCY_NOTICE` | playbook §6, viñeta 2 (aviso del 911, ya copiado literal en los prompts) | `[CONFIRMAR]` | ídem |
| `MEDICAL_NOTICE` | playbook §8.4 (mensaje estándar médico) | `[CONFIRMAR]` | `replyGuard.js` (G4); **no** es un aviso del sistema: el gate no lo acepta como `AVISO_ESCALAMIENTO` |

- **No se inventan textos ni datos comerciales.** El texto de «fuera del horario de recepción» (playbook §6) **no se usa en esta versión**: requiere conocer el horario de recepción (S2, `horarios.md §2`, `[CONFIRMAR]`) como configuración (PRD D3); queda como pendiente. El texto de privacidad §8.5 es `[PENDIENTE]` y **no se envía como aviso**: las consultas de privacidad usan `HANDOFF_NOTICE`, que no afirma nada sobre políticas.
- `notice-texts.test.js` (ADR-005 §9, paso 1) extrae cada texto del playbook con la misma técnica que `agents.test.js` (regex sobre `> "…"`) y exige igualdad con la constante; si el playbook cambia, la prueba falla.

**Envío** (`services/escalations.js`, `raiseEscalation`):

1. Aplica el orden de §1 (registro primero, luego la `Escalation`) y emite `crm:escalation` (`created`). El registro existe **antes** de intentar el aviso, para que un fallo del canal no pierda el incidente.
2. Si el tipo y la causa piden aviso (solo rol `ORIGEN`): `sendMessage({ conversationId, text, author: { kind: 'AGENTE', ref: <agente que escaló, o 'orquestador' en causas del sistema> }, idempotencyKey: 'esc-notice:<conversationId>:<inboundId>:<TYPE>', purpose: 'AVISO_ESCALAMIENTO', ref: { escalationId } })`. La llave incluye conversación, entrante y tipo, así que un reintento del procesamiento, o el mismo escalamiento visto dos veces (router y especialista), **nunca** duplica el aviso. Para las causas sistémicas la llave es `esc-notice:<conversationId>:SISTEMICA:<escalationId>` (un aviso por incidente sistémico); una fusión no envía aviso. En un traspaso solo escala el agente final: `DERIVAR` no avisa.
3. **El aviso no pasa por supervisión** (S61, ADR-003 §9): no crea `Draft` y se envía igual en `SUPERVISADO` y `AUTONOMO`.
4. Se registra el **resultado** en `notice` aunque el gate no pueda enviarlo:

   | Respuesta del gate | `notice.status` | `notice.reason` |
   |---|---|---|
   | `ENVIADO` | `ENVIADO` | — (con `notice.message`) |
   | `BLOQUEADO` | `BLOQUEADO` | `reason` del gate (`MODO_HUMANO`, `FUERA_DE_VENTANA_24H`, `AVISO_NO_AUTORIZADO`…) |
   | `FALLIDO` | `FALLIDO` | error del canal |
   | `DUPLICADO` | `DUPLICADO` | `Ya existía un aviso con esta llave` (con el `message` existente) |
   | excepción de `sendMessage` | `FALLIDO` | mensaje de la excepción |

   Después emite `crm:escalation` (`updated`).
5. **Pausa:** `Conversation.updateOne({ _id, mode: 'IA' }, { mode: 'HUMANO' })`, `Escalation.pausedAt`, `AuditLog` `CONVERSACION_PAUSADA` `{ escalationId, type }` y `crm:conversation`. La pausa ocurre **siempre** (en los tipos y causas que pausan), aunque el aviso haya fallado o esté bloqueado: la persona debe atender, y la pestaña muestra «Aviso no enviado» para que escriba ella.
6. **`EMERGENCIA`:** el orden es obligatorio y se prueba: **primero** el aviso del 911 por el gate (con la conversación todavía en `IA`), **después** la pausa. Si el orden se invirtiera, el gate bloquearía el aviso por `MODO_HUMANO`. El texto lo pone el sistema, no el LLM (ADR-005 §4).
7. `AuditLog` `ESCALAMIENTO_CREADO` `{ escalationId, type, priority, pausesAI, source, cause, agent, trail, noticeKind }` (sin texto del lead). Actor: `{ kind: 'AGENTE', ref: agente }` o `{ kind: 'SISTEMA', ref: 'orquestador' }`.

**Reconciliación del aviso:** si el proceso cae entre el envío y la actualización de `notice`, queda `PENDIENTE`; se concilia buscando el `Message` con la llave `esc-notice:…` (mismo patrón que #85).

### 3. Pausa y atención humana

- **Tomar y devolver** (contrato de ADR-003 §7, fase 9; **posterior al checkpoint**; este ADR añade sus efectos sobre `Escalation`):
  - `POST /conversations/:id/take`: la conversación pasa a `HUMANO`. Todos los `Escalation` `ABIERTO` de esa conversación pasan a `EN_PROCESO` con `takenBy`/`takenAt` (`ESCALAMIENTO_TOMADO`, `crm:escalation`).
  - `POST /conversations/:id/release`: la conversación vuelve a `IA`. Los escalamientos con `pausesAI: true` en `ABIERTO`/`EN_PROCESO` pasan a `RESUELTO` con `resolvedVia: 'DEVOLUCION'`. Los que no pausan (`TRAMITE_RECEPCION`, `PAGO`, sistémicos) **no** se cierran: se resuelven a mano (§4) o por su flujo; el incidente sistémico, a mano (la auto-recuperación está pospuesta).
  - Si hay una sesión humana sin escalamiento, nada cambia.
- **Respuesta humana:** `POST /conversations/:id/messages` (ADR-003 §7) sale por el gate con `author: { kind: 'USUARIO', … }`, `purpose: 'HUMANO'` y la llave `human:<conversationId>:<clientMessageId>`. Sigue exigiendo modo `HUMANO` (409 si no).
- **Borradores pendientes (ADR-003 §6):** una pausa **no** los toca. Los de mensajes anteriores ya quedaron `REEMPLAZADO` por el entrante que causó el escalamiento (S60); si algún borrador sobrevive, al aprobarlo el gate lo bloquea por `MODO_HUMANO` (el `Draft` pasa a `BLOQUEADO`). El escalamiento no crea ni cierra borradores.
- **Cuándo se resuelve:** (a) `release` para los que pausan; (b) `PATCH /escalations/:id` a mano; (c) `PAGO`: por el flujo de pagos (B3/B4) y, mientras no exista, por la transición `PAGO_EN_REVISION → PERDIDO` del ADR-003 (#96): al cambiar la etapa, las `Escalation` `PAGO` abiertas del contacto pasan a `RESUELTO` (`resolvedVia: 'MANUAL'`, nota = motivo) y se audita; el rechazo o cancelación del `Pago` queda para el modelo Pago (nunca se confirma); (d) el incidente sistémico, a mano con el `PATCH` (§1).
- **Riesgos conocidos (pendientes):** (1) si un lead escribe mientras la conversación ya está en `HUMANO`, ningún agente corre y no hay nuevo escalamiento: la persona no recibe alerta (relacionado con #97). (2) Un contacto bloqueado que escribe una emergencia: el bloqueo no está en el alcance base y depende de la decisión pendiente (a) (secciones propias, abajo); **ese requisito todavía NO estará cumplido**. Ambos se registran en pendientes; el diseño no resuelve el punto (1).

### 4. Cómo se representa «requiere humano»

**`Escalation` como registro persistido + señal visible**; **no** se crea un borrador con texto vacío (ver «Diferencias»). El servidor garantiza la persistencia aunque el aviso falle; la señal es:

- La **pestaña Escalamientos** de la Bandeja (ADR-003 §9), con contador de `ABIERTO` + `EN_PROCESO`, y un indicador combinado en el elemento «Bandeja» de la navegación (borradores pendientes + escalamientos activos).
- Una insignia **«Requiere humano»** en la conversación (lista de Conversaciones y ContactPanel) cuando hay un escalamiento activo.
- Evento `crm:escalation` en tiempo real. La alerta sonora (PRD C1) la reproduce el cliente al recibir `created` de tipo `EMERGENCIA`, `SOLICITUD_HUMANO`, `QUEJA_NEGOCIACION` o `PAGO` (opcional y silenciable; los navegadores pueden exigir una interacción previa).

**API** (`routes/escalations.js`; sin autenticación, actor provisional S58; errores con el formato de ADR-003 §7: 400 con `details` arreglo, 409/422 con `details` objeto):

| Método y ruta | Entrada (zod) | Respuesta | Errores |
|---|---|---|---|
| `GET /escalations` | query `{ status: z.enum(['ACTIVAS','ABIERTO','EN_PROCESO','RESUELTO']).default('ACTIVAS'), type?: z.enum(ESCALATION_TYPES), conversationId?: id, limit: z.coerce.number().int().min(1).max(200).default(50) }` | 200 `{ escalations: EscalationView[], activeCount, criticalCount }`. `ACTIVAS` = `ABIERTO` + `EN_PROCESO`, ordenadas por `priorityRank` y luego `createdAt` ascendente; `RESUELTO` por `resolvedAt` descendente | 400 |
| `GET /escalations/:id` | params `{ id }` | 200 `{ escalation: EscalationView }` | 400, 404 |
| `PATCH /escalations/:id` | body `{ status: z.enum(['EN_PROCESO','RESUELTO']), note: z.string().trim().min(1).max(500).optional() }` | 200 `{ escalation, changed }` | 400, 404, 409, 422 |

Reglas del `PATCH` (precedencia):
1. id o body inválido → 400. 2. Inexistente → 404. 3. Mismo estado → 200 `changed: false` (sin auditar). 4. Escalamiento ya `RESUELTO` (no se reabre) → 409 `{ status }`. 5. Resolver un `PAGO` → **422** («Un pago se resuelve con el flujo de pagos»; la IA y esta ruta nunca confirman pagos). 6. Actualización atómica con filtro por estado previo; `null` (cambio concurrente) → 409. Es también el **cierre manual del incidente sistémico**. Resolver deja `resolvedBy` (actor), `resolvedVia: 'MANUAL'` y elimina `dedupeKey` **en la misma operación** `findOneAndUpdate` que pasa a `RESUELTO` (`$set` + `$unset`, §1 «Cierre atómico»); después audita `ESCALAMIENTO_RESUELTO` y emite `crm:escalation`. Resolver **no** devuelve la conversación a la IA.

`EscalationView` (`serializeEscalation`): `{ id, conversationId, contactId, type, priority, status, pausesAI, source, cause, agent, trail, reason, summary, inboundMessageId, inboundText, draftId, occurrences, lastInboundMessageId, lastInboundText, lastInboundAt, notice: { kind, status, reason, messageId }, pausedAt, takenBy, takenAt, resolvedBy, resolvedAt, resolvedVia, resolutionNote, createdAt, updatedAt, context: { contact: { id, name, phone, stage }, conversationMode, windowExpiresAt } }`. No expone ningún arreglo de mensajes absorbidos.

Cambios compatibles en otras respuestas: `GET /contacts` agrega `openEscalations` (conteo de activos) por contacto; `POST /simulator/messages` agrega `escalation: EscalationView | null`.

**Eventos de Socket.IO:**

| Evento | Cuándo | Payload |
|---|---|---|
| `crm:escalation` | Creación, fusión de repetición, resultado del aviso, tomar, devolver, resolver (manual o devolución) | `{ action: 'created' \| 'updated', escalation: EscalationView }` |
| `crm:conversation` | Pausa por escalamiento, tomar, devolver | `{ conversation: serializeConversation }` |
| `crm:message`, `simulator:outbound` | El aviso sale por el gate | sin cambios |

**Pestaña «Escalamientos»** (reemplaza «Próximamente»): lista de tarjetas con filtros por tipo y estado (`ACTIVAS` por defecto). Cada tarjeta muestra: tipo con color por prioridad (`EMERGENCIA` destacada), lead (nombre, teléfono, etapa), el mensaje del lead que la originó, el resumen de la IA (`summary` y `reason`), la cadena de agentes («recepcion → ventas»), antigüedad, **ocurrencias** (para los incidentes sistémicos: «N mensajes sin respuesta durante la caída», con el último mensaje sin respuesta y su antigüedad; N = `occurrences` menos 1 si el aviso se envió) y vencimiento de la ventana de 24 h, el resultado del aviso («Aviso enviado» o «**Aviso no enviado: <motivo>**; escribe al lead desde la conversación») y, si `source = SISTEMA`, un banner con la causa en español («La IA no pudo responder: salida inválida», «Proveedor de IA no disponible», «Agente "info" no disponible», «Confianza baja»). Acciones: «Tomar conversación» (`take`, cuando exista), «Ir a la conversación», «Marcar en proceso» y «Marcar resuelta» (con nota opcional; en el incidente sistémico es el cierre manual). Los `PAGO` no muestran «Marcar resuelta». **Varias tarjetas por conversación:** `PAGO` y `TRAMITE_RECEPCION` crean una tarjeta por solicitud (sin fusión por contenido), cada una con su resumen y razón; la tarjeta puede mostrar un enlace «N más de esta conversación» si hay otras activas.

### 5. «No iniciar contacto» (dentro de la base) y bloqueo de contactos (fuera de la base)

**«No iniciar contacto sin entrante previo» está en el alcance base del gate.** El gate de hoy (`gate.js:32-36`) ya bloquea **todo** envío, de cualquier autor y propósito, cuando el contacto no tiene `lastInboundAt`, con el motivo `FUERA_DE_VENTANA_24H`. **Decisión: la base conserva exactamente ese comportamiento y ese motivo** (no se introduce `SIN_ENTRANTE_PREVIO` en la base: cambiar solo el nombre del motivo no aporta a los puntos 1–5 del checkpoint y obligaría a ajustar pruebas y etiquetas). Lo que la base **añade** es la prueba que hoy falta (paso 3, `gate.test.js`): con `lastInboundAt` ausente, `sendMessage` devuelve `BLOQUEADO`/`FUERA_DE_VENTANA_24H` para autor `AGENTE` (con y sin `purpose`), `USUARIO` (`HUMANO`) y `AVISO_ESCALAMIENTO`, sin `Message` y con `MENSAJE_BLOQUEADO`; y el endurecimiento del paso 3 mantiene esa comprobación **antes** de la comprobación por propósito (orden de decisión, §6). El motivo separado `SIN_ENTRANTE_PREVIO` (distinguir «sin entrante previo» de «ventana vencida») queda como pendiente posterior y sería solo un cambio de motivo.

El **bloqueo explícito de contactos** (`Contact.outboundBlock`, `POST /contacts/:id/block|unblock`, `CONTACTO_BLOQUEADO` en el gate, no invocar agentes para bloqueados, botones e insignia «Bloqueado») **no forma parte del alcance base ni del orden de entregables**; su diseño completo se conserva, sin aprobar, en la sección «Fuera del alcance base: bloqueo de contactos», pendiente de la decisión (a). **El requisito de bloqueo de contactos / aviso de `EMERGENCIA` sobre un contacto bloqueado todavía NO estará cumplido tras la implementación base, y S61 sigue vigente para los contactos no bloqueados.**

### 6. Gate: propósito, aprobación comprobada y auditoría de intentos

**Cambio de firma** (compatible hacia atrás para las pruebas existentes):

```js
sendMessage({ conversationId, text, author, idempotencyKey, purpose, ref, now })
// purpose ∈ 'RESPUESTA_AUTONOMA' | 'BORRADOR_APROBADO' | 'AVISO_ESCALAMIENTO'   (author.kind = AGENTE)
//         | 'HUMANO'                                                              (author.kind = USUARIO)
//         | 'JOB'                                                                 (author.kind = SISTEMA; reservado, S62)
// ref: { draftId } con BORRADOR_APROBADO; { escalationId } con AVISO_ESCALAMIENTO

createGate(deps?) → { sendMessage }
// deps (todos opcionales; por defecto leen los modelos):
//   findDraft(draftId)            → Promise<Draft | null>        default: Draft.findById(draftId).lean()
//   findEscalation(escalationId)  → Promise<Escalation | null>   default: Escalation.findById(escalationId).lean()
//   getAutonomy(conversation)     → Promise<'SUPERVISADO' | 'AUTONOMO'>   default: getEffectiveAutonomy (ADR-003)
export const { sendMessage } = createGate();   // instancia por defecto: misma firma y comportamiento para los llamadores actuales
```

**Cuándo se endurece (orden global, paso 3).** El gate actual no cambia hasta que existan el modelo `Draft`, la autonomía, el generador simulado, `replies.js` y los servicios de borradores (paso 2), y esos servicios **ya pasan `purpose` y `ref` desde su primera versión** (el gate actual los ignora). Solo entonces (paso 3) el gate empieza a exigirlos. Así el flujo simulado de desarrollo nunca queda bloqueado por un gate que exige algo que el llamador aún no envía.

**`purpose` por defecto y por qué no abre un bypass.** Si el llamador no pasa `purpose`: `RESPUESTA_AUTONOMA` para autor `AGENTE`, `HUMANO` para `USUARIO`, `JOB` para `SISTEMA`. El código existente (`gate.test.js`, `simulator.test.js`, y el `inbound.js` previo al paso 2) cae en `RESPUESTA_AUTONOMA`, que el gate **solo autoriza si la autonomía efectiva es `AUTONOMO`**; con `SUPERVISADO` devuelve `REQUIERE_APROBACION`. El valor por defecto es el propósito **más restrictivo** para un agente: omitir `purpose` nunca permite enviar sin aprobación. Un `purpose` incoherente con el autor lanza `TypeError`. Las pruebas actuales seguirán pasando **cuando backend fije `AGENT_AUTONOMY_DEFAULT: 'AUTONOMO'` en `server/vitest.config.js`** (tarea explícita del paso 2; **hoy ese archivo no lo fija**, S56 lo describe como plan y solo fija `NODE_ENV`, `MONGODB_URI`, `WA_PROVIDER`, `LLM_ENGINE` y `CLAUDE_CLI_PATH`); las pruebas nuevas fijan el modo de forma explícita. **Este ADR no activa `AUTONOMO` por defecto**: el valor inicial fuera de pruebas sigue siendo `SUPERVISADO`.

**Qué se conserva en el gate base y por qué** (cada elemento, una línea; lo demás se recorta): `purpose`/`ref` — sin ellos el gate no distingue un borrador aprobado de texto libre (punto 2 del checkpoint); fail-closed y comprobación por propósito — impiden que una ruta lateral envíe sin supervisión (puntos 2 y 3; regla de oro 1); auditoría de los cuatro resultados — es literalmente el punto 4; `GET /audit/outbound` — es la evidencia consultable del punto 4 (se recorta la UI del panel de auditoría: basta endpoint más prueba); el bloqueo cuando no hay `lastInboundAt` — ya existe hoy y es «no iniciar contacto» (§5); se conserva con su motivo `FUERA_DE_VENTANA_24H` y se prueba. Se **recortan** del gate base: `CONTACTO_BLOQUEADO` (bloqueo explícito, fuera del alcance base) y el motivo separado `SIN_ENTRANTE_PREVIO` (pospuesto; ver §5 y la sección «Fuera del alcance base»).

**Fail closed.** El gate **nunca** infiere una aprobación ni la asume por ausencia de datos. **Invariante: el gate jamás permite `BORRADOR_APROBADO` sin un `Draft` verificable**: `Draft` existente, de **esta** conversación, con `status = 'ENVIANDO'`, `decision = 'APROBADO'`, `finalText === text` e `idempotencyKey === 'draft:<id>'`. Si el lector devuelve `null` o `undefined` (`ref.draftId` inexistente o ausente), el `Draft` es de otra conversación o no cumple el invariante, o la lectura lanza, el resultado es `BLOQUEADO` / `BORRADOR_NO_APROBADO`. Lo mismo para `AVISO_ESCALAMIENTO` sin `Escalation` verificable (`AVISO_NO_AUTORIZADO`) y para `RESPUESTA_AUTONOMA` si la autonomía efectiva no puede resolverse o el lector lanza (`REQUIERE_APROBACION`). Una excepción al leer no cae a «permitir».

**Cómo accede el gate a los datos de verificación: lectores inyectados (`createGate`).** El gate no consulta `Draft`, `Escalation` ni la autonomía directamente: recibe tres **lectores** (`findDraft`, `findEscalation`, `getAutonomy`) por inyección en `createGate(deps)`; los valores por defecto usan los modelos (import estático, que ya existen desde el paso 2) y `getEffectiveAutonomy`. Cada lectura va dentro del `try` de la comprobación. **Los lectores solo leen; toda la decisión** (misma conversación, `status`, `decision`, `finalText === text`, llave `draft:<id>`, texto exacto del aviso, `notice.kind`) **la toma el gate** sobre lo que el lector devuelve, de modo que un lector no puede «aprobar» nada por sí mismo. `sendMessage` se exporta como la instancia por defecto (`createGate()`), con la misma firma: `inbound.js`, `simulator`, `gate.test.js` y el resto de llamadores no cambian. Las pruebas de fail-closed crean su propia instancia con un lector controlado (que devuelve `null`, que lanza, o que devuelve un `Draft` en otro estado o de otra conversación); **no** se usa `mongoose.deleteModel` ni se reemplazan clases o métodos de Mongoose. El resto de modelos del gate (`Contact`, `Conversation`, `Message`, `AuditLog`) siguen con import estático. **Para que la inyección no sea un bypass**, `outbox-rule.test.js` exige que ningún archivo de `server/src/` salvo `outbox/gate.js` mencione `createGate` (solo lo usan las pruebas en `server/test/`).

**Orden de decisión del gate (alcance base):**

1. Llave existente → `DUPLICADO` (y se audita, ver abajo).
2. `MODO_HUMANO` (autor `AGENTE` y conversación en `HUMANO`, como hoy).
3. `FUERA_DE_VENTANA_24H` (incluye `lastInboundAt` ausente, como hoy: «no iniciar contacto sin entrante previo», §5; vale para todo autor y propósito, también `AVISO_ESCALAMIENTO` y `HUMANO`).
4. **Comprobación de aprobación según el propósito** (nadie envía por una ruta lateral):

   | `purpose` | Comprobación (si falla → `BLOQUEADO`) | Excepción aceptada |
   |---|---|---|
   | `BORRADOR_APROBADO` | Existe el `Draft` de `ref.draftId`, de **esta** conversación, con `status = 'ENVIANDO'`, `decision = 'APROBADO'`, `finalText === text` y `idempotencyKey === 'draft:<id>'` → si no: `BORRADOR_NO_APROBADO` | — (es el camino de la supervisión) |
   | `RESPUESTA_AUTONOMA` | La autonomía efectiva (ADR-003 `getEffectiveAutonomy`) es `AUTONOMO` → si no: `REQUIERE_APROBACION` | **`AUTONOMO`** |
   | `AVISO_ESCALAMIENTO` | `findEscalation(ref.escalationId)` devuelve un `Escalation` de esta conversación, y `text` es **exactamente** `HANDOFF_NOTICE` o `EMERGENCY_NOTICE` de `agents/noticeTexts.js` (coherente con su `notice.kind`) → si no: `AVISO_NO_AUTORIZADO` | **Avisos de escalamiento** (S61): texto fijo, no es contenido libre del LLM |
   | `HUMANO` / `JOB` | — | Mensajes de personal (la persona es la aprobación) y jobs (S62) |

5. Creación del `Message` y envío al canal (como hoy).

Así, un agente que llame al gate con texto libre en `SUPERVISADO` queda bloqueado (`REQUIERE_APROBACION`), y un texto libre con propósito `AVISO_ESCALAMIENTO` también (`AVISO_NO_AUTORIZADO`). `approveDraft` (ADR-003) pasa `purpose: 'BORRADOR_APROBADO'` y `ref: { draftId }` desde su primera versión.

**Nada del orquestador llega al gate antes del cableado final** (paso 5 del orden global): hasta entonces el generador es el simulado, y `AGENT_RUNTIME` queda en `SIMULADO`.

**Auditoría de intentos.** El `AuditLog` es el registro de **todos** los intentos; el `Message` es el registro de lo que llegó al canal (solo `ENVIADO` y `FALLIDO`). No se duplica un envío ni se escribe un `Message` por intentos bloqueados o duplicados.

| `action` | Cuándo | `details` |
|---|---|---|
| `MENSAJE_ENVIADO` | El canal aceptó | `{ outcome: 'ENVIADO', purpose, idempotencyKey, ref, textLength, messageId, provider }` |
| `MENSAJE_FALLIDO` | El canal falló | `{ outcome: 'FALLIDO', …, messageId, provider, error }` |
| `MENSAJE_BLOQUEADO` | Cualquier bloqueo | `{ outcome: 'BLOQUEADO', reason, purpose, idempotencyKey, ref, textLength }` con `reason` ∈ `MODO_HUMANO`, `FUERA_DE_VENTANA_24H`, `BORRADOR_NO_APROBADO`, `REQUIERE_APROBACION`, `AVISO_NO_AUTORIZADO` |
| `MENSAJE_DUPLICADO` (**nuevo**) | La llave ya existía | `{ outcome: 'DUPLICADO', purpose, idempotencyKey, messageId }` |

Reglas: `actor` = el autor; `conversation` siempre; **nunca** se guarda el texto, solo `textLength`; los campos nuevos de `details` son compatibles con los registros previos. Se agregan índices a `AuditLog`: `{ conversation: 1, createdAt: -1 }` y `{ action: 1, createdAt: -1 }`.

Consulta: `GET /audit/outbound` (query `{ conversationId?: id, outcome?: z.enum(['ENVIADO','BLOQUEADO','FALLIDO','DUPLICADO']), limit: z.coerce.number().int().min(1).max(200).default(50) }`) → 200 `{ entries: [{ id, at, outcome, reason, purpose, actor, conversationId, messageId, idempotencyKey }] }`, del más reciente al más antiguo. Solo lectura. En el alcance base **no hay panel de UI** de auditoría (pospuesto): el punto 4 se acredita con este endpoint y su prueba.

**Comprobable por QA** (con canal falso y reloj inyectado): los cuatro resultados, cada `reason`, que un bloqueado no deja `Message`, que un duplicado no deja un segundo `Message` ni segundo envío al canal, y que el aviso bloqueado queda registrado en `Escalation.notice`. **No comprobable por QA offline:** la entrega real de Meta (estados de entrega, #39).

**Verificación estática** (`outbox-rule.test.js` ampliado): `purpose: 'BORRADOR_APROBADO'` solo aparece en `services/drafts.js` y `outbox/gate.js`; `AVISO_ESCALAMIENTO` solo en `services/escalations.js` y el gate; `agents/noticeTexts.js` solo lo importan, dentro de `server/src/`, `outbox/gate.js`, `services/escalations.js`, `agents/orchestrator.js` y `agents/replyGuard.js` (las pruebas pueden importarlo); `createGate` no aparece en ningún archivo de `server/src/` salvo `outbox/gate.js`; no existe `outbox/notices.js`. La pureza de `noticeTexts.js` (sin `import`) la verifica `orchestrator-rule.test.js` (ADR-005 §9).

### 7. Reglas de oro

1. **Salida única:** el aviso, la respuesta humana, el borrador aprobado y la respuesta autónoma salen por `outbox/gate.js`; ninguna ruta ni servicio importa `channels/`. El gate además comprueba propósito y aprobación.
2. **Supuestos y pendientes:** listados en la sección «Supuestos y pendientes propuestos (sin numerar)» al final de este ADR; la sesión principal les asigna número al incorporarlos a `docs/SUPUESTOS.md` y `docs/PENDIENTES.md` tras la aceptación.
3. **Pagos:** `PAGO` no se resuelve por la ruta genérica (422); ninguna ruta de este ADR cambia un `Pago` ni la etapa a `SOCIO`/`PAGO_EN_REVISION`; el cierre de `Escalation PAGO` por `PAGO_EN_REVISION → PERDIDO` no confirma nada; el cierre del incidente sistémico es manual y nunca toca un `PAGO`.
4. **Base de conocimiento:** los avisos son constantes del playbook; el sistema no genera texto; sin dato, el agente escala.
- **Idempotencia:** `EscalationInbound` con índice único `{inboundMessage, type}` como autoridad (se inserta primero; E11000 = no-op o reanudación por el mismo `create`), `Escalation.create` con `_id` preasignado como árbitro de los efectos de `ORIGEN` (E11000 sobre `_id` = no-op), correcciones y reasignaciones del registro condicionadas (solo quien modifica aplica efectos), `occurrences` que solo se actualiza tras una inserción nueva, está diseñado para converger con `$max` (lo acreditarán las pruebas de concurrencia) y solo sobre un incidente abierto, cierre atómico (`RESUELTO` + `$unset dedupeKey`), `dedupeKey` único parcial, llave `esc-notice:<conversación>:<entrante>:<TIPO>` (o `…:SISTEMICA:<id>`) en el gate. Una `Escalation` por entrante para todo lo que no es el incidente sistémico (§1, «Identidad de los incidentes»).

## Fuera del alcance base: bloqueo de contactos (condicionado a la decisión pendiente del usuario (a))

**Estado: PROPUESTA SIN APROBAR. No forma parte del orden de entregables base ni de las pruebas base.** Se conserva el diseño para cuando el usuario decida (a). **Tras la implementación base el requisito de bloqueo de contactos y de aviso de `EMERGENCIA` sobre un contacto bloqueado todavía NO estará cumplido; S61 permanece como regla vigente para los contactos no bloqueados.** Ninguna prueba base codifica la opción A (ni B ni C).

**Bloqueo (opt-out o manual), distinto de la exclusión comercial.** La exclusión comercial (#48, PRD F4) solo detiene seguimientos; el agente sigue atendiendo si el lead escribe. El **bloqueo** detiene **toda** salida del CRM hacia ese contacto.

- Campo en `Contact`: `outboundBlock: { active: Boolean (default false), reason: 'LEAD_SOLICITO' | 'MANUAL', note: String ≤ 500, by: { kind, ref }, at: Date }` (sin migración: ausente = no bloqueado).
- **Regla del gate:** si `contact.outboundBlock.active`, `sendMessage` devuelve `BLOQUEADO` / `CONTACTO_BLOQUEADO` para **cualquier** autor (agente, usuario, sistema) y cualquier propósito. Se evaluaría antes que el modo `HUMANO` y la ventana, y añadiría `CONTACTO_BLOQUEADO` a las razones de `MENSAJE_BLOQUEADO`. **Sin excepción en este diseño base-condicionado** (ni siquiera para `EMERGENCIA`): lo que ocurra con el aviso del 911 es la decisión pendiente (a). Que no haya excepción **no** significa que se haya elegido la opción A.
- **Entrantes de un contacto bloqueado:** `inbound.js` los guardaría (conserva el historial), **no invocaría agentes** ni crearía borrador, y emitiría `crm:message`; la conversación mostraría la insignia «Bloqueado». Consecuencia: sin invocar agentes **nadie detecta** una emergencia escrita por un contacto bloqueado.
- **Quién lo cambia:** solo una persona. Ni el LLM ni el orquestador pueden activarlo ni quitarlo.

  | Método y ruta | Entrada | Respuesta | Errores |
  |---|---|---|---|
  | `POST /contacts/:id/block` | body `{ reason: z.enum(['LEAD_SOLICITO','MANUAL']), note: z.string().trim().min(1).max(500).optional() }` | 200 `{ contact, changed }` (ya bloqueado → `changed: false`) | 400, 404 |
  | `POST /contacts/:id/unblock` | body `{ note: z.string().trim().min(1).max(500) }` (autorización expresa, obligatoria) | 200 `{ contact, changed }` | 400, 404 |

  Actualización atómica (`findOneAndUpdate` con filtro por el valor previo de `outboundBlock.active`), `AuditLog` `CONTACTO_BLOQUEADO` / `CONTACTO_DESBLOQUEADO` con `{ contactId, reason, note }` y actor, y evento `crm:contact` (`{ contact, change: { field: 'outboundBlock', from, to, reason } }`, ampliando el enum de `field` de ADR-003 §10). Sin autenticación, el actor es el provisional (S58); con ella, solo `ADMIN` podrá desbloquear (relacionado con #89).
- **Motivo `SIN_ENTRANTE_PREVIO` (pospuesto, independiente del bloqueo):** el gate reportaría `SIN_ENTRANTE_PREVIO` cuando `contact.lastInboundAt` falta (en la base se bloquea igual, reportado como `FUERA_DE_VENTANA_24H`, §5), dejando `FUERA_DE_VENTANA_24H` para la ventana vencida. Es solo un cambio de motivo: el bloqueo en sí ya está en la base y probado. El gate no crea conversaciones ni contactos nuevos. Las plantillas fuera de la ventana siguen sin existir (#42).
- **Interfaz (posterior):** botones Bloquear/Desbloquear (el desbloqueo pide nota) e insignia «Bloqueado» en Conversaciones/ContactPanel.
- **Pruebas (posteriores; `contact-block.test.js` y ampliaciones del gate):** bloquear y desbloquear (nota obligatoria al desbloquear → 400 sin ella), idempotencia (`changed: false`), auditoría con actor, `crm:contact`; entrante de contacto bloqueado guardado sin invocar agentes (`generate` falso con 0 llamadas) y sin borrador; `CONTACTO_BLOQUEADO` para agente y usuario; `notice.status = 'BLOQUEADO'` con el contacto bloqueado. (El cambio de motivo a `SIN_ENTRANTE_PREVIO`, si se hace, ajusta en el mismo cambio la prueba base de §5.) La emergencia sobre bloqueo se prueba solo según la decisión (a).
- **Orden de decisión del gate si se incorpora:** `DUPLICADO` → `CONTACTO_BLOQUEADO` → `MODO_HUMANO` → `SIN_ENTRANTE_PREVIO`/`FUERA_DE_VENTANA_24H` → comprobación por propósito → envío.

## Decisión pendiente de usuario (a): bloqueo frente a EMERGENCIA y detección en contactos bloqueados

**Estado: PENDIENTE DE USUARIO. Ninguna opción está aprobada y ningún diseño, prueba o tarea de la base trata la opción B ni un camino de detección como aprobados.** Depende de la sección anterior, que está fuera del alcance base: **el requisito todavía NO estará cumplido tras la implementación base** y S61 sigue vigente para los contactos no bloqueados.

**Contradicción 1: bloqueo vs. aviso.** S61 (aceptada) dice que la indicación de `EMERGENCIA` (buscar ayuda y llamar al 911) **siempre sale de inmediato, sin importar la autonomía**. El bloqueo de `Contact.outboundBlock` (propuesta nueva, no acuerdo vigente) impediría esa indicación. Ambas reglas no pueden cumplirse a la vez para un contacto bloqueado que escribe una emergencia.

**Contradicción 2: la excepción puede ser inalcanzable.** Para un contacto bloqueado `inbound.js` guardaría el mensaje y **no invocaría agentes** (sección anterior). Sin agentes no se detecta la emergencia, no se crea la `Escalation` `EMERGENCIA` y el aviso nunca se intenta. Una excepción en el gate (opción B) es inalcanzable mientras no exista un **camino de detección** para esos mensajes. Esto es parte de la decisión pendiente y no queda resuelto aquí.

| Opción | Qué hace | Efectos legales y operativos | Efectos de prueba |
|---|---|---|---|
| **A. Bloqueo absoluto también para EMERGENCIA** | El gate devuelve `CONTACTO_BLOQUEADO` para el aviso del 911 | Respeta al pie de la letra un opt-out o bloqueo manual; riesgo humano grave si la persona sí tenía una emergencia (se queda sin indicación; si se detectara, el personal vería la `Escalation` `CRITICA` con «Aviso no enviado: CONTACTO_BLOQUEADO»). **Contradice S61**, que habría que enmendar | `CONTACTO_BLOQUEADO` para todo; `notice.status = 'BLOQUEADO'` |
| **B. Excepción explícita y auditada solo para el aviso fijo** | Con `purpose: 'AVISO_ESCALAMIENTO'`, `Escalation.type = 'EMERGENCIA'` y texto exactamente `EMERGENCY_NOTICE`, el gate omite `CONTACTO_BLOQUEADO`; sigue exigiendo ventana abierta y entrante previo. Se audita con `details.exception = 'EMERGENCIA_SOBRE_BLOQUEO'`. **Requiere además un camino de detección (abajo)** | Mantiene S61. El mensaje es de seguridad, responde a un mensaje que el propio contacto envió (dentro de la ventana de 24 h) y no es comercial; aun así, un opt-out estricto podría objetar que se le escribió a un contacto bloqueado: el riesgo legal es bajo pero no nulo y debe validarse con quien responda por la LFPDPPP | Prueba de la excepción (solo `EMERGENCY_NOTICE`, nada más) y de que `HANDOFF_NOTICE` y texto libre siguen bloqueados |
| **C. Alternativa** | El gate no envía, pero se crea una alerta prioritaria que obliga a una persona a contactar al lead por otro medio (llamada) y se muestra en la Bandeja y en una notificación al personal (hoy inexistente; PRD C1) | Evita escribirle a un bloqueado y no deja la emergencia sin atender, **pero** depende de notificaciones y de que alguien actúe a tiempo; hoy esas notificaciones no existen. También requiere un camino de detección | Prueba de la alerta prioritaria; requiere diseño de notificaciones |

**Camino de detección para contactos bloqueados** (necesario para B y C; subopciones, tampoco elegidas):

| Subopción | Qué hace | Riesgos |
|---|---|---|
| (1) Ejecutar solo `recepcion` acotada a `EMERGENCIA` | `inbound.js` invoca una variante restringida del orquestador cuyo único resultado aceptado es `EMERGENCIA`; cualquier otra salida se descarta sin efectos | Un LLM lee mensajes de un contacto que pidió no ser contactado (solo lectura, sin envío); requiere un modo restringido del orquestador y de su prompt que hoy no existe; costo por mensaje |
| (2) Regla determinista | Lista de frases de emergencia evaluada en `inbound.js` sin LLM | Falsos negativos (una emergencia mal escrita no se detecta) y falsos positivos; criterio a definir con el negocio |
| (3) Ninguno | No hay detección | Equivale a la opción A en la práctica, aunque se eligiera B en el gate |

**Cómo se implementa mientras no haya decisión.** **No se implementa nada de esto en el alcance base:** ni `outboundBlock`, ni `CONTACTO_BLOQUEADO`, ni la excepción (B), ni el camino de detección, ni la alerta (C). Todo es tarea **condicionada a la decisión (a)** y **no forma parte del orden de entregables base**; la base no codifica ninguna de las tres opciones.

## Pruebas que debe escribir backend (Vitest; sin LLM real; canal falso)

**Modelo y servicio (`escalations.test.js`)**
- Cada tipo crea la `Escalation` con prioridad y `pausesAI` correctos: `SOLICITUD_HUMANO`, `QUEJA_NEGOCIACION`, `FUERA_DE_CONOCIMIENTO` y `EMERGENCIA` pausan (`Conversation.mode = 'HUMANO'`); `PAGO` y `TRAMITE_RECEPCION` **no** pausan y no envían aviso (`notice.kind = 'NINGUNO'`, `status = 'NO_APLICA'`).
- **Respuesta + escalamiento sin pausa, ambos efectos, en `SUPERVISADO` y en `AUTONOMO`** (modo fijado explícitamente; `PAGO` y `TRAMITE_RECEPCION`): (1) en `SUPERVISADO`, un `Draft` `PENDIENTE` con el `reply` y 0 salientes; en `AUTONOMO`, un `Message` saliente con llave `reply:<inbound>` y 0 drafts; (2) la `Escalation` existe con `pausesAI: false` y `notice.status = 'NO_APLICA'`; (3) `Conversation.mode` sigue en `IA`. Además: rechazar el borrador no cierra la `Escalation`; si falla la creación del borrador, la `Escalation` ya existe.
- **Fallo sistémico (conducta única):** `PROVEEDOR`, `CONFIGURACION` y `TIMEOUT_TURNO` crean `FUERA_DE_CONOCIMIENTO` visible, sin pausa (modo `IA`), con **un solo** aviso estándar por el gate (una `Escalation` abierta, una llave `esc-notice:…:SISTEMICA:<id>`); un segundo fallo, aunque tenga otra causa sistémica, se fusiona (`occurrences` sube, sin segundo aviso y **sin respuesta alguna para ese segundo mensaje**: la prueba fija el silencio explícito: 0 mensajes salientes nuevos); `SALIDA_INVALIDA`, `CONFIANZA_BAJA`, `DESTINO_INEXISTENTE` y `CICLO` pausan y avisan.
- **Incidente sistémico: cierre manual y ocurrencias visibles (sin auto-recuperación):** (a) con un incidente abierto, un turno posterior de la misma conversación que completa con éxito (`RESPUESTA`, o un `ESCALAMIENTO` de agente) **no** lo cierra: sigue `ABIERTO` con su `dedupeKey`; (b) mientras siga abierto, tres fallos sistémicos posteriores (incluidas causas distintas) lo dejan con `occurrences: 4`, `lastInboundMessage` = el último, un solo aviso y 0 salientes nuevos, y `GET /escalations` expone `occurrences`, `lastInboundText` y `lastInboundAt`; (c) `PATCH` a `RESUELTO` lo cierra (`resolvedVia: 'MANUAL'`, `dedupeKey` eliminada, `ESCALAMIENTO_RESUELTO`, `crm:escalation` una vez); (d) un fallo posterior al cierre crea una `Escalation` **nueva** (otro id) y el lead recibe el aviso estándar de nuevo, **una vez** (dos avisos en total); (e) un incidente de **otra** conversación, o escalamientos ajenos (`SOLICITUD_HUMANO`, `PAGO`, `TRAMITE_RECEPCION`, `EMERGENCIA`, `CONFIANZA_BAJA`…) abiertos en la misma, no cambian al cerrar el sistémico; (f) un `PATCH` doble o simultáneo deja un solo ganador (el otro recibe `null`/409).
- **Aviso sin duplicar:** invocar dos veces `raiseEscalation` con el mismo entrante y tipo (reintento, o router + especialista) → una `Escalation`, un `Message` con llave `esc-notice:…`, un solo envío al canal; el segundo intento no reenvía y `notice` no regresa a `PENDIENTE`. Dos `raiseEscalation` en paralelo → una sola.
- **Idempotencia del registro de procesamiento (`EscalationInbound`):**
  La fusión solo existe para el incidente sistémico (A y B son entrantes distintos con causa sistémica en la misma conversación); `PAGO`/`TRAMITE_RECEPCION` no fusionan.
  (a) incidente sistémico abierto con A (registro `ORIGEN`); llega B (también falla) → mismo `Escalation`, registro `REPETICION`, `occurrences: 2`, `lastInboundMessage = B`, `ESCALAMIENTO_REPETIDO` una vez, sin segundo aviso. **Contraste:** `TRAMITE_RECEPCION` con A y luego con B (mensajes distintos, `summary`/`reason` distintos) → **dos** `Escalation`, cada una con su `summary` y `reason`, `occurrences: 1`, sin `dedupeKey`; igual con `PAGO`.
  (b) **Repetir B** (webhook duplicado, reintento, reproceso) → E11000 → no-op total: `occurrences` sigue en 2, sin auditoría ni evento nuevos, y los registros siguen siendo 2. Repetir el `TRAMITE_RECEPCION` de B → sigue habiendo 2 `Escalation`, sin cambios.
  (c) **Repetir B después de cerrar a mano** el incidente (la `dedupeKey` ya no existe) → no crea una `Escalation` nueva, ni cuenta, ni audita, ni emite.
  (d) **Concurrencia:** `Promise.all` de 10 llamadas con el mismo B → un solo registro, `occurrences: 2`, una sola auditoría; `Promise.all` con B1…B5 distintos sobre el incidente abierto con A → `occurrences: 6` exacto (y 6 registros); `Promise.all` de dos entrantes distintos sin incidente abierto que compiten por crearlo → una sola `Escalation` y el perdedor queda como `REPETICION` (corrección condicionada del rol), `occurrences: 2`; `Promise.all` de dos `TRAMITE_RECEPCION` distintos → dos `Escalation`. **Reintento del paso 3:** el perdedor choca por `dedupeKey`, la ganadora se cierra antes de la relectura (gancho `onStep('DEDUPE_CONFLICT')`) → el perdedor no reinserta el registro (sin segundo `EscalationInbound` ni E11000 propio) y crea su propia `Escalation` con el `target` preasignado, como `ORIGEN`, con un único registro.
  (d2) **Mismo entrante en paralelo, tipo no sistémico** (`SOLICITUD_HUMANO`): `Promise.all` de 5 `raiseEscalation` con el mismo entrante y tipo → **una** `Escalation`, **un** `Message` de aviso (un envío al canal), **una** pausa (`Conversation.mode = 'HUMANO'` y un solo `CONVERSACION_PAUSADA`), **una** `ESCALAMIENTO_CREADO`, un solo `crm:escalation` `created` y un registro. **Versión determinista del «dueño en vuelo»:** se inserta a mano el registro `ORIGEN` con un `target` sin `Escalation` (el dueño aún no ha creado nada) y se lanzan en paralelo dos reprocesos del mismo entrante → ambos intentan `Escalation.create({ _id: target })`; uno gana y aplica los efectos, el otro recibe E11000 sobre `_id` y hace no-op; resultado: una `Escalation` con `_id = target`, un aviso, una pausa, una auditoría. Un tercer reproceso posterior es no-op total (paso 2 a). Esta versión determinista ya ejercita la rama «E11000 sobre `_id` → no-op»; **no** se exporta ningún helper interno (`createOrigin` u otro) solo para pruebas.
  (d3) **Mismo entrante en paralelo, incidente sistémico:** sin incidente abierto, `Promise.all` de 5 `raiseEscalation` con el mismo entrante y causa `PROVEEDOR` → una `Escalation` con `dedupeKey`, `occurrences: 1`, un registro `ORIGEN`, un aviso con la llave `esc-notice:…:SISTEMICA:<id>`, una `ESCALAMIENTO_CREADO`, ninguna `ESCALAMIENTO_REPETIDO` y sin pausa. Con incidente abierto por A y el registro de B insertado a mano como `ORIGEN` con `target` propio (simula el perdedor por `dedupeKey` antes de corregirse), dos reprocesos de B en paralelo → una sola corrección condicionada (`REPETICION`), `occurrences: 2`, una `ESCALAMIENTO_REPETIDO`, sin aviso.
  (d4) **Fusión frente a cierre del incidente (carrera).** Incidente abierto por A. Se procesa B (falla sistémica) con el gancho `onStep('RECORD_INSERTED')` que, entre el paso 2 y el paso 4, hace el `PATCH` a `RESUELTO` del incidente de A (variante: el mismo cierre en `onStep('BEFORE_MERGE')`, entre el conteo y el `$max`, con el mismo resultado). Resultado: el incidente de A queda `RESUELTO` con `occurrences: 1` (B **no** quedó absorbido en él); el registro de B pasa a `ORIGEN` de una `Escalation` **nueva** (otro id, con `dedupeKey`, `occurrences: 1`, `lastInboundMessage = B`); el lead recibe el aviso estándar **una vez** por ese incidente nuevo (dos avisos en total en la conversación: el de A y el de B); `ESCALAMIENTO_CREADO` una vez para el nuevo y ninguna `ESCALAMIENTO_REPETIDO` para B. Reprocesar B después es no-op. Y el `PATCH` deja `status: 'RESUELTO'` y sin `dedupeKey` en una sola escritura (no hay estado intermedio observable: un `findOne` por `dedupeKey` tras el `PATCH` no devuelve el incidente cerrado).
  (e) **Más de 50 mensajes (sin tope):** 60 repeticiones distintas sobre el mismo incidente → `occurrences: 61` exacto, 61 registros; reenviar cada una de las 60 es no-op (todos idempotentes); tras **cerrarlo**, reprocesar el mensaje 51 no crea una `Escalation` nueva y no cambia nada.
  (f) **Caída entre pasos** (la caída se simula con un gancho que lanza): (i) `onStep('RECORD_INSERTED')` lanza tras insertar el registro `ORIGEN` (sin `Escalation`): reprocesar el mismo entrante crea la `Escalation` con el id preasignado, una vez, y no cuenta como repetición; `reconcileEscalations()` reporta el huérfano si nadie reprocesa; (ii) `onStep('BEFORE_MERGE')` lanza tras insertar un registro `REPETICION` sin `$max`: `reconcileEscalations()` deja `occurrences` = número de registros, sin duplicar; ejecutarla dos veces no cambia nada; si el incidente ya está `RESUELTO`, la conciliación lo **reporta** sin modificarlo ni reabrirlo; (iii) `onStep('ORIGIN_CREATED')` lanza tras crear la `Escalation` y antes del aviso: queda `notice.status = 'PENDIENTE'` y reprocesar el entrante es no-op total (sin aviso duplicado).
- **Aviso bloqueado por el gate queda registrado:** con `lastInboundAt` de hace más de 24 h o ausente (reloj inyectado) → `notice.status = 'BLOQUEADO'` con `reason`, **la Escalation existe** y la conversación **sí** se pausa (en los tipos que pausan). Canal que falla → `FALLIDO`. Llave previa → `DUPLICADO`.
- **`EMERGENCIA` antes de pausar:** un espía sobre `sendMessage` registra que, al llamarse, la conversación estaba en `IA`; el `Message` del aviso existe y su `createdAt` es anterior a `pausedAt`; el texto es exactamente `EMERGENCY_NOTICE`, aunque el LLM falso haya enviado otro `reply`; y sale igual con `SUPERVISADO`, sin `Draft`.
- **No pasa por supervisión:** en `SUPERVISADO`, un `SOLICITUD_HUMANO` envía el aviso sin crear `Draft`.
- `services/escalations.js` envía exactamente `HANDOFF_NOTICE` o `EMERGENCY_NOTICE` importados de `agents/noticeTexts.js` (la igualdad con el playbook la prueba `notice-texts.test.js`, paso 1).

**API (`escalations-api.test.js`)**: `GET` con filtros, orden por prioridad y conteos; `PATCH` con precedencia 400/404/200 sin cambio/409/422 (`PAGO`)/atómico; `RESUELTO` elimina `dedupeKey` en la misma operación (un `findOneAndUpdate`; se verifica que el documento devuelto ya no tiene `dedupeKey`); resolver no cambia el modo de la conversación; `crm:escalation` se emite en cada cambio (`emit` espiado); la vista no expone arreglos de absorbidos y expone `occurrences`, `lastInboundText` y `lastInboundAt`; `resolvedVia` solo toma `MANUAL`/`DEVOLUCION`.

**Tomar y devolver (posterior; cuando exista la fase 9 del ADR-003):** `take` pasa los `ABIERTO` a `EN_PROCESO`; `release` resuelve solo los que pausan (`DEVOLUCION`) y deja `TRAMITE_RECEPCION`; un mensaje humano sale con `purpose: 'HUMANO'` y respeta la ventana.

**Gate (`gate.test.js` ampliado + `gate-audit.test.js`)**
- *(Las pruebas de `CONTACTO_BLOQUEADO`, del motivo separado `SIN_ENTRANTE_PREVIO` y del aviso del 911 sobre contacto bloqueado **no son del alcance base**: ver la sección «Fuera del alcance base: bloqueo de contactos». La base no codifica la opción A, B ni C.)*
- **Fail closed con lectores inyectados** (`createGate({ findDraft, findEscalation, getAutonomy })`, §6; sin `mongoose.deleteModel` ni espías sobre clases de Mongoose): `findDraft` que devuelve `null` (Draft ausente), que **lanza**, o que devuelve un `Draft` de otra conversación, en `PENDIENTE`/`RECHAZADO`/`REEMPLAZADO`, con `finalText` distinto o con llave distinta → `BLOQUEADO`/`BORRADOR_NO_APROBADO`, 0 mensajes, 0 envíos al canal y `MENSAJE_BLOQUEADO`; `BORRADOR_APROBADO` sin `ref.draftId` → igual, sin llamar al lector. `findEscalation` que devuelve `null`, que lanza o que devuelve una `Escalation` de otra conversación → `AVISO_NO_AUTORIZADO`. `getAutonomy` que lanza o devuelve un valor desconocido → `REQUIERE_APROBACION`. Con lectores válidos (un `Draft` `ENVIANDO`/`APROBADO` coherente) → `ENVIADO`. La instancia por defecto (`sendMessage` exportado) usa los modelos reales: las pruebas de «Aprobación comprobada» la ejercitan con documentos en `fuerza-gym-crm-test`. Un agente que omite `purpose` con `SUPERVISADO` → `REQUIERE_APROBACION`. `gate.test.js` existente (sin `purpose`) sigue pasando sin cambios **siempre que `AGENT_AUTONOMY_DEFAULT` esté definido en `env.js` y `server/vitest.config.js` lo fije a `'AUTONOMO'`** (ambas cosas en el paso 2; hoy no existe ninguna).
- **«No iniciar contacto sin entrante previo» (base, §5):** `FUERA_DE_VENTANA_24H` con la ventana vencida (prueba existente) y, **nuevo en `gate.test.js`**, con `lastInboundAt` ausente para autor `AGENTE` (sin `purpose` y con `RESPUESTA_AUTONOMA`), `USUARIO` (`HUMANO`) y `AVISO_ESCALAMIENTO` con un `Escalation` válido → `BLOQUEADO`/`FUERA_DE_VENTANA_24H`, 0 `Message`, `MENSAJE_BLOQUEADO`. Se escribe en el paso 3 contra el gate endurecido; el comportamiento es el de hoy (`gate.js:32-36`), así que el mismo caso con autor `AGENTE` y sin `purpose` puede añadirse ya antes del paso 3 sin cambiar código. Las pruebas existentes siguen pasando.
- **Aprobación comprobada:** `BORRADOR_APROBADO` con un `Draft` `PENDIENTE`, `RECHAZADO` o de otra conversación → `BLOQUEADO` / `BORRADOR_NO_APROBADO`, 0 mensajes y 0 envíos al canal; con `ENVIANDO`/`APROBADO`, `finalText` igual y llave `draft:<id>` → `ENVIADO`; con `finalText` distinto del `text` o llave distinta → bloqueado. `RESPUESTA_AUTONOMA` con `SUPERVISADO` → `REQUIERE_APROBACION`; con `AUTONOMO` → enviado. `AVISO_ESCALAMIENTO` con un texto libre → `AVISO_NO_AUTORIZADO`.
- Auditoría: los cuatro resultados dejan su `AuditLog` con `details` (sin texto, con `textLength`); un bloqueado no crea `Message`; un duplicado no crea un segundo `Message` ni un segundo envío. `GET /audit/outbound` filtra por conversación y resultado.
- `outbox-rule.test.js` ampliado (§6, verificación estática).
- **Orden de entrega:** antes del paso 3, una prueba del flujo simulado (SUPERVISADO: borrador → aprobar → mensaje; AUTONOMO: envío directo) debe estar verde, y debe seguir verde después del endurecimiento.

**#96 (parte de este ADR; posterior):** con una `Escalation PAGO` abierta creada directamente en la base, el `PATCH` de etapa `PAGO_EN_REVISION → PERDIDO` con motivo la deja `RESUELTO` (`MANUAL`, nota = motivo) y la bitácora lo registra; sin esa transición, resolver un `PAGO` por `PATCH /escalations/:id` es 422. El rechazo del `Pago` queda pendiente hasta que exista el modelo.

**Cobertura del checkpoint (nivel 2 de evidencia, [ADR-005](ADR-005-orquestador-agentes.md) §10.2).** Estas pruebas usan LLM falso, canal falso o simulador y la base `fuerza-gym-crm-test`; acreditan persistencia, gate y auditoría, **no** la calidad del modelo real ni la interfaz (eso es el nivel 3, demostración manual, paso 8).

| Punto del checkpoint | Pruebas de este ADR que lo cubren (nivel 2) | Complemento |
|---|---|---|
| 1. «Hola, ¿cuánto cuesta?» → borrador | — (lo cubren `orchestrator.test.js` y `replies.test.js` de ADR-005 §9) | N3; N1: `ventas/recomienda-plan-con-horario-y-presupuesto` |
| 2. Aprobar → gate → simulador | `gate-audit.test.js`: «Aprobación comprobada» (`BORRADOR_APROBADO` con `Draft` `ENVIANDO`/`APROBADO` → `ENVIADO`; `PENDIENTE`/`RECHAZADO` → `BORRADOR_NO_APROBADO`) y «Fail closed»; entrega al simulador en `replies.test.js` (ADR-005 §9) | N3 |
| 3. Solicitud de persona → `Escalation` + «Requiere humano» | `escalations.test.js`: tipo `SOLICITUD_HUMANO` (prioridad, `pausesAI`), «No pasa por supervisión», aviso sin duplicar, aviso bloqueado registrado; `escalations-api.test.js` (vista y `activeCount`) | N3 (insignia y pestaña); el caso por crear `integracion/pide-persona-escala-sin-traspaso` (N1, paso 1 tarea 7) solo acredita el contrato |
| 4. `AuditLog` de envíos y bloqueos | `gate-audit.test.js` (cuatro resultados, bloqueos por `MODO_HUMANO`, `FUERA_DE_VENTANA_24H` —incluido el contacto sin entrante previo—, `BORRADOR_NO_APROBADO`, `REQUIERE_APROBACION` y `AVISO_NO_AUTORIZADO`; bloqueado sin `Message`; duplicado sin segundo envío; `GET /audit/outbound`) y `escalations.test.js` (`ESCALAMIENTO_CREADO`). «Bloqueos» aquí son los bloqueos del gate, **no** el bloqueo de contactos (fuera del alcance base) | N3 (muestra de la respuesta del endpoint; sin panel de UI) |
| 5. `/probar-agente ventas` | — (ninguna prueba de este ADR lo cubre: es nivel 1 con LLM REAL, ADR-005 §10.1; las pruebas N2 de este ADR no evalúan al modelo) | N1: línea «Mínimo académico (5 casos de ventas): CUMPLIDO» con exit 0 o 4 y cero C, más el bloque «Calidad del modelo» (ADR-005 §10.2); N3: reporte adjunto en el paso 8 |

**Lo que el checkpoint NO cubre tras la base:** el bloqueo de contactos y el aviso de `EMERGENCIA` sobre un contacto bloqueado (requisito todavía **no cumplido**; S61 vigente solo para contactos no bloqueados), el motivo separado `SIN_ENTRANTE_PREVIO` (el bloqueo sin entrante previo sí está cubierto, con el motivo `FUERA_DE_VENTANA_24H`), la auto-recuperación del incidente sistémico y el panel de auditoría en la UI.

## Tareas

**Orden global de implementación** (la numeración de los **pasos 1 a 8** es idéntica a la de [ADR-005](ADR-005-orquestador-agentes.md); las **tareas** de backend/frontend se numeran por ADR; en todo momento debe seguir funcionando el flujo simulado de desarrollo y `npm test` en verde):

1. **Piezas puras de ADR-005**, sin modelos ni gate: configuración, tipos de escalamiento, contrato, `replyGuard`, textos fijos, historial, contexto, orquestador, ayudas de prueba. Sin cambiar `connected`. **Único paso autorizado (2026-11-06)**, en las entregas 1a–1d de ADR-005; los pasos 2 a 8 de esta lista **no están autorizados**.
2. **Modelos y servicios sin tocar el gate:** `Draft`, `AgentSetting`, `Escalation` y `EscalationInbound`; `services/autonomy.js`; `replyGenerator.js` y `services/replies.js` con el generador **SIMULADO** (crea borrador en `SUPERVISADO`, envía en `AUTONOMO`); `services/drafts.js` (crear/aprobar/rechazar) pasando `purpose` y `ref` desde la primera versión; rutas de borradores y autonomía (ADR-003 fases 4–5). El gate actual ignora `purpose`/`ref`, así que su comportamiento no cambia.
3. **Endurecimiento del gate fail-closed** (solo ahora): `purpose`/`ref`, `createGate` con lectores inyectables, verificación del `Draft`, comprobación por propósito, auditoría de los cuatro resultados, índices de `AuditLog` y `GET /audit/outbound`; conserva y prueba el bloqueo sin entrante previo (`FUERA_DE_VENTANA_24H`). **Sin** bloqueo de contactos ni el motivo separado `SIN_ENTRANTE_PREVIO`. El gate **nunca** permite `BORRADOR_APROBADO` sin un `Draft` verificable (`ENVIANDO`/`APROBADO`, `finalText` igual, misma conversación, llave `draft:<id>`).
4. **Escalamientos:** `services/escalations.js` (registro de procesamiento, aviso, pausa, incidente sistémico con cierre manual, conciliación), rutas y vistas.
5. **Cableado del orquestador** (`AGENT_RUNTIME=LLM`) en `replies.js`; `connected: true` de `recepcion` y `ventas`. **Nada del orquestador llega al gate antes de este paso.**
6. **UI:** Bandeja (Escalamientos), insignias, Simulador.
7. **QA «qa-conversaciones»:** `evalAgents.js` y `/probar-agente` (ADR-005 §10; nivel 1 de evidencia). `/probar-agente ventas` corre los 13 casos de `ventas.json`; `integracion.json` es un archivo pendiente de creación (ADR-005 paso 1, tarea 7) y sus casos están por crear.
8. **Evidencia: demostración manual (nivel 3, ADR-005 §10.2):** guion y captura del recorrido en simulador y Bandeja (borrador, aprobar, mensaje en el simulador, insignia «Requiere humano», auditoría de envíos) y reporte de `/probar-agente ventas` con LLM REAL. Entregable final.

**Fuera del alcance base y condicionadas a la decisión (a):** bloqueo de contactos (`Contact.outboundBlock`, `block`/`unblock`, `CONTACTO_BLOQUEADO`, no invocar agentes para bloqueados, botones e insignia «Bloqueado», `contact-block.test.js`), excepción del gate para `EMERGENCY_NOTICE` (opción B), camino de detección, alerta prioritaria (opción C). **Tras la base el requisito de bloqueo todavía NO estará cumplido.** **Pospuestos:** auto-recuperación del incidente sistémico, el motivo separado `SIN_ENTRANTE_PREVIO` (solo cambio de motivo), panel de auditoría en la UI. **Posteriores al checkpoint:** tomar y devolver (ADR-003 fase 9) y cierre por pagos (#96).

**Backend (`server/`)**

Paso 1 (autorizado; lo detalla ADR-005, entrega 1a): `agents/escalationTypes.js` y `agents/noticeTexts.js`, con `notice-texts.test.js` y `orchestrator-rule.test.js`. Nada más de este ADR entra en el paso 1.

Paso 2 — modelos y servicios (sin gate) — **no autorizado todavía**
1. `models/Escalation.js` y `models/EscalationInbound.js` con sus índices (tipos de `agents/escalationTypes.js`, paso 1), exportados en `models/index.js` (obligatorio para `clearTestDb`), junto con `Draft`, `AgentSetting` y `services/autonomy.js` (ADR-003 §1–§3). El valor inicial de la autonomía sigue siendo `SUPERVISADO`.
2. **`config/env.js` y `server/vitest.config.js`** (archivos de `server/`; los edita backend), en el mismo entregable: **definir** `AGENT_AUTONOMY_DEFAULT` en `env.js` según ADR-003 (**hoy no existe**; S56 lo describe como plan), con su prueba en `config.test.js`, y **después** fijar `AGENT_AUTONOMY_DEFAULT: 'AUTONOMO'` en `vitest.config.js` para que `gate.test.js`, `simulator.test.js` y `crm.test.js` sigan en verde (fijarlo antes de definirlo no tendría efecto). `AGENT_RUNTIME` se define y se fija a `'SIMULADO'` en el paso 1 (ADR-005). Las pruebas nuevas fijan el modo de forma explícita.
3. `replyGenerator.js`, `services/replies.js` (generador SIMULADO), `services/drafts.js` (crear/aprobar/rechazar con `purpose`/`ref`) y rutas de borradores y autonomía (ADR-003 fases 4–5). Prueba del flujo simulado verde.

Paso 3 — gate fail-closed (requiere el paso 2)
4. `outbox/gate.js`: `createGate({ findDraft, findEscalation, getAutonomy })` con lectores por defecto sobre los modelos y `export const { sendMessage } = createGate()` (firma compatible), `purpose` y `ref`, comprobaciones por propósito **en modo fail-closed** (§6; toda decisión en el gate, los lectores solo leen), textos de aviso importados de `agents/noticeTexts.js`, auditoría de los cuatro resultados (`MENSAJE_DUPLICADO`, `details` estándar), índices de `AuditLog` y `GET /audit/outbound`; se conserva el bloqueo sin `lastInboundAt` (`FUERA_DE_VENTANA_24H`). **Sin** `Contact.outboundBlock`, `CONTACTO_BLOQUEADO`, el motivo `SIN_ENTRANTE_PREVIO`, rutas `block`/`unblock` ni cambios en `inbound.js`. `gate.test.js` (las pruebas existentes sin cambios y verdes; se **añaden** las de «no iniciar contacto sin entrante previo», §5), `gate-audit.test.js` (fail-closed con lectores inyectados) y `outbox-rule.test.js` ampliados (§6, incluida la regla de `createGate` y de `noticeTexts.js`).

Paso 4 — escalamientos (requiere los pasos 1 y 2; el aviso exige el paso 3)
5. `services/escalations.js` (`raiseEscalation` con el orden de §1 —árbitro `create` por `_id`, correcciones y reasignaciones condicionadas, fusión condicionada a incidente abierto, gancho `onStep` con los nombres de `ESCALATION_STEPS`— e identidad de incidentes, `reconcileEscalations` (no necesaria para el checkpoint; mínimo: recálculo en incidentes abiertos y reporte de huérfanos; el reporte de incidentes resueltos con registros sin contar es prescindible, §1), aviso con `HANDOFF_NOTICE`/`EMERGENCY_NOTICE` de `agents/noticeTexts.js`, pausa; **sin** `autoRecoverSystemic`), `PATCH` con cierre atómico (`$set` + `$unset dedupeKey` en un `findOneAndUpdate`), `serializeEscalation` (con `lastInboundText`/`lastInboundAt`), `routes/escalations.js` (`GET`, `GET :id`, `PATCH`) montado en `app.js`, `openEscalations` en `GET /contacts`, `escalation` en la respuesta del simulador; `reconcileEscalations()` al arrancar.
6. `escalations.test.js` y `escalations-api.test.js`.

Paso 5 — cableado (ADR-005): `replies.js` aplica `result.escalation` **antes** de crear el borrador (sin auto-recuperación).

**Frontend (`client/`)** — paso 6 (requiere el paso 4 de backend)
1. Bandeja: pestaña Escalamientos (§4) en `Inbox.jsx`, con contador, filtros, tarjetas, acciones y escucha de `crm:escalation`; manejo de 409/422; indicador combinado en la navegación.
2. Conversaciones/ContactPanel: insignia «Requiere humano». (Fuera del alcance base: insignia «Bloqueado», botones Bloquear/Desbloquear y panel «Auditoría de envíos».)
3. Simulador: mostrar «La IA se pausó: <tipo>» y el resultado del aviso al recibir `escalation`; el aviso llega como mensaje por `simulator:outbound`.
4. `labels.js`: etiquetas en español de los tipos, estados, causas, motivos de bloqueo del gate (`MODO_HUMANO`, `FUERA_DE_VENTANA_24H`, `BORRADOR_NO_APROBADO`, `REQUIERE_APROBACION`, `AVISO_NO_AUTORIZADO`) y `resolvedVia` (`MANUAL`, `DEVOLUCION`).

## Diferencias con el maestro y acuerdos vigentes — decisiones del usuario (2026-11-06)

El documento «maestro» no está en el repositorio (`Grep` sin resultados). El 2026-11-06 el usuario ratificó (i), (ii), (iii) y (v); (iv) sigue pendiente. Ver también [ADR-005](ADR-005-orquestador-agentes.md), que desarrolla (i), (ii) y (iv). Los datos `[CONFIRMAR]` (incluidos los textos fijos del playbook) siguen siendo de simulación y conservan sus marcas.

**(i) Umbral de confianza — RATIFICADO 0.5 (2026-11-06)** (alternativa del maestro 0.6, no adoptada). En este ADR el umbral determina cuántos escalamientos con `cause = 'CONFIANZA_BAJA'` se crean (cada uno pausa y exige que alguien tome la conversación). Con 0.6 habría más escalamientos y más carga para Recepción; con 0.5 llegan más respuestas dudosas a la Bandeja de borradores. Recomendación que se conserva para el futuro: medir la distribución de `confidence` y el volumen de `CONFIANZA_BAJA` y reevaluar 0.6 antes de `AUTONOMO`.

**(ii) Etapa al aprobar — RATIFICADO: aprobar NO cambia la etapa (2026-11-06).** La propuesta `stage` no se aplica. Este ADR no toca etapas salvo el cierre de `Escalation PAGO` en `PAGO_EN_REVISION → PERDIDO`. **Diferencia declarada con el checkpoint del maestro: su punto literal «aprobar cambia la etapa» NO se cumple** y no se presenta como cumplido. Alternativa no adoptada (aplicar la propuesta al aprobar): riesgos descritos en ADR-005 (dos escritores de la etapa, carrera con S41 —que se aplica al recibir el segundo entrante, aprobado o no— y con el `PATCH` manual, el LLM dirigiendo el pipeline y la enmienda del PRD §3.3).

**(iii) Representación de «requiere humano» — RATIFICADO (2026-11-06): `Escalation` separada del `Draft`**, persistida + señal visible (pestaña, contador, insignia, evento). Autonomía inicial `SUPERVISADO` también ratificada (los avisos no se supervisan, S61). Alternativa **rechazada**: un borrador con texto vacío. Razones: (1) un `Draft` exige `proposedText` de 1 a 4096 caracteres y «Aprobar» enviaría un mensaje vacío por el gate; (2) el PRD §3.3 y el ADR-003 §9 separan borradores y escalamientos, y el índice único por `inboundMessage` impide tener a la vez un borrador y un escalamiento del mismo mensaje (`TRAMITE_RECEPCION`); (3) falsea las estadísticas de aprobación (S59) y la métrica de intervenciones humanas por tipo (PRD §8); (4) haría pasar por la supervisión un aviso que debe salir directo y antes de pausar (S61), o bien bloquearía una emergencia hasta que alguien aprobara; (5) perdería los campos propios (tipo, prioridad, causa, resultado del aviso, resolución).

**(iv) Bloqueo frente a `EMERGENCIA` (A/B/C) y detección — SIGUE PENDIENTE DE USUARIO (a).** Ver la sección propia arriba. **(v) `AGENT_RUNTIME=SIMULADO` como valor por defecto — RATIFICADO (2026-11-06)** (ADR-005).

**Puntos abiertos que este diseño NO resuelve:**
- **#119:** inyección o mensaje fuera de alcance → **por defecto, lo vigente (S73): `FUERA_DE_CONOCIMIENTO` con pausa**, marcado como pendiente de decisión. Si el usuario decide solo ignorar o redirigir, el cambio es del prompt y de la regla de pausa, no del modelo `Escalation`.
- **#120:** coherencia de SPEI (`TRAMITE_RECEPCION` vs derivar a `pagos`). Abierto; no se elige criterio.
- **#101, #107, #110, #118:** sin cambios.

## Consecuencias

- (+) La solicitud de humano queda persistida, visible y con el resultado del aviso, incluso si el canal falla; las emergencias avisan antes de pausar.
- (+) El gate pasa a verificar por código que nadie envía texto libre de un agente sin aprobación (salvo `AUTONOMO` y avisos de texto fijo) y audita los cuatro resultados.
- (+) La idempotencia no tiene tope ni depende de arreglos acotados: un entrante se procesa una sola vez para siempre.
- (+) Una caída del proveedor no paraliza todas las conversaciones y deja un incidente visible, con ocurrencias y último mensaje, que una persona cierra.
- (+) Cada solicitud de trámite o pago conserva su propio resumen: no se pierde información por fusionar.
- (−) Durante un incidente sistémico, los mensajes posteriores del lead no reciben respuesta (solo el primero recibe el aviso): silencio explícito aceptado, visible en la Bandeja. Y como el incidente no se cierra solo, un lead puede quedar sin avisos de nuevos fallos hasta que alguien lo cierre.
- (−) Un lead que insiste en un trámite genera varias tarjetas `TRAMITE_RECEPCION` (sin fusión por contenido).
- (−) Una colección más (`escalation_inbounds`) que crece con cada entrante escalado y requiere conciliación tras una caída.
- (−) El gate crece en responsabilidades (propósito, autonomía, borradores, escalamientos) y se acopla a esos modelos.
- (−) El bloqueo de contactos queda fuera del alcance base: el requisito de bloqueo / aviso de `EMERGENCIA` sobre contacto bloqueado todavía NO está cumplido tras la implementación base (S61 vigente solo para no bloqueados). Mientras no se decida (a) no hay opt-out técnico, y un lead en `HUMANO` que vuelve a escribir no dispara alerta (pendientes).
- (−) Sin autenticación (#41), cualquiera puede resolver escalamientos o bloquear contactos; el actor es provisional (S58).
- (−) Faltan notificaciones al personal por WhatsApp y email y el aviso fuera del horario de recepción (PRD C1, playbook §6).
- (−) Los avisos son un solo texto estándar: no distinguen privacidad, menores ni cancelación (el playbook §8.5 sigue `[PENDIENTE]`).
- (−) Las métricas del PRD §8 deben separar `source = SISTEMA` de los escalamientos del agente para no atribuir a la IA fallos de infraestructura (#53).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Arreglo `absorbed` (máx. 50) dentro de `Escalation` con `$addToSet` | Tope arbitrario, operación condicionada frágil y reprocesos del mensaje 51 en adelante sin protección; la colección `EscalationInbound` no tiene tope |
| Mantener el índice único `{inboundMessage, type}` también en `Escalation` | Duplica la autoridad de idempotencia y añade una segunda fuente de E11000 |
| Borrador con texto vacío como señal de «requiere humano» | Ver (iii): envía vacíos, mezcla conceptos y falsea métricas |
| Que el aviso lo redacte el LLM | Un mensaje de seguridad o de canalización no puede variar ni inventar; son constantes del playbook |
| Supervisar el aviso de escalamiento | Una emergencia no puede esperar una aprobación (S61, ADR-003 D5) |
| Pausar primero y avisar después | El gate bloquea al agente en `HUMANO`; el aviso nunca saldría |
| Condicionar la pausa a que el aviso se envíe | Una caída del canal dejaría al lead sin respuesta humana ni de IA |
| Pausar también ante fallos del proveedor | Una caída dejaría a todos los leads en `HUMANO` |
| Reenviar el aviso en cada mensaje fallido del incidente | Spam al lead durante una caída; se acepta el silencio y se hace visible |
| Auto-recuperación del incidente sistémico en el alcance base | Carrera entre un turno sano y otro que abre o fusiona un incidente de la misma conversación; se pospone hasta serializar por conversación o reintentar el paso 1. Costo aceptado: el incidente se cierra a mano y puede silenciar avisos mientras tanto |
| Que una futura auto-recuperación cierre cualquier escalamiento de la conversación | Cerraría escalamientos de personas, pagos o trámites que nadie atendió; solo podría tocar el sistémico |
| Fusionar `PAGO`/`TRAMITE_RECEPCION` por huella del contenido (`dedupeKey` con hash) | `handoff.reason` es texto libre: colapsaría trámites distintos y perdería la información de la segunda solicitud; se elige una `Escalation` por entrante |
| Fusionar `PAGO`/`TRAMITE_RECEPCION` repetidos en `occurrences` | Perdía el `summary` y `reason` de las solicitudes distintas; el costo de más tarjetas es menor |
| Cerrar con `release` también los que no pausan | Un `TRAMITE_RECEPCION` podría cerrarse sin haberse hecho |
| Resolver `PAGO` con `PATCH` | Habría un camino manual al cierre de pagos sin pasar por el flujo de pagos (regla de oro 3) |
| Un solo mecanismo «exclusión» para opt-out y seguimientos | El opt-out debe detener toda salida; la exclusión (F4) solo los seguimientos |
| Elegir A, B o C para `EMERGENCIA` sobre un contacto bloqueado | No es decisión del arquitecto: queda pendiente de usuario (a) |
| Comprobar la aprobación solo en las rutas | No cubre llamadas laterales al gate; la comprobación va en el gate |
| Resolver `Draft`/`Escalation` con `mongoose.models` y probar la ausencia con `deleteModel` | Restaurar con `mongoose.model` crea una clase nueva y un espía puede no apuntar al modelo que usa el gate; los lectores inyectados en `createGate` son deterministas |
| Distinguir «registro `ORIGEN` en vuelo» de «caído» por antigüedad del registro | Umbral arbitrario y frágil; intentar el mismo `create` con `_id` preasignado y tratar E11000 sobre `_id` como no-op es más simple y seguro |
| Fusionar con `$max` sin condicionar al estado del incidente | Un mensaje procesado durante el cierre quedaría absorbido en un incidente `RESUELTO`, sin aviso ni incidente nuevo |
| Introducir ya `SIN_ENTRANTE_PREVIO` en la base | Solo cambia el nombre del motivo; el bloqueo ya existe y se conserva y prueba con `FUERA_DE_VENTANA_24H` |
| Endurecer el gate antes de que existan los borradores | Rompería el flujo simulado de desarrollo (se endurece en el paso 3, no antes) |
| `AuditLog` y `Message` duplicando cada intento | `Message` es el registro del canal; los intentos sin envío viven solo en `AuditLog` |
| Notificar a Recepción por WhatsApp y email en esta fase | Dependen de plantillas, proveedor de email y números del staff (#13, #18, #19) |

## Supuestos y pendientes propuestos (sin numerar)

La sesión principal les asignará numeración al incorporarlos a `docs/SUPUESTOS.md` y `docs/PENDIENTES.md` tras la aceptación del ADR. Solo se citan números ya existentes (S1–S74, #1–#122).

**Supuestos**
- **Prioridades por tipo:** `EMERGENCIA` crítica; `SOLICITUD_HUMANO` y `QUEJA_NEGOCIACION` altas; `PAGO` alta; `FUERA_DE_CONOCIMIENTO` y `TRAMITE_RECEPCION` normales.
- **Registro de procesamiento como autoridad de idempotencia:** colección `escalation_inbounds` con índice único `{inboundMessage, type}`, sin TTL ni tope; el primer resultado de un entrante prevalece ante reprocesos.
- **Fallos sistémicos:** `PROVEEDOR`, `CONFIGURACION` y `TIMEOUT_TURNO` no pausan y avisan una vez por incidente; los mensajes posteriores fusionados no reciben respuesta (silencio explícito aceptado), siguen contándose y visibles (`occurrences`, último mensaje, antigüedad) y el incidente se **cierra solo a mano** (`resolvedVia`: `MANUAL`|`DEVOLUCION`).
- **Identidad de incidentes:** solo el incidente sistémico (`<conversationId>:SISTEMICA`) se fusiona; `PAGO`, `TRAMITE_RECEPCION` y los demás tipos crean una `Escalation` por mensaje entrante, sin `dedupeKey`; la idempotencia por entrante la da `EscalationInbound`.
- **Gate base mínimo:** `purpose`/`ref`, fail-closed con lectores inyectados (`createGate({ findDraft, findEscalation, getAutonomy })`; la decisión siempre en el gate; `createGate` solo lo usan las pruebas), bloqueo sin entrante previo conservado con el motivo `FUERA_DE_VENTANA_24H` y probado, auditoría de los cuatro resultados y `GET /audit/outbound`; sin `CONTACTO_BLOQUEADO` ni el motivo separado `SIN_ENTRANTE_PREVIO`.
- **Textos fijos** en el módulo puro `agents/noticeTexts.js` (ADR-005 §4); `outbox/notices.js` no existe.
- **Concurrencia de `raiseEscalation`:** los efectos de `ORIGEN` los aplica solo quien gana `Escalation.create` con el `_id` preasignado (E11000 sobre `_id` = no-op, sin distinguir «en vuelo» de «caído»); las correcciones y reasignaciones del registro son actualizaciones condicionadas y solo quien modifica aplica efectos; la fusión en el incidente sistémico está condicionada a que siga abierto y, si se cerró entre medias, el mensaje origina un incidente nuevo con su aviso (como máximo una reasignación por llamada); el cierre pasa a `RESUELTO` y quita `dedupeKey` en una sola operación.
- **`config/env.js` y `server/vitest.config.js`:** backend define `AGENT_AUTONOMY_DEFAULT` en `env.js` y lo fija a `'AUTONOMO'` en `vitest.config.js` en el paso 2 (hoy no existe ni se fija); `AGENT_RUNTIME` se define y se fija en el paso 1 (ADR-005).
- **Avisos:** un único texto estándar (`HANDOFF_NOTICE`) para todas las causas que avisan, y el aviso del 911 como texto fijo del sistema. Ambos son `[CONFIRMAR]`: datos de simulación que conservan su marca.
- **Decisiones ratificadas (2026-11-06):** «requiere humano» = `Escalation` separada del `Draft`; autonomía inicial `SUPERVISADO`; umbral 0.5; aprobar no cambia la etapa (diferencia declarada: el punto literal «aprobar cambia etapa» del maestro no se cumple); `AGENT_RUNTIME=SIMULADO` por defecto.
- **Ganchos de prueba de `raiseEscalation`:** `onStep` con nombres fijos `RECORD_INSERTED`, `DEDUPE_CONFLICT`, `BEFORE_MERGE` y `ORIGIN_CREATED` (`ESCALATION_STEPS`); no se exportan helpers internos solo para pruebas.
- **`reconcileEscalations()`:** no es necesaria para el checkpoint; mínimo recomendado: recálculo en incidentes abiertos y reporte de huérfanos.
- **Gate:** `purpose` por defecto = el más restrictivo para un agente; nuevo `MENSAJE_DUPLICADO` y `details` estándar sin texto. (El motivo `SIN_ENTRANTE_PREVIO` separado de `FUERA_DE_VENTANA_24H` queda pospuesto; el bloqueo sin entrante previo sigue en la base.)
- **Bloqueo de contactos (fuera del alcance base, propuesta sin aprobar):** `outboundBlock` solo lo cambiaría una persona; sin excepciones; un contacto bloqueado no invocaría agentes. **El requisito de bloqueo / aviso de `EMERGENCIA` sobre contacto bloqueado todavía NO estará cumplido tras la base; S61 sigue vigente para contactos no bloqueados.**

**Pendientes**
- **Decisión de usuario (a):** bloqueo frente a `EMERGENCIA` (A/B/C) y camino de detección para contactos bloqueados (ejecutar solo `recepcion` acotada a `EMERGENCIA`, regla determinista o ninguno). **Fuera del alcance base: el requisito todavía NO estará cumplido tras la implementación base.**
- **Pendiente posterior: auto-recuperación del incidente sistémico** (`AUTO_RECUPERACION`): resolver antes la carrera con otro turno de la misma conversación (serializar por conversación o reintentar el paso 1).
- **Pendiente posterior:** el motivo separado `SIN_ENTRANTE_PREVIO` (solo cambio de motivo, con su prueba ajustada en el mismo cambio) y panel de auditoría de envíos en la UI.
- **Conciliación de incidentes resueltos con registros sin contar:** `reconcileEscalations()` solo los reporta; falta definir quién los revisa y cómo se muestran.
- **Autorización de los pasos 2 a 8:** solo el paso 1 está autorizado (2026-11-06); modelos, gate, servicio de escalamientos, rutas y UI de este ADR requieren una nueva autorización.
- **Conciliación periódica:** programar `reconcileEscalations()` (hoy solo al arrancar) y definir qué hacer con registros `ORIGEN` huérfanos que nadie reprocesa.
- **Aviso fuera del horario de recepción** (playbook §6): requiere el horario como configuración.
- **Lead que escribe en modo `HUMANO`:** sin alerta para la persona (relacionado con #97).
- **Notificaciones al personal** (PRD C1): WhatsApp, email y alerta sonora configurable.
- **Cierre de `Escalation PAGO` por rechazo o cancelación del `Pago`:** queda para el modelo Pago.
- **Métricas del PRD §8:** separar `source = SISTEMA` de los escalamientos del agente.
