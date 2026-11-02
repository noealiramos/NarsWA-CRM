# Pendientes — Fuerza Gym CRM

Decisiones e insumos que faltan para cerrar el PRD o arrancar la implementación.
Prioridad: **P0** bloquea el inicio del desarrollo · **P1** se necesita antes de salir a producción · **P2** puede definirse después.

## Contenido de negocio (lo entrega el cliente)

| # | Pendiente | Prioridad | Responsable |
|---|---|---|---|
| 1 | Catálogo de planes: nombre, precio, duración y descripción | P0 | Cliente |
| 2 | Promociones vigentes y sus fechas de vigencia | P1 | Cliente |
| 3 | Horarios del gimnasio y horario de atención humana (por día) | P0 | Cliente |
| 4 | Dirección, link de Google Maps y referencias de cómo llegar | P1 | Cliente |
| 5 | Clases disponibles y su calendario | P1 | Cliente |
| 6 | Reglamento y FAQ actuales | P1 | Cliente |
| 7 | Datos SPEI: banco, CLABE, titular y concepto o referencia a usar | P0 | Cliente |
| 8 | Aviso de privacidad (LFPDPPP) y cómo se comunica al lead | P1 | Cliente / legal |
| 9 | Texto del mensaje de bienvenida al socio (qué traer, qué esperar el primer día) | P1 | Cliente |
| 10 | Nombre de la persona del agente (por ejemplo, "Soy ___ de Fuerza Gym") | P2 | Cliente |

## Integraciones

| # | Pendiente | Prioridad | Responsable |
|---|---|---|---|
| 11 | **Proveedor de link de pago** (MercadoPago, Stripe, Clip u otro). Mientras tanto se usarán links fijos por plan, si existen | P1 | Cliente |
| 12 | Alta en Meta: Business Manager verificado, número dedicado para la Cloud API (¿es el número que usan hoy?) y app con webhook | P0 | Cliente + Dev |
| 13 | Plantillas de WhatsApp a crear y aprobar: recordatorio de visita, recordatorio de renovación, bienvenida (fuera de la ventana de 24 h) y alerta al staff | P1 | Dev + Cliente |
| 14 | Cuenta de Google y calendario a usar; quién lo administra; método de acceso (OAuth o service account) | P0 | Cliente + Dev |
| 15 | Reglas de agenda: duración de la visita o clase de prueba, cupo por horario, horarios permitidos y anticipación mínima | P0 | Cliente |
| 16 | Proveedor de **transcripción de voz** (Claude no transcribe audio): Whisper API, Deepgram, Google STT, etc. Afecta el costo | P1 | Dev |
| 17 | Almacenamiento de comprobantes y media: GridFS en Atlas o un bucket (S3, R2 o Cloudinary). Definir la retención | P1 | Dev |
| 18 | Proveedor de email transaccional (Resend, SendGrid, SES) y remitente | P1 | Dev |
| 19 | Números de WhatsApp del staff que recibirán alertas | P1 | Cliente |

## Reglas de negocio por confirmar

| # | Pendiente | Prioridad | Responsable |
|---|---|---|---|
| 20 | ¿Se exige que el pago SPEI incluya una referencia (por ejemplo, el nombre o el teléfono del lead) para identificarlo? | P1 | Cliente |
| 21 | ¿Cuántos días antes del vencimiento se envía el recordatorio de renovación? ¿Uno o varios recordatorios? | P1 | Cliente |
| 22 | ¿Cuánto tiempo antes de la visita se envía el recordatorio? | P1 | Cliente |
| 23 | Tiempos de los 2 seguimientos dentro de la ventana de 24 h (propuesta: a las 2 h y a las 20 h de silencio) | P2 | Cliente |
| 24 | ¿Cuándo se marca un lead como `Perdido` automáticamente? (por ejemplo, X días sin respuesta) | P2 | Cliente |
| 25 | ¿Hay inscripción o anualidad además de la mensualidad? ¿Cómo se cobra? | P0 | Cliente |
| 26 | ¿Qué hacer si el monto del comprobante no coincide con el plan (pago parcial o de más)? | P1 | Cliente |
| 27 | ¿La clase de prueba o visita es gratuita? ¿Hay restricciones (una por persona, identificación)? | P1 | Cliente |
| 28 | Lista de temas sensibles adicionales que siempre deben escalarse (por ejemplo, menores de edad, cancelaciones, reembolsos) | P1 | Cliente |
| 29 | Metas reales de las métricas. Hoy son una propuesta; ¿hay datos históricos de conversión? | P2 | Cliente |

