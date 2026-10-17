# Supuestos — Fuerza Gym CRM

Decisiones que se tomaron sin confirmación explícita para poder avanzar. Si alguna es incorrecta, hay que corregirla aquí y en el [PRD](PRD.md).

## Producto y negocio

| # | Supuesto | Por qué |
|---|---|---|
| S1 | Hay **1 sucursal** y no se requiere multi-tenant | Respuesta de la entrevista. Se evita la complejidad de separar datos |
| S2 | El **horario de atención humana** es el mismo que el horario del gimnasio | Respuesta de la entrevista ("el horario del gym") |
| S3 | En un escalamiento `PAGO` **la IA no se pausa**: sigue respondiendo otras dudas, pero nunca confirma el pago. En los demás escalamientos la IA **sí se pausa** hasta que un humano devuelva la conversación | El pago solo requiere validación, no conversación humana. Los otros casos sí requieren que hable una persona |
| S4 | Un pago confirmado crea una **membresía** con fecha de vencimiento = inicio + duración del plan. El inicio es la fecha de confirmación, salvo que Recepción la cambie | Se necesita para el recordatorio de renovación |
| S5 | Los pagos en **efectivo o tarjeta en sucursal** los registra Recepción manualmente en el CRM | No hay integración con la terminal ni con la caja |
| S6 | La **visita o clase de prueba es gratuita** y no requiere pago previo | Es el caso común. Pendiente de confirmar (#27) |
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
