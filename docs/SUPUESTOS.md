# Supuestos — Fuerza Gym CRM

Decisiones que se tomaron sin confirmación explícita para poder avanzar. Si alguna es incorrecta, hay que corregirla aquí y en el [PRD](PRD.md).

## Producto y negocio

| # | Supuesto | Por qué |
|---|---|---|
| S1 | Hay **1 sucursal** y no se requiere multi-tenant | Respuesta de la entrevista. Se evita la complejidad de separar datos |
| S2 | El **horario de atención humana** es el **horario de recepción**, distinto del horario del gimnasio: L-V de 7:00 a 21:00, sábado de 8:00 a 18:00 y domingo de 9:00 a 14:00; en festivos con horario reducido, de 9:00 a 13:00 ([horarios.md](negocio/horarios.md)) `[CONFIRMAR]`. La métrica de confirmación de pagos se mide en ese horario | Entrevista de negocio del 2026-10-23 (Fase 4). Reemplaza la respuesta original ("el horario del gym") |
| S3 | En un escalamiento `PAGO` **la IA no se pausa**: sigue respondiendo otras dudas, pero nunca confirma el pago. En los demás escalamientos la IA **sí se pausa** hasta que un humano devuelva la conversación | El pago solo requiere validación, no conversación humana. Los otros casos sí requieren que hable una persona |
| S4 | Un pago confirmado crea una **membresía**. La vigencia **empieza el día en que recepción confirma** el pago, se cuenta en **días naturales** desde las 00:00 (`America/Mexico_City`) y termina antes de las 00:00 del día siguiente al último día contratado. Una **renovación anticipada** se encadena al final de la vigencia actual; una renovación tras vencer empieza al confirmar. No hay renovación automática. **Excepción:** solo recepción o administración pueden corregir la fecha de activación, como corrección administrativa justificada y registrando en la bitácora quién, cuándo y por qué; no se permite alterar fechas para extender una membresía, y la IA nunca modifica fechas (no implementado, PENDIENTES #46) ([catalogo.md §5](negocio/catalogo.md)) `[CONFIRMAR]` | Se necesita para el recordatorio de renovación. Precisado en la entrevista de la Fase 4 |
| S5 | Los pagos en **efectivo o tarjeta en sucursal** los registra Recepción manualmente en el CRM | No hay integración con la terminal ni con la caja |
| S6 | La **visita es gratuita**, una por persona, sin pago previo, con identificación presentada en persona y confirmada por recepción. No incluye clases grupales ([catalogo.md](negocio/catalogo.md), [horarios.md §5](negocio/horarios.md)) `[CONFIRMAR]` | Es el caso común. Precisado en la entrevista de la Fase 4 (#27) |
| S7 | Datos del lead en el MVP: **nombre, teléfono y horario preferido**, además del origen capturado automáticamente. No se piden objetivo fitness, edad ni email | Respuesta de la entrevista |
| S8 | Las metas de métricas del PRD son una **propuesta inicial** y se recalibran tras 4 semanas de línea base | No hay datos históricos |
| S9 | Recepción puede ver el dashboard de métricas en modo solo lectura. Solo Admin edita el conocimiento, los usuarios y la configuración | Permisos mínimos razonables |

## WhatsApp / Meta

| # | Supuesto | Por qué |
|---|---|---|
| S10 | Se usará la **WhatsApp Cloud API oficial de Meta** con un número dedicado | Respuesta de la entrevista |
| S11 | "Seguimiento solo dentro de la ventana de 24 h" aplica a los **seguimientos comerciales**. Los mensajes **transaccionales** (recordatorio de visita, recordatorio de renovación, bienvenida fuera de la ventana y alertas al staff) **sí usan plantillas de utilidad** | El usuario pidió el recordatorio de renovación y las alertas por WhatsApp, que no son posibles sin plantillas cuando la ventana está cerrada |
| S12 | Las alertas al staff salen **desde el mismo número del negocio** hacia los teléfonos del staff, usando una plantilla de utilidad | Evita mantener un segundo número |
| S13 | La media de WhatsApp (imágenes, PDF, audios) se **descarga y se guarda** en almacenamiento propio, porque las URLs de Meta expiran | Los comprobantes deben conservarse para auditoría |
| S14 | El costo por mensaje de Meta (plantillas de utilidad) **no se cuenta** en el presupuesto de $50 USD | Es variable y depende del volumen. Se reporta por separado |

## IA

| # | Supuesto | Por qué |
|---|---|---|
| S15 | El proveedor de LLM es **Anthropic Claude**, con modelos distintos por agente según su complejidad (pendiente #30) | Respuesta de la entrevista. Optimiza el costo |
| S16 | El agente de pagos puede usar **visión** para leer el comprobante (monto, fecha, banco) y **pre-llenar** el registro de pago, como ayuda para Recepción. **Nunca decide** si el pago es válido | Agiliza el HITL sin violar el límite "nunca confirma un pago" |
| S17 | Las notas de voz se transcriben con un **servicio externo de STT**, porque Claude no recibe audio (pendiente #16) | Limitación técnica |
| S18 | El conocimiento es **estructurado y pequeño** (planes, FAQ, horarios), así que se inyecta en el contexto del agente en lugar de usar RAG con embeddings | Con este volumen de contenido, RAG agrega complejidad sin beneficio |
| S19 | Se detecta que una pregunta está "fuera de conocimiento" cuando el agente no encuentra el dato en la base de conocimiento. En ese caso escala en lugar de responder | Política conservadora contra alucinaciones |
| S20 | Los prompts y la definición de los agentes viven en el código o la configuración del servidor, **no son editables desde la interfaz** en el MVP. Lo editable es el conocimiento | Reduce el riesgo de que un cambio rompa los límites duros |

## Agenda

| # | Supuesto | Por qué |
|---|---|---|
| S21 | Se usa **un único calendario de Google** para las visitas y clases de prueba. La disponibilidad se calcula con huecos libres dentro del horario del gimnasio y reglas de cupo configurables (pendiente #15) | Respuesta de la entrevista ("Google Calendar") |
| S22 | Recepción marca manualmente en el CRM si el lead **asistió o no** a la visita | No hay control de acceso integrado |

## Pagos

| # | Supuesto | Por qué |
|---|---|---|
| S23 | Mientras no haya proveedor de pagos, el link de pago es un **campo opcional por plan**. Si está vacío, el agente solo ofrece SPEI o pago en sucursal | Permite lanzar sin integración |
| S24 | Incluso si en el futuro se integra una pasarela con webhook, el MVP mantiene la **confirmación humana** de todos los pagos | Requisito explícito: "todo comprobante lo revisa el equipo del gimnasio" |

## Técnico

| # | Supuesto | Por qué |
|---|---|---|
| S25 | Stack: **MongoDB Atlas + Express + React + Node.js**, desplegado en Render o Railway | Respuesta de la entrevista |
| S26 | Tiempo real en el CRM con **WebSockets** (por ejemplo, Socket.IO) | Necesario para la bandeja y las alertas sonoras |
| S27 | El webhook de Meta responde de inmediato y el procesamiento con IA se hace en una **cola o en un proceso asíncrono**, con idempotencia por `message_id` | Meta reintenta si no recibe respuesta a tiempo, lo que generaría duplicados |
| S28 | La zona horaria única es `America/Mexico_City` | Aguascalientes usa la hora del centro |
| S29 | Autenticación con email y contraseña más JWT o sesión. Sin SSO en el MVP | Hay pocos usuarios internos |
| S30 | Monorepo con **npm workspaces** (`client/` y `server/`) y scripts en la raíz | Un solo `npm install` y comandos unificados |
| S31 | Las pruebas usan **Vitest** en el client y en el server, con Supertest para la API | Va bien con Vite y con ESM sin configuración extra |
| S32 | El canal se elige con `WA_PROVIDER=simulator\|meta`. Por defecto es `simulator` en desarrollo y en pruebas | Ver [ADR-001](decisiones/ADR-001-stack.md) |
| S33 | El client corre en el puerto 5173 (el que usa Vite por defecto) y hace proxy de `/api` y del WebSocket al server en el 3001 | Convención de Vite |
| S34 | Hay un solo `.env` en la raíz para el server. Si el client necesita variables, usa el prefijo `VITE_` y nunca recibe secretos | Un único lugar para la configuración. Vite expone al navegador todo lo que lleva `VITE_` |
| S35 | Los staff que reciben alertas, los emails de notificación y el horario de atención se configuran en el CRM (D3), no en `.env` | Así el Admin puede cambiarlos sin redeploy |
| S36 | **Desarrollo con MongoDB local** (`mongodb://localhost:27017`, base `fuerza-gym-crm`, igual que en `.env.example`). **MongoDB Atlas** queda como opción para producción (PENDIENTE #31). La cadena de conexión solo vive en `MONGODB_URI`, así que cambiar de una a otra no requiere tocar código | Confirmado por el usuario el 2026-10-23: MongoDB y Compass ya están instalados en local. Atlas sigue siendo la propuesta de ADR-001 para producción |
| S37 | La protección de `.env` y de `git push` para Claude Code tiene **dos capas**: reglas `permissions.deny` en `.claude/settings.json` y el hook `PreToolUse` `.claude/hooks/guard.mjs` (pruebas: `node --test .claude/hooks/guard.test.mjs`). **No es infalible**: el hook analiza el texto del comando, así que no detecta lecturas indirectas (un script del proyecto que lea `.env` y lo imprima, nombres armados en tiempo de ejecución o codificados, comodines como `*nv`) ni un push lanzado desde un script o alias. Para evitar falsos negativos, prefiere falsos positivos: bloquea cualquier comando que mencione `.env` (salvo `.env.example`) y cualquier `git … push`, incluso dentro de un mensaje de commit | El sandbox de Claude Code (aislamiento a nivel de sistema operativo, con `sandbox.filesystem.denyRead`) no está habilitado. Evaluarlo queda en PENDIENTE #38. La regla de fondo sigue siendo la revisión humana |
| S38 | El server lee el `.env` de la raíz **solo si existe** (`node --env-file-if-exists`, sin `dotenv`). Si falta `MONGODB_URI`, en desarrollo y pruebas se usa `mongodb://localhost:27017/fuerza-gym-crm`; en producción es obligatoria. Las pruebas usan exclusivamente la base `fuerza-gym-crm-test` y el helper se niega a operar sobre otra | Permite correr el proyecto sin crear `.env` y evita que las pruebas borren datos reales. La URI local no es un secreto |
| S39 | Versiones base: Express 5 (propaga errores async al error handler central), Mongoose 9, zod 4, React 19, Vite 8, Vitest 5 y concurrently para `npm run dev`. Todas exigen Node ≥ 22.12, compatible con el Node 22 del proyecto | Últimas versiones estables al 2026-10-23 |
| S40 | **Una conversación por contacto** (índice único en `conversations.contact`). Cada mensaje guarda `conversation` y `contact` | El PRD no define cuándo abrir una conversación nueva; con un solo número del gimnasio basta un hilo por lead |
| S41 | Un lead se crea en `NUEVO` (PRD A1) y pasa a `EN_CONVERSACION` cuando vuelve a escribir después del primer intercambio. Las demás transiciones (visita, pago, socio) llegarán con los agentes y la operación de Recepción | El PRD no define el disparador de "En conversación" |
| S42 | Los valores de dominio se guardan en mayúsculas sin acentos, siguiendo el estilo del PRD (`IA`/`HUMANO`, `ENTRANTE`/`SALIENTE`, `NUEVO`…`PERDIDO`); la interfaz los muestra con sus etiquetas en español. Colecciones: `contacts`, `conversations`, `messages` y `auditlogs` (bitácora) | Identificadores de código en inglés y valores de negocio en español (CLAUDE.md) |
| S43 | El gate **bloquea** los mensajes de agentes en modo `HUMANO` y **todo** envío fuera de la ventana de 24 h (aún no hay plantillas, PENDIENTE #42). Cada decisión (enviado, bloqueado o fallido) queda en `auditlogs` | Política conservadora con las reglas de WhatsApp |

## Negocio (Fase 4, entrevista del 2026-10-23)

| # | Supuesto | Por qué |
|---|---|---|
| S44 | **Fuerza Gym es un negocio ficticio** para fines académicos. Los datos de [`docs/negocio/`](negocio/) son simulados y llevan `[CONFIRMAR]`; solo pueden tratarse como confirmados cuando el usuario autorice retirar la marca (PENDIENTES #43). Los datos `[PENDIENTE]` nunca los menciona el agente | Indicación del usuario en la entrevista de la Fase 4 |
| S45 | `docs/negocio/` es la **fuente inicial de la base de conocimiento** de los agentes. Cuando exista el módulo de conocimiento editable (PRD D1), se cargará desde ahí y el CRM pasará a ser la fuente vigente | Evita dos fuentes de verdad divergentes |
| S46 | **Operación provisional con confirmación humana** para visitas, reservaciones de clase, citas de servicios con costo y pagos por SPEI, hasta que existan Google Calendar, la dirección validada, las reglas de agenda, el control de cupos y los datos SPEI (PENDIENTES #51) | Decisión del usuario (opción "c"). No elimina la automatización del PRD (F1, A4) |
| S47 | El agente puede calcular y mencionar el **equivalente mensual** de los planes Trimestral (aprox. $433) y Semestral (aprox. $399.83) con los precios documentados, aclarando que se pagan en una sola exhibición y que no es un pago fraccionado | Autorización expresa del usuario |
| S48 | Los tipos de escalamiento `TRAMITE_RECEPCION` y `EMERGENCIA` son **documentales** hasta que se implementen con su propio ADR (PENDIENTES #47). Al 2026-10-23 no existe ningún tipo de escalamiento en el código | El usuario pidió no implementarlos sin revisión |
| S49 | **Seed de prueba `seed-fase4`** (`npm run seed`, [`scripts/seed.js`](../scripts/seed.js)): 10 contactos con la etiqueta `seed-fase4` en `tags`, teléfonos `+52100000000NN` (lada 000, inexistente en México), una conversación cada uno y 30 mensajes con fechas fijas (2026-10-12 a 2026-10-21, 10:00 `America/Mexico_City`). Los mensajes se identifican por llaves deterministas `seed-fase4:<contacto>:<n>` en `externalId` (entrantes) o `idempotencyKey` (salientes) | Idempotencia sin borrar datos: la conversación no tiene campo de marca y se identifica por su contacto (S40) |
| S50 | El seed **solo inserta** (`$setOnInsert`): no actualiza registros existentes, aunque sean del seed y se hayan editado a mano. Si un teléfono del seed ya pertenece a un contacto sin la etiqueta, lo omite y lo reporta. Solo escribe en MongoDB local, en la base `fuerza-gym-crm`, y se niega con `NODE_ENV=production` | Decisión del usuario: no sobrescribir información legítima ni tocar `auditlogs` |
| S51 | Los mensajes salientes del seed son **históricos**: `deliveryStatus` `ENTREGADO`, sin pasar por el gate ni emitir eventos. Sofía se registra como `AGENTE`/`sofia` y el personal como `USUARIO`/`recepcion` (aún no existe el modelo de usuarios). Los textos no incluyen importes ni horarios y Sofía no confirma pagos ni visitas: lo hace recepción | Decisiones 1 y 2 del usuario para el seed |
