# ADR-001 — Stack MERN y simulador de WhatsApp antes del canal real

| Campo | Valor |
|---|---|
| Estado | Aceptado |
| Fecha | 2026-10-16 |
| Relacionado | [PRD](../PRD.md), [SUPUESTOS](../SUPUESTOS.md) S25–S27, [PENDIENTES](../PENDIENTES.md) #12, #13, #31 |

## Contexto

Vamos a construir un CRM web donde agentes de IA (Claude) atienden por WhatsApp a los leads de Fuerza Gym. Un humano interviene para confirmar pagos y para resolver escalamientos. Las restricciones son:

- **Volumen bajo:** 1 sucursal y menos de 50 leads al día.
- **Presupuesto:** infraestructura + IA por debajo de ~$50 USD al mes (Render o Railway + MongoDB Atlas).
- **Equipo pequeño:** se prefiere un solo lenguaje en todo el sistema.
- **Tiempo real:** bandeja de conversaciones y escalamientos con alertas.
- **Dominio orientado a documentos:** conversaciones con mensajes anidados, media, base de conocimiento editable y eventos de webhook con forma variable.
- **El alta en Meta todavía no está lista** (PENDIENTE #12). Tampoco lo están las plantillas aprobadas (#13). El número de producción es un activo frágil: si se marca como spam o baja su calidad, se pierde el canal de ventas.

## Decisión 1 — Stack MERN (MongoDB + Express + React + Node.js)

- **Backend:** Node 22 + Express, ES Modules, validación con zod y Mongoose sobre MongoDB Atlas.
- **Frontend:** React + Vite.
- **Tiempo real:** WebSockets (Socket.IO) entre el server y el CRM.
- **IA:** SDK oficial de Anthropic para Node.

### Por qué

1. **Un solo lenguaje (JavaScript) en el cliente, el servidor y los agentes.** Reduce el cambio de contexto, permite compartir los esquemas zod entre capas y facilita que un equipo pequeño o un agente de código mantenga todo el sistema.
2. **MongoDB encaja con el dominio.** Los payloads del webhook de Meta, los mensajes con distintos tipos de media y la base de conocimiento son documentos de forma variable. Mongoose da esquemas cuando los necesitamos sin forzar migraciones en cada cambio.
3. **Node maneja bien la carga, que es principalmente de I/O:** webhooks, llamadas al LLM, Google Calendar y WebSockets. No hay cómputo pesado.
4. **Costo y despliegue:** Atlas tiene tiers gratuitos o baratos, y Render o Railway despliegan Node sin configuración de servidores. Cabe en el presupuesto.
5. **Ecosistema maduro** para todo lo que necesitamos: SDK de Anthropic, `googleapis`, Socket.IO, zod y clientes de email.

### Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| PostgreSQL + Prisma | Es buena opción, pero el dominio es mayormente documental y el cliente pidió MERN explícitamente. Si más adelante necesitamos reportes relacionales complejos, se puede reevaluar con un ADR nuevo. |
| Python (FastAPI) para los agentes + Node para el CRM | Dos lenguajes, dos despliegues y más costo de operación sin un beneficio claro para este volumen. |
| Next.js full-stack | Mezcla el webhook de larga vida, los WebSockets y los jobs programados con el runtime de render. Un Express separado es más simple de razonar y de desplegar en Render o Railway. |
| Plataformas no-code (n8n, Make, Botpress) | Poco control sobre los límites duros (nunca confirmar pagos, nunca inventar precios), sobre la auditoría y sobre el flujo HITL. Además, generan dependencia del proveedor. |

### Consecuencias

- (+) Un solo `npm install` y un solo lenguaje. Los esquemas zod se reutilizan.
- (+) Despliegue barato y simple.
- (−) Sin transacciones multi-documento por defecto: los flujos críticos (confirmar pago → crear membresía → enviar bienvenida) deben diseñarse para ser **idempotentes** o usar transacciones de Mongo de forma explícita.
- (−) JavaScript sin tipos estáticos. Lo mitigamos con zod en todos los bordes (HTTP, webhook, salidas de herramientas del LLM y variables de entorno).

## Decisión 2 — Simulador de WhatsApp antes de integrar Meta Cloud API

Todo el desarrollo inicial se hace contra un **simulador local de WhatsApp**. La integración con Meta Cloud API se conecta después, detrás de la misma interfaz.

### Diseño

- Hay una interfaz de **canal** con dos implementaciones: `simulator` y `meta`. Se elige con una variable de entorno (por ejemplo, `WA_PROVIDER=simulator|meta`).
- El simulador expone una UI de chat en el CRM (modo desarrollo) donde se puede hacer de "lead": enviar texto, imágenes, PDF y audio. También genera eventos **con la misma forma que el webhook de Meta**, incluidos el `referral` de Click-to-WhatsApp, los estados de entrega y los mensajes duplicados.
- **Todo mensaje saliente pasa por `server/src/outbox/gate.js`**, sin importar el proveedor. El gate aplica las reglas de negocio antes de enviar:
  - ventana de 24 h y obligación de usar plantilla fuera de ella;
  - conversación en modo `HUMANO`, donde la IA no responde;
  - idempotencia;
  - límites de frecuencia;
  - registro en la bitácora.

  Así, las reglas se prueban en el simulador exactamente como correrán en producción.
- El simulador permite **manipular el reloj** (por ejemplo, "avanzar 25 h") para probar la ventana de 24 h, los seguimientos y los recordatorios.

### Por qué

1. **Desbloquea el desarrollo.** El alta en Meta (Business verificado, número, app y webhook) y la aprobación de plantillas dependen del cliente y de los tiempos de Meta. No queremos que eso bloquee la construcción de agentes, del CRM ni del flujo HITL.
2. **Protege el número real.** Iterar prompts contra un número de producción arriesga mensajes erróneos a leads reales y daña la calificación de calidad del número.
3. **Pruebas deterministas y repetibles.** Se pueden escribir pruebas end-to-end del tipo "el agente nunca confirma un pago" o "no se envía nada fuera de la ventana sin plantilla" sin red, sin costo y en CI.
4. **Costo cero en desarrollo.** No se pagan mensajes de plantilla mientras se itera.
5. **Facilita las demos al cliente.** El dueño puede probar la experiencia del lead y la de Recepción antes de conectar su número.

### Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| El simulador no refleja con fidelidad a Meta (formatos, errores, tiempos de entrega) | Los fixtures del simulador se construyen a partir de payloads reales documentados por Meta. Antes de salir a producción se hace una fase de prueba con un número de prueba de Meta. |
| Lógica que se filtra al simulador y no existe en producción | El simulador solo traduce eventos de entrada y salida. Las reglas viven en el gate y en los servicios, que son compartidos. |
| Retraso en descubrir problemas de la integración real | La integración con Meta es una tarea temprana y en paralelo en cuanto exista el número de prueba (PENDIENTE #12). |

### Consecuencias

- (+) El equipo puede construir el 100 % del MVP sin credenciales de Meta.
- (+) La regla "ningún mensaje sale fuera del gate" se vuelve verificable con pruebas.
- (−) Hay que mantener el simulador como código de primera clase, con sus propias pruebas.
- (−) Hace falta una fase explícita de validación con Meta real antes de producción.
