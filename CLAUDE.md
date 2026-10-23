# Fuerza Gym CRM

CRM web donde agentes de IA (Claude) atienden por WhatsApp a los leads de Fuerza Gym
(Aguascalientes). Un humano solo interviene para confirmar pagos y para resolver escalamientos
(dudas fuera de conocimiento, quejas, negociación o cuando el lead pide hablar con una persona).
Producto: [docs/PRD.md](docs/PRD.md) · Decisiones: [docs/decisiones/](docs/decisiones/)

## Stack
- **Frontend:** React + Vite (`client/`)
- **Backend:** Node 22, Express, ESM (`"type": "module"`) (`server/`)
- **Datos:** MongoDB con Mongoose: local (`localhost:27017`) en desarrollo; Atlas como opción para producción
- **IA:** Anthropic Claude (SDK oficial)
- **Tiempo real:** Socket.IO
- **Validación:** zod
- **Tests:** Vitest + Supertest
- **Canal:** simulador de WhatsApp en desarrollo y Meta Cloud API en producción (`WA_PROVIDER`)

## Estructura
```
client/                React + Vite (CRM y UI del simulador en /simulador)
server/src/
  index.js             arranque de Express + Socket.IO (puerto 3001)
  config/              carga y validación de env con zod
  routes/              rutas HTTP (delgadas: validan y delegan)
  services/            lógica de negocio (leads, pagos, membresías, citas)
  models/              esquemas Mongoose
  agents/              router, info, ventas, pagos + prompts y herramientas
  channels/            adaptadores de WhatsApp: simulator/ y meta/
  outbox/gate.js       ÚNICA salida de mensajes a WhatsApp
  jobs/                seguimientos 24 h, recordatorios de visita y renovación
server/test/           pruebas del server
docs/                  PRD, SUPUESTOS, PENDIENTES, decisiones/ (ADRs)
```

## Comandos (npm workspaces, desde la raíz)
```
npm install               instala todo
npm run dev               client (5173) + server (3001) en paralelo
npm run dev -w server     solo el server
npm run dev -w client     solo el client
npm test                  todas las pruebas
npm test -w server        pruebas del server
npm run lint              lint de todo el repo
```

## Convenciones
- Usar async/await siempre; no usar callbacks ni `.then()` encadenados.
  Los errores async de Express llegan a un error handler central.
- Validar con zod todo lo que entra al sistema: body, query y params HTTP, payloads de webhook,
  variables de entorno y salidas de herramientas del LLM.
- No poner secretos en el código. Todo va en variables de entorno, accesibles solo vía
  `server/src/config/`. `.env` no se versiona; `.env.example` sí, sin valores reales.
- El server corre en el puerto 3001 y el client en el 5173, con proxy de `/api` y del WebSocket.
- Zona horaria `America/Mexico_City`. Fechas en UTC en la DB.
- Interfaz, mensajes y prompts en español de México. Código e identificadores en inglés.
- Flujos críticos (confirmar pago → membresía → bienvenida) idempotentes.
- Pruebas para todo límite duro de los agentes: nunca confirmar un pago, nunca inventar precios,
  no dar descuentos y no dar consejos médicos.

## Reglas de oro
1. **Ningún mensaje sale a WhatsApp fuera de `server/src/outbox/gate.js`.**
   Ni agentes, ni jobs, ni rutas llaman directo a un canal. El gate aplica la ventana de 24 h
   y las plantillas, el modo HUMANO, la idempotencia y la bitácora.
2. **Todo supuesto va a `docs/SUPUESTOS.md` y toda tarea incompleta a `docs/PENDIENTES.md`.**
   Si decides algo que no está en el PRD, o dejas algo a medias (un TODO, un mock, un caso
   no cubierto), regístralo ahí en el mismo cambio.
3. La IA **nunca** confirma pagos. Solo un humano cambia un Pago a `CONFIRMADO`.
4. Los agentes solo responden con datos de la base de conocimiento. Si un dato no está, escalan.

## Flujo de trabajo
- Antes de implementar algo no trivial, revisar el PRD y los ADRs relevantes.
- Las decisiones de arquitectura nuevas van en un ADR nuevo en `docs/decisiones/`.
- Commits pequeños con mensajes en español en modo imperativo. Nunca hacer `git push` (está
  bloqueado en `.claude/settings.json` y en el hook `.claude/hooks/guard.mjs`).