## Técnico

| # | Pendiente | Prioridad | Responsable |
|---|---|---|---|
| 30 | Elegir los modelos de Claude por agente (por ejemplo, Haiku para el router y Sonnet para ventas y pagos) y validarlos contra el presupuesto de $50 USD | P1 | Dev |
| 31 | Elegir Render o Railway, y el plan de MongoDB Atlas (el tier M0 tiene límites) | P1 | Dev |
| 32 | Dominio y subdominio para el CRM y para el webhook | P1 | Cliente + Dev |
| 33 | Política de respaldo de la base de datos | P2 | Dev |

## Implementación (estado al 2026-10-23)

El repositorio solo contiene documentación y configuración. El commit inicial `3b51438` se llama "feat: esqueleto MERN y simulador", pero **no incluye código**.

| # | Pendiente | Prioridad | Responsable |
|---|---|---|---|
| 34 | **Esqueleto MERN**: `package.json` raíz con npm workspaces, `server/` (Express + Socket.IO en el puerto 3001, carga de env con zod, error handler central) y `client/` (React + Vite en el 5173 con proxy de `/api` y del WebSocket). Debe funcionar `npm run dev` | P0 | Dev |
| 35 | **Simulador de WhatsApp** (ADR-001): UI en `/simulador`, canal `simulator` y salida exclusivamente por `server/src/outbox/gate.js` | P0 | Dev |
| 36 | **Persistencia en MongoDB local** (S36): modelos Mongoose de Lead/Contacto, Conversación y Mensaje; guardar los mensajes entrantes y salientes de cada conversación | P0 | Dev |
| 37 | Scripts `test` y `lint` de la raíz (los comandos de `CLAUDE.md` aún no existen). Incluir las pruebas del hook `.claude/hooks/guard.test.mjs` | P1 | Dev |
| 38 | Evaluar habilitar el sandbox de Claude Code en este equipo (Windows) para bloquear la lectura de `.env` a nivel de sistema operativo y cerrar los huecos que el hook no cubre (S37) | P2 | Dev |
| 39 | El simulador y el parser del webhook solo manejan **mensajes de texto**. Faltan imágenes, PDF y notas de voz (PRD A5 y B2), estados de entrega, `referral` de Click-to-WhatsApp desde la UI y manipulación del reloj para probar la ventana de 24 h (ADR-001) | P1 | Dev |
| 40 | **Respondedor provisional** (`server/src/agents/provisionalResponder.js`): responde un texto fijo sin datos comerciales. Sustituirlo por los agentes de IA del PRD §3 (router, info, ventas y pagos), con base de conocimiento y pruebas de los límites duros. La base de conocimiento inicial sale de `docs/negocio/` (S45), y las pruebas de límites duros deben cubrir [playbook-ventas.md §8](negocio/playbook-ventas.md) | P0 | Dev |
| 41 | La vista CRM y la API (`/api/contacts`) **no tienen autenticación ni roles** (PRD D2 y §9). Tampoco se pueden tomar o devolver conversaciones (modo HUMANO) desde la interfaz (PRD C2) | P0 | Dev |
| 42 | Plantillas de WhatsApp fuera de la ventana de 24 h: hoy el gate **bloquea** todo envío fuera de la ventana (relacionado con #13) | P1 | Dev |

**Avance (Fase 3, 2026-10-23):** #34, #35 y #36 quedaron implementados y probados (esqueleto MERN, simulador por `outbox/gate.js` y persistencia en `fuerza-gym-crm`). De #37 ya existe `npm test`; `lint` sigue pendiente por decisión del usuario.

## Negocio y requisitos derivados (Fase 4, 2026-10-23)

Resultado de la entrevista de negocio ([`docs/negocio/`](negocio/)). Ninguno está implementado.

| # | Pendiente | Prioridad | Responsable |
|---|---|---|---|
| 43 | **Validar con negocio y retirar `[CONFIRMAR]`** de `docs/negocio/`. Hasta entonces, los datos son de simulación (S44) | P1 | Cliente |
| 44 | Precio y programación de **talleres especiales**, y lista de precios de bebidas y accesorios | P2 | Cliente |
| 45 | **Modelo Plan** (aún no existe): cuota de inscripción, exención por plan, regla de reinscripción (30 días), requisitos de elegibilidad (Estudiante), beneficios incluidos y excluidos (Pase diario sin clases), canal de venta (Pase diario solo en sucursal) | P1 | Dev |
| 46 | **Modelo Membresía** (aún no existe): vigencia en días naturales con cortes a las 00:00 `America/Mexico_City`, renovación anticipada encadenada, congelamiento (Trimestral y Semestral, 7–15 días, 1 por periodo, no retroactivo) y **corrección de la fecha de activación** solo por recepción o Admin, con motivo y bitácora (S4) | P1 | Dev |
| 47 | **Modelo Escalamiento** (aún no existe ningún tipo). Al implementarlo, incluir además de los 4 tipos del PRD **`TRAMITE_RECEPCION`** (sin pausa) y **`EMERGENCIA`** (prioridad máxima, notificación prioritaria, aviso del 911 antes de transferir), con un ADR (S48). Requisito de seguridad antes de poner agentes reales | P0 | Dev |
| 48 | **Exclusión comercial** en Contacto (fecha, motivo y quién autoriza reanudar) y su aplicación en los seguimientos | P1 | Dev |
| 49 | **Jobs de seguimiento** (`server/src/jobs/` aún no existe): 2 seguimientos (2 h y 20 h), **horario silencioso** de 21:00 a 08:00 y reprogramación o cancelación según la ventana de 24 h | P1 | Dev |
| 50 | **Transiciones de etapa no lineales** con autorización por rol (`SOCIO` solo por pago confirmado; `PERDIDO` manual, con motivo obligatorio solo desde `PAGO_EN_REVISION` y opcional en los demás movimientos permitidos (nunca desde `SOCIO`); S55, ADR-003) | P1 | Dev |
| 51 | Condiciones para pasar de la **operación provisional** (S46) al flujo automático de visitas (Calendar #14, dirección #4, reglas #15) y de reservaciones de clase (control de cupos, fuera del PRD actual) | P1 | Cliente + Dev |
| 52 | **Horarios especiales con vigencia** (fecha de inicio, fin y horario) en la base de conocimiento, para festivos no listados y avisos de la Feria | P2 | Dev |
| 53 | Redefinir las **métricas** de resolución en el dashboard según PRD §8 (resolución informativa autónoma e intervenciones humanas) | P2 | Dev |
| 54 | `author.ref = 'recepcion'` en los mensajes del seed es un **marcador**: cuando exista el modelo de usuarios (PRD D2), los mensajes de personal deben guardar el id del usuario | P2 | Dev |
| 55 | El seed no registra el **motivo de `PERDIDO`** (Paola: contrató otro gimnasio) ni la **exclusión** de Hugo porque Contacto no tiene esos campos (#48 y #50). Agregarlos al seed cuando existan | P2 | Dev |
| 56 | `CLAUDE.md` documenta `npm run lint`, pero **no existe** el script ni la configuración de ESLint | P2 | Dev |

**Avance (Fase 4, 2026-10-23), entrevista de negocio:** quedaron **documentados** en `docs/negocio/` con `[CONFIRMAR]` (datos simulados, S44):
- #1 catálogo de planes;
- #2 sin promociones vigentes;
- #3 horarios del gimnasio y de recepción;
- #5 clases y calendario;
- #6 reglamento y FAQ;
- #9 borrador de bienvenida;
- #10 nombre de la persona (Sofía, asistente virtual);
- #20 concepto SPEI: nombre completo + referencia que da recepción;
- #21 recordatorio único 5 días antes;
- #23 seguimientos a las 2 h y 20 h;
- #24 `Perdido` manual en el MVP (la regla automática por inactividad, por ejemplo 14 días, **sigue abierta**);
- #25 inscripción de $199 y reinscripción;
- #26 monto distinto → escalamiento `PAGO`, sin que la IA opine;
- #27 visita gratuita, una por persona;
- #28 temas sensibles (menores, cancelaciones, reembolsos, privacidad, acoso, emergencias).

**Siguen abiertos:**
- **#4** dirección y Maps (solo se comunica "zona norte de Aguascalientes");
- **#7** datos SPEI;
- **#8** aviso de privacidad. Mientras falte, el agente escala toda consulta de privacidad y no afirma que exista un aviso publicado. Debe estar aprobado antes de usar el sistema con personas reales;
- **#11** link de pago: **no** en el MVP.

Ningún dato cuenta como confirmado mientras conserve `[CONFIRMAR]` (#43).

## Revisión del seed (commit `0da2f39`, 2026-10-23)

Hallazgos del subagente `revisor`. Prioridad: los IMPORTANTES quedan en **P1** y los MENORES en **P2**. El código de `scripts/seed.js` no se ha modificado; su mantenimiento lo coordina la sesión principal ([ADR-002](decisiones/ADR-002-seed-en-raiz.md)).

| # | Pendiente | Prioridad | Responsable |
|---|---|---|---|
| 57 | **Etapas del seed sin registros de negocio** (`scripts/seed.js:73-104`): Ricardo está en `SOCIO` sin Pago `CONFIRMADO` ni Membresía, Fernanda en `PAGO_EN_REVISION` sin Pago ni escalamiento `PAGO`, y Daniela en `VISITA_AGENDADA` sin Cita. Son datos históricos ficticios para probar el pipeline: hasta que existan los modelos (#45, #46, #47), esas etapas son **solo visuales** y ningún servicio ni job debe darlas por buenas. Al implementarlos, el seed debe crear el Pago `CONFIRMADO` por un usuario y la Membresía de Ricardo, el Pago `EN_REVISION` y el escalamiento de Fernanda, y la Cita de Daniela, **sin cambiar las etapas** de los 10 contactos. Complementa #55 (motivo de `PERDIDO` y exclusión) | P1 | Dev |
| 58 | Documentar en `CLAUDE.md` la carpeta `scripts/` en la estructura y `npm run seed` en los comandos, con referencia a ADR-002 | P1 | Dev |
| 59 | Mensajes huérfanos (`scripts/seed.js:205-222`): si se borra un contacto del seed y se vuelve a correr, los mensajes con llave `seed-fase4:` siguen apuntando al contacto anterior y el reporte los cuenta como "ya existían". Reportarlo como conflicto o documentar en S50 que el reinicio exige borrar también esos mensajes | P2 | Dev |
| 60 | `seed()` exportada solo valida el nombre de la base (`scripts/seed.js:145-152`, `:233-236`); la verificación de host local está solo en `main()`. Validar también el host de la conexión activa | P2 | Dev |
| 61 | El loopback IPv6 `mongodb://[::1]:27017/...` se rechaza por error al quitar el puerto (`scripts/seed.js:148`). Corregir el parseo y agregar el caso a la prueba | P2 | Dev |
| 62 | `scripts/seed.js:145` lee `process.env.NODE_ENV` fuera de `server/src/config/`. Usar `config.NODE_ENV` | P2 | Dev |
| 63 | `scripts/seed.js:251`: `pathToFileURL(process.argv[1])` lanza TypeError si `argv[1]` es `undefined` (REPL, `node -e`). Protegerlo | P2 | Dev |
| 64 | Fechas incoherentes (`scripts/seed.js:174-176`, `:197`): `updatedAt` de contacto y conversación es anterior a `lastInboundAt`/`lastMessageAt`. Usar la última fecha | P2 | Dev |
| 65 | La salida del seed mezcla idiomas (`contacts: N creados`, `scripts/seed.js:240`). Usar etiquetas en español | P2 | Dev |
| 66 | Cobertura de `server/test/seed.test.js`: faltan dos `seed()` simultáneos (camino del duplicado 11000), la edición manual de un mensaje o conversación, y la verificación de fechas (primer mensaje `2026-10-12T16:00:00.000Z`) | P2 | Dev |
| 67 | Al implementar los jobs (#49), excluir los contactos con la etiqueta `seed-fase4` (Carlos, Mariana, Jorge y el del anuncio quedarían como candidatos a seguimiento) | P2 | Dev |

## Equipo de subagentes (revisión del 2026-10-23)

Hallazgos del subagente `revisor` sobre `.claude/agents/`, `CLAUDE.md` y los permisos. B1, I1, I2 e I3 se atendieron en el mismo cambio (S52, S53, `guard.mjs` y `backend.md`); aquí queda lo que no se puede garantizar y los menores.

| # | Pendiente | Prioridad | Responsable |
|---|---|---|---|
| 68 | **Límites de shell no garantizados** (S52): backend y frontend pueden escribir fuera de su carpeta con Bash (`cp`, `sed -i`, `node -e`, redirecciones) o con scripts del proyecto, y `npm test` ejecuta código del repo. Evaluar el sandbox de Claude Code con `filesystem.allowWrite` por agente (relacionado con #38) o quitar Bash a un agente si no lo necesita. Incluye las variantes del seed que `SEED_RUN` no atrapa (revisión de I1, 2026-11-01): `cd scripts && node seed.js`, `node scripts/./seed.js`, `node scripts//seed.js` y `pnpm seed`, `yarn seed` o `bun run seed` | P1 | Dev |
| 69 | `CLAUDE.md` está en 80/80 líneas: compactarlo antes de agregar la estructura de `scripts/` y `npm run seed` (#58) | P2 | Dev |
| 70 | No existe `.gitattributes` y git avisa de la conversión LF/CRLF. Evaluar `* text=auto eol=lf` con su propio supuesto | P2 | Dev |
| 71 | `revisor.md:28`: agregar al punto "Ámbito" que los cambios en `scripts/`, `.claude/`, el `package.json` raíz o el lockfile deben venir de la sesión principal | P2 | Dev |
| 72 | `revisor.md:38`: usar el formato genérico `ruta/archivo:línea` en lugar de `ruta/archivo.js:línea` | P2 | Dev |
| 73 | El client no tiene script `test`: frontend solo verifica con `npm run build -w client`. Definir pruebas de UI si se esperan | P2 | Dev |
| 74 | Los agentes no declaran `model` y heredan el de la sesión. Evaluar uno explícito (por ejemplo, el más capaz para revisor y arquitecto) | P2 | Dev |
| 75 | **Recuperación (2026-10-23, cambios sin commit):** (a) repetir la **tercera revisión** del `revisor` sobre `guard.mjs`, `guard.test.mjs`, `settings.json` y S52/S53 (se interrumpió sin resultados); (b) comprobar, en un modo de permisos no automático, que `git add --dry-run -- CLAUDE.md` **pide confirmación** (regla `ask`, S53); (c) con revisión satisfactoria y autorización del usuario, crear el commit `chore: equipo de subagentes` | P0 | Dev |

**Avance de #75 (2026-11-01):** (a) la tercera revisión del `revisor` terminó sin bloqueantes; su IMPORTANTE I1 (variantes del seed que no bloqueaba `SEED_RUN`) se corrigió en `guard.mjs` con pruebas, y sus MENORES quedan en #76-#81. (b) Prueba manual: al pedir `git add --dry-run -- CLAUDE.md` apareció el diálogo de autorización y el usuario lo rechazó. (c) **Cerrado:** el usuario autorizó el commit `a7da500` "chore: equipo de subagentes". Queda abierto el seguimiento de los menores #76-#81. **#75 cerrado.**

### Tercera revisión del equipo de subagentes (2026-11-01)

| # | Pendiente | Prioridad | Responsable |
|---|---|---|---|
| 76 | `settings.json:34-43`: `git diff\|log\|show *` están en `allow` y aceptan `--output=<archivo>`, que escribe sin confirmación. Agregar `Bash(git * --output*)` y `PowerShell(git * --output*)` a `ask` o mencionar la excepción en S53 | P2 | Dev |
| 77 | S53 (`SUPUESTOS.md:91`) dice "con o sin `-w server\|client`", pero falta `npm run test -w client` en `allow`. Agregar la regla o ajustar el texto (relacionado con #73) | P2 | Dev |
| 78 | `guard.mjs:178-191` falla abierto: una entrada JSON válida que no es objeto (`null`) lanza TypeError y sale con código 1, que no bloquea. Envolver `main()` en `try/catch` que bloquee, validar que `input` sea objeto y agregar una prueba con `null`. Confirmar si Claude Code reconoce `"onFailure": "block"` | P2 | Dev |
| 79 | `guard.mjs:44` y `:62`: comillas y escapes evaden `GIT_PUSH` y `GIT_MUTATING` en la sesión principal, backend y frontend (`git pu''sh`, `git "pu"sh`, ``git pu`sh``, `cmd /c git pu^sh`). Quitar `'`, `"`, `` ` ``, `\` y `^` en una copia del comando antes de evaluar, con pruebas (relacionado con S37). La misma normalización debe aplicarse a `SEED_RUN` y `NPM_MUTATING`, que también se evaden con comillas (`npm run "seed"`, `npm run se''ed`, `node "scripts"/seed.js`) | P2 | Dev |
| 80 | `guard.mjs:54`: el arquitecto puede escribir cualquier archivo en `docs/decisiones/` (`.js`, `.json`) y editar ADRs aceptados; `arquitecto.md:17` solo autoriza `ADR-NNN-<tema>.md`. Exigir `^docs/decisiones/adr-\d{3}-[\w-]+\.md$` y decidir en S52 si los ADRs existentes son editables | P2 | Dev |
| 81 | `guard.test.mjs:86-171`: faltan pruebas de `MultiEdit` en los límites por carpeta, de un `.env` dentro del ámbito (backend escribiendo `server/.env`), de PowerShell en los casos permitidos de backend y frontend, y de las variantes de #78 y #79 | P2 | Dev |
| 82 | `guard.mjs:68-69`: en `SEED_RUN` el grupo `(\.js)?` sobra (`seed\b` ya coincide antes de `.js`, `.mjs`, `.cjs`, `seed-x` y `seed:x`). Dejar `scripts[\\/]seed\b` y corregir el comentario a "con cualquier extensión o sufijo" | P2 | Dev |
| 83 | `guard.test.mjs:121-124`: faltan pruebas de `SEED_RUN` con flags con valor antes del subcomando (`npm --silent run seed`, `npm --prefix . run seed`), de `npm run -w server seed`, `npm run -- seed` y `npm run seed:reset`, y de los casos permitidos en PowerShell para backend y frontend (relacionado con #81) | P2 | Dev |

## Bandeja de borradores y autonomía (ADR-003, 2026-11-02)

Pendientes que deja el [ADR-003](decisiones/ADR-003-bandeja-borradores-autonomia.md) (estado "Propuesto"). La implementación sigue sus 10 fases.

| # | Pendiente | Prioridad | Responsable |
|---|---|---|---|
| 84 | ~~**Aceptar el ADR-003** (pasar de "Propuesto" a "Aceptado") antes de implementar la fase 1. S55 ya está decidida: se permite `PAGO_EN_REVISION → PERDIDO` con motivo obligatorio~~ **Cerrado (2026-11-02):** el usuario aceptó el ADR-003 tras dos revisiones; los menores de la segunda quedaron corregidos en el ADR, en #50 y en #99 | P0 | Usuario |
| 85 | Conciliar los borradores que se quedan en `ENVIANDO` si el proceso se cae entre la transición y el resultado del gate: buscar el `Message` con la llave `draft:<id>` | P2 | Dev |
| 86 | Reintentar borradores `FALLIDO`: con la misma llave el gate devuelve `DUPLICADO`, así que hace falta una llave de reintento | P2 | Dev |
| 87 | Evaluar con datos de uso que los borradores expiren o se descarten al vencer la ventana o al tomar la conversación (S57) | P2 | Dev |
| 88 | Autonomía por agente: documentos `scope: 'AGENTE'` y parámetro `agent` en `PUT /settings/autonomy` | P2 | Dev |
| 89 | `PUT /settings/autonomy` solo para `ADMIN` y actor tomado de la sesión; `assignedUser` con el id del usuario (relacionado con #41 y S58) | P1 | Dev |
| 90 | Reportar la métrica de primera respuesta (PRD §8) separada por modo de autonomía: en `SUPERVISADO` no se cumple el p95 < 60 s | P2 | Dev |
| 91 | Pestaña "Escalamientos" de la Bandeja cuando exista el modelo `Escalation`, con su propio ADR (relacionado con #47) | P1 | Dev |
| 92 | Agregar `AGENT_AUTONOMY_DEFAULT` a `.env.example` en la fase 4 (lo hace la sesión principal) | P1 | Dev |
| 93 | Paginar `GET /contacts` para el kanban (hoy el tope es 200) | P2 | Dev |
| 94 | Si el webhook se procesa y falla la creación del borrador, el reintento llega como duplicado y el lead se queda sin borrador (mismo caso que la respuesta actual; relacionado con la cola de S27) | P2 | Dev |
| 95 | Validar con zod la salida del LLM (`{ agent, text }`) cuando sustituya al generador simulado (relacionado con #40) | P1 | Dev |
| 96 | Al crear el modelo Pago, la transición manual `PAGO_EN_REVISION → PERDIDO` (S55) debe rechazar o cancelar el Pago `EN_REVISIÓN` con el motivo (**nunca confirmarlo**) y cerrar su escalamiento `PAGO`. Hoy, sin ese modelo, el comprobante puede quedar sin resolver (relacionado con #50) | P1 | Dev |
| 97 | Un borrador **rechazado** deja al lead sin respuesta y sin alerta: hoy solo se espera que Recepción tome la conversación (C2). Definir un aviso o contador de "conversaciones sin respuesta tras un rechazo" en la Bandeja | P2 | Dev |
| 98 | El reemplazo de borradores (S60, ADR-003 §5) ordena los mensajes entrantes por `_id`, lo que solo es seguro con **una instancia** del server. Con varias instancias, ordenar por `createdAt` + `_id` | P2 | Dev |
| 99 | Fase 3 (backend): actualizar el comentario de `server/src/models/Contact.js:3-4`, que dice "(Perdido en cualquier punto)", a la regla del PRD §5 y S55 (excepto desde `Socio`) | P2 | Dev |
