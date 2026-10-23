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
