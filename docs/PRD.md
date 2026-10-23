# PRD — CRM con Agentes IA por WhatsApp para Fuerza Gym

| Campo | Valor |
|---|---|
| Producto | CRM web (MERN) con agentes de IA que atienden leads por WhatsApp |
| Cliente | Fuerza Gym, Aguascalientes (1 sucursal) |
| Versión | 0.1 (borrador para validación) |
| Fecha | 2026-10-16 |
| Documentos relacionados | [PENDIENTES.md](PENDIENTES.md), [SUPUESTOS.md](SUPUESTOS.md), [negocio/](negocio/) (catálogo, horarios, FAQ y playbook; datos simulados con `[CONFIRMAR]`, S44) |

---

## 1. Problema

Fuerza Gym recibe leads por WhatsApp (orgánicos y de anuncios Click-to-WhatsApp de Meta). Hoy la atención depende de que el personal de recepción conteste a mano, lo que provoca:

- **Respuestas lentas o nulas** fuera de horario y en horas pico, cuando el lead está más interesado. Un lead de anuncio que no recibe respuesta en minutos se enfría o se va a la competencia.
- **Respuestas inconsistentes** sobre precios, promociones y horarios según quién conteste.
- **Seguimiento perdido**: no hay un registro estructurado de en qué etapa está cada lead, ni de quién agendó visita o quién prometió pagar.
- **Pagos difíciles de rastrear**: los comprobantes llegan por chat y se mezclan con el resto de los mensajes. No hay una cola clara de "pagos por validar" ni un registro de quién los confirmó.
- **Sin visibilidad para el dueño**: no hay datos de cuántos leads llegan, cuántos visitan, cuántos se inscriben y qué tan rápido se atienden.

**Propuesta:** agentes de IA especialistas atienden por WhatsApp 24/7, informan, agendan visitas y guían al pago. Un humano solo interviene para **confirmar pagos** y para **casos que salen del conocimiento del agente** (dudas no cubiertas, quejas, negociaciones o cuando el lead pide hablar con una persona).

---

## 2. Usuarios

### 2.1 Usuarios internos (usan el CRM)

| Rol | Quién es | Necesidades principales |
|---|---|---|
| **Admin / Dueño** | Dueño o gerente del gimnasio | Configurar el conocimiento del negocio (planes, precios, horarios, FAQ, promociones, links de pago), gestionar usuarios, ver métricas de conversión y desempeño, y auditar conversaciones. También puede hacer todo lo que hace Recepción. |
| **Recepción / Ventas** | Personal de mostrador | Atender la bandeja de escalamientos, validar o rechazar comprobantes de pago, registrar pagos presenciales, tomar y devolver conversaciones a la IA, y consultar leads y visitas agendadas. |

### 2.2 Usuarios externos (interactúan por WhatsApp)

| Rol | Descripción |
|---|---|
| **Lead** | Persona interesada que escribe al WhatsApp del gimnasio, de forma orgánica o desde un anuncio. |
| **Socio** | Lead con un pago confirmado y una membresía activa. Recibe la bienvenida y los recordatorios de renovación. |

---

## 3. Agentes de IA

La arquitectura es multiagente: un router clasifica cada mensaje y lo deriva al especialista. Todos comparten la persona y los límites.

**Persona común:** tono cercano y motivador, tuteo, emojis moderados, español de México. Se presenta como **Sofía, asistente virtual de Fuerza Gym**, desde el primer mensaje, y nunca afirma ser una persona. Si le preguntan si es una IA, responde con transparencia. Ver [playbook-ventas.md](negocio/playbook-ventas.md).

| Agente | Responsabilidad | Herramientas / acciones |
|---|---|---|
| **Recepcionista / Router** | Saludar, detectar la intención, capturar nombre y horario preferido, y derivar al especialista adecuado. Detectar los disparadores de escalamiento (solicitud de humano, queja, negociación). | Clasificar intención, actualizar datos del lead, crear escalamiento |
| **Info general** | Horarios, ubicación, clases, instalaciones y reglamento. | Consultar la base de conocimiento |
| **Ventas / Planes** | Explicar membresías, precios y promociones vigentes, recomendar un plan según el horario preferido, agendar la visita o clase de prueba y guiar hacia la compra. | Consultar planes y promociones, consultar disponibilidad y crear cita en Google Calendar, mover etapa del pipeline |
| **Pagos** | Dar las opciones de pago (SPEI, link de pago, efectivo o tarjeta en sucursal), recibir comprobantes (imagen o PDF) y escalarlos a Recepción. Informar al lead que el pago está en revisión. | Compartir datos de pago y link por plan, adjuntar comprobante, crear escalamiento de pago |

### 3.1 Límites duros (aplican a todos los agentes)

1. **Nunca inventa** precios, promociones, horarios ni políticas. Solo usa la base de conocimiento vigente en el CRM. Si un dato no está, escala.
2. **No da descuentos** ni negocia precios. Cualquier negociación se escala.
3. **No da consejos médicos, de nutrición ni de suplementación**, ni opina sobre lesiones. Responde con un mensaje estándar que recomienda consultar a un profesional y ofrece información del gimnasio.
4. **Nunca confirma un pago por sí mismo.** Todo comprobante lo valida un humano (HITL).
5. Si una conversación está en **modo humano**, el agente no responde.

### 3.2 Disparadores de escalamiento

| Tipo | Disparador | ¿La IA se pausa? |
|---|---|---|
| `PAGO` | Se recibe un comprobante (imagen o PDF), o el lead dice que ya pagó | No (sigue atendiendo otras dudas, pero no confirma el pago) |
| `FUERA_DE_CONOCIMIENTO` | Pregunta que la base de conocimiento no cubre | Sí |
| `SOLICITUD_HUMANO` | El lead pide hablar con una persona | Sí |
| `QUEJA_NEGOCIACION` | Molestia o queja, sentimiento negativo, o petición de descuento | Sí |
| `TRAMITE_RECEPCION` *(documental, pendiente de implementar: S48, PENDIENTES #47)* | Solicitud que requiere una acción de recepción: visita, reservación de clase, datos SPEI, dirección exacta, congelamiento, vencimiento, QR, renovación o cita de un servicio con costo | No (sigue atendiendo otras dudas y no afirma que el trámite esté hecho) |
| `EMERGENCIA` *(documental, pendiente de implementar; prioridad máxima)* | Posible emergencia médica | Sí, **después** de indicar al lead que busque ayuda inmediata y llame al 911 |

La clasificación detallada de cada situación está en [playbook-ventas.md §6](negocio/playbook-ventas.md). Al 2026-10-23 **ningún** tipo de escalamiento está implementado.

---

## 4. Flujos principales

### F1. Lead nuevo → visita agendada
1. El lead escribe (orgánico o desde un anuncio). El sistema crea el lead, guarda el origen (incluido el `referral` de Click-to-WhatsApp, si existe) y responde en segundos.
2. El router saluda, pide el nombre y detecta la intención.
3. El agente de ventas explica los planes y pregunta el horario preferido para entrenar.
4. El lead acepta una visita o clase de prueba. El agente consulta la disponibilidad en Google Calendar, propone horarios y crea el evento.
5. El lead pasa a la etapa **Visita agendada**. El sistema envía un recordatorio antes de la visita.

> **Operación provisional (MVP, Fase 4):** mientras no existan la integración con Google Calendar (PENDIENTES #14), la dirección validada (#4) y las reglas de agenda (#15), el agente **registra** el día y la hora preferidos y crea un escalamiento `TRAMITE_RECEPCION`. Recepción confirma la visita y mueve el lead a `Visita agendada`. El flujo automático descrito arriba se habilita cuando se cumplan esas tres condiciones (#51). Las reservaciones de clases grupales siguen el mismo criterio y solo se automatizarán con control de cupos (S46).

### F2. Venta → pago → confirmación humana → socio
1. El lead elige un plan. El agente de pagos comparte las opciones: datos SPEI, link de pago del plan, o pago en sucursal.
2. El lead envía un comprobante (imagen o PDF). El agente responde "¡Recibido! El equipo lo está validando 💪" y crea un escalamiento `PAGO` con el comprobante adjunto y el plan elegido.
3. Se notifica a Recepción (bandeja del CRM con sonido, WhatsApp al staff y email). Fuera de horario, el agente avisa que la confirmación llegará en horario de atención.
4. Recepción revisa y **confirma** o **rechaza** con un motivo.
   - **Confirma:** se crea la membresía (plan, fecha de inicio y de vencimiento), el lead pasa a **Socio** y se envía la bienvenida automática.
   - **Rechaza:** el agente informa el motivo al lead y le pide un nuevo comprobante o le ofrece otra forma de pago.
5. Si el lead paga en efectivo o con tarjeta en sucursal, Recepción registra el pago manualmente en el CRM y continúa en el paso 4 (Confirma).

### F3. Escalamiento por conocimiento, queja o solicitud de humano
1. El agente detecta el disparador, avisa al lead que una persona del equipo le contestará y se pausa.
2. Se crea un escalamiento y se notifica a Recepción.
3. Recepción **toma** la conversación y responde desde el CRM (los mensajes salen por el mismo número).
4. Al terminar, Recepción **devuelve** la conversación a la IA. Opcionalmente, el Admin agrega la respuesta a la base de conocimiento.

### F4. Seguimiento dentro de la ventana de 24 h
- Si el lead deja de responder, el agente hace hasta 2 seguimientos **solo dentro de la ventana de 24 h** desde el último mensaje del lead. No se envían seguimientos comerciales con plantilla fuera de la ventana.
- No se envían seguimientos entre las 9:00 p. m. y las 8:00 a. m. (`America/Mexico_City`). Un seguimiento que caiga en ese rango se recorre a las 8:00 a. m. si sigue dentro de la ventana de 24 h; si no, se cancela.
- Si el lead pide no ser contactado, se registra una **exclusión comercial** y no se envían más seguimientos, aunque vuelva a escribir, hasta que haya una autorización expresa. Tiempos y textos en [playbook-ventas.md §5](negocio/playbook-ventas.md).

### F5. Renovación
- Antes del vencimiento de la membresía, el sistema envía un recordatorio de renovación (plantilla de WhatsApp de tipo utilidad). Si el socio responde, el agente de pagos retoma el flujo F2.

---

## 5. Datos (modelo conceptual)

| Entidad | Campos clave |
|---|---|
| **Lead / Contacto** | nombre, teléfono (WhatsApp, E.164), horario preferido (mañana/tarde/noche), origen (orgánico / anuncio + datos del referral), etapa del pipeline, etiquetas, fecha de creación, último mensaje del lead (para la ventana de 24 h), exclusión comercial (fecha y motivo) |
| **Conversación** | lead, modo (`IA` / `HUMANO`), agente activo, usuario asignado, estado |
| **Mensaje** | conversación, dirección (entrante/saliente), autor (lead / agente X / usuario Y / sistema), tipo (texto/imagen/audio/PDF/plantilla), contenido, transcripción (si es audio), media almacenada, estado de entrega de WhatsApp, timestamp |
| **Escalamiento** | tipo, prioridad, conversación, motivo o resumen generado por la IA, adjuntos, estado (`ABIERTO` / `EN_PROCESO` / `RESUELTO`), quién lo resolvió, timestamps (para medir tiempos) |
| **Pago** | lead, plan, monto, método (SPEI / link / efectivo / tarjeta), comprobante, estado (`EN_REVISIÓN` / `CONFIRMADO` / `RECHAZADO`), motivo de rechazo, revisado por, timestamps |
| **Membresía** | socio, plan, fecha de inicio, fecha de vencimiento, estado |
| **Plan** | nombre, precio, duración, descripción, link de pago, activo |
| **Conocimiento** | horarios, ubicación, clases, reglamento, FAQ, promociones (con vigencia), datos SPEI, mensajes estándar (bienvenida, rechazo médico, fuera de horario) |
| **Cita** | lead, fecha y hora, tipo (visita / clase de prueba), id del evento en Google Calendar, estado (agendada / asistió / no asistió / cancelada) |
| **Usuario** | nombre, email, rol (`ADMIN` / `RECEPCION`), activo |
| **Bitácora** | quién hizo qué y cuándo (confirmaciones de pago, cambios de conocimiento, tomas y devoluciones de conversación) |

**Etapas del pipeline:** `Nuevo` → `En conversación` → `Visita agendada` → `Visitó` → `Pago en revisión` → `Socio` · (`Perdido` en cualquier punto).

---

## 6. Alcance

### 6.1 MVP (dentro de alcance)

- Integración con **WhatsApp Meta Cloud API**: recibir y enviar texto, imágenes, PDF y notas de voz, y enviar plantillas de utilidad.
- **Transcripción de notas de voz** para que el agente las entienda.
- **4 agentes** (Router, Info, Ventas, Pagos) sobre **Anthropic Claude**, con los límites duros de la sección 3.1.
- **Base de conocimiento editable** en el CRM por el Admin, sin necesidad de un desarrollador.
- **Integración con Google Calendar** para consultar disponibilidad y crear visitas o clases de prueba.
- **Bandeja de conversaciones** con historial completo y vista en tiempo real.
- **Bandeja de escalamientos** con contador, alerta sonora y filtros por tipo.
- **Notificaciones de escalamiento** por CRM, WhatsApp al staff y email.
- **Handoff humano:** tomar la conversación, responder desde el CRM y devolverla a la IA.
- **Flujo HITL de pagos:** cola de comprobantes, confirmar o rechazar, y registrar pagos presenciales.
- **Post-pago automático:** cambio a Socio, mensaje de bienvenida y creación de la membresía con su fecha de vencimiento.
- **Recordatorio de renovación** antes del vencimiento.
- **Recordatorio de visita** agendada.
- **Seguimiento automático** del lead inactivo, solo dentro de la ventana de 24 h.
- **Pipeline de leads** (lista y kanban) con etapa, origen y horario preferido.
- **Dashboard de métricas** (sección 8).
- **Autenticación y roles** (Admin, Recepción).
- **Bitácora** de acciones críticas.
- Despliegue en cloud económico (Render/Railway + MongoDB Atlas).

### 6.2 Fuera de alcance (MVP)

- Varias sucursales o multi-tenant.
- Integración por API o webhook con pasarelas de pago (confirmación automática). En el MVP **todo pago lo confirma un humano**.
- Integración con el sistema de control de acceso o de socios del gimnasio.
- Campañas masivas, broadcast o marketing con plantillas fuera de la ventana de 24 h.
- Reactivación de exsocios e importación de bases existentes.
- Formulario web o landing que inicie conversaciones.
- Otros canales (Instagram DM, Messenger, web chat).
- Agentes de entrenamiento o nutrición (consejos personalizados).
- Respuestas del agente en audio (voz saliente).
- App móvil nativa para el staff (el CRM será web responsive).
- Facturación (CFDI).
- Edición de prompts o creación de agentes nuevos desde la interfaz.

---

## 7. Historias de usuario y criterios de aceptación

### Épica A — Atención del lead por IA

**A1. Respuesta inmediata al lead nuevo**
*Como lead, quiero recibir una respuesta en segundos cuando escribo, para resolver mis dudas sin esperar.*
- **Dado** que un número nuevo escribe al WhatsApp del gimnasio, **cuando** llega el mensaje, **entonces** se crea un Lead en etapa `Nuevo` y el agente responde en menos de 60 s (p95).
- Si el mensaje viene de un anuncio Click-to-WhatsApp, el origen y los datos del anuncio quedan guardados en el lead.
- El agente saluda con la persona definida (tuteo y tono motivador) y pregunta el nombre si no lo conoce.

**A2. Información general confiable**
*Como lead, quiero preguntar horarios, ubicación, clases y reglas, y recibir datos correctos.*
- Las respuestas usan solo la base de conocimiento vigente. Un cambio guardado por el Admin se refleja en la siguiente respuesta.
- **Dado** que la pregunta no está cubierta por la base de conocimiento, **entonces** el agente no improvisa, avisa que una persona le contestará y crea un escalamiento `FUERA_DE_CONOCIMIENTO`.

**A3. Explicación de planes y precios**
*Como lead, quiero conocer los planes y precios para decidir cuál me conviene.*
- El agente solo menciona los planes activos y las promociones vigentes en la fecha actual.
- El agente pregunta el horario preferido y lo guarda en el lead.
- Si el lead pide descuento o negocia, el agente no ofrece nada que no esté en las promociones y crea un escalamiento `QUEJA_NEGOCIACION`.

**A4. Agendar visita o clase de prueba**
*Como lead, quiero agendar una visita o clase de prueba sin tener que llamar.*
- El agente propone al menos 2 horarios disponibles, tomados de Google Calendar dentro del horario del gimnasio.
- Al confirmar, se crea el evento en Google Calendar y una Cita en el CRM, y el lead pasa a `Visita agendada`.
- El lead recibe una confirmación con la fecha, la hora y la dirección.
- El lead recibe un recordatorio antes de la visita.
- Si el lead pide reagendar o cancelar, el agente actualiza el evento y la Cita.
- **Operación provisional (MVP):** hasta que se cumplan las condiciones de F1 (Calendar, dirección y reglas de agenda), el agente no propone horarios ni confirma: registra la preferencia, escala `TRAMITE_RECEPCION` y recepción confirma. Los criterios de arriba siguen siendo el objetivo.

**A5. Entender notas de voz**
*Como lead, quiero mandar audios y que me entiendan.*
- Las notas de voz se transcriben, y el agente responde con base en la transcripción.
- La transcripción queda visible en el historial del CRM junto al audio.
- Si la transcripción falla, el agente pide amablemente que lo escriba.

**A6. Límite médico y de nutrición**
*Como dueño, quiero que la IA no dé consejos médicos ni de nutrición, para evitar riesgos.*
- Ante preguntas sobre lesiones, dietas, suplementos o condiciones médicas, el agente responde con el mensaje estándar configurado (recomienda acudir a un profesional) y redirige a información del gimnasio.
- No se emiten recomendaciones de dieta, dosis ni rutinas para lesiones.

**A7. Seguimiento de leads inactivos**
*Como dueño, quiero que la IA haga seguimiento a quien dejó de responder, sin violar las reglas de WhatsApp.*
- Se envían como máximo 2 seguimientos por silencio, y solo si siguen dentro de la ventana de 24 h desde el último mensaje del lead.
- No se envían seguimientos si la conversación está en modo `HUMANO`, si el lead es `Socio` o si es `Perdido`.
- Si el lead responde, se cancelan los seguimientos pendientes.
- Se respetan el horario silencioso y la exclusión comercial descritos en F4.

### Épica B — Pagos con validación humana (HITL)

**B1. Opciones de pago**
*Como lead, quiero saber cómo pagar el plan que elegí.*
- El agente comparte los datos SPEI configurados, el link de pago del plan (si existe) y la opción de pagar en sucursal.
- El monto mostrado coincide con el precio vigente del plan.

**B2. Envío de comprobante**
*Como lead, quiero mandar mi comprobante y saber que lo están revisando.*
- **Dado** que el lead envía una imagen o un PDF en contexto de pago, **entonces** se crea un Pago `EN_REVISIÓN` con el comprobante almacenado de forma permanente y un escalamiento `PAGO`, y el lead pasa a `Pago en revisión`.
- El agente responde que el pago está en revisión, **sin confirmarlo**.
- Fuera del horario de atención, el agente indica que la confirmación llegará en horario de atención.
- El agente nunca usa frases como "tu pago está confirmado" mientras el pago no esté `CONFIRMADO` por un humano (se valida con casos de prueba).

**B3. Validar comprobante**
*Como recepcionista, quiero ver los comprobantes pendientes y confirmarlos o rechazarlos rápido.*
- La cola de pagos muestra el comprobante, el lead, el plan, el monto esperado y el tiempo de espera, ordenados del más antiguo al más reciente.
- **Confirmar:** se crea la membresía con fechas de inicio y vencimiento según la duración del plan, el lead pasa a `Socio`, se envía la bienvenida automática y se cierra el escalamiento.
- **Rechazar:** exige un motivo. El agente informa al lead y le pide un nuevo comprobante o le ofrece otra forma de pago.
- Ambas acciones quedan en la bitácora (usuario y fecha/hora).
- Un pago no puede confirmarse dos veces. Si dos usuarios actúan a la vez, prevalece el primero y el segundo ve un aviso.

**B4. Registrar pago presencial**
*Como recepcionista, quiero registrar un pago en efectivo o con tarjeta hecho en mostrador, para que el lead quede como socio.*
- Desde la ficha del lead, Recepción registra el plan, el monto y el método (efectivo o tarjeta).
- Se ejecutan los mismos efectos que en "Confirmar" de B3.

**B5. Bienvenida al socio**
*Como socio nuevo, quiero recibir información para mi primer día.*
- Al confirmarse el pago se envía el mensaje de bienvenida configurado por el Admin.
- Si la ventana de 24 h está cerrada, se envía como plantilla aprobada.

**B6. Recordatorio de renovación**
*Como dueño, quiero que los socios reciban un aviso antes de que venza su membresía.*
- Se envía un recordatorio N días antes del vencimiento (N configurable) usando una plantilla de utilidad aprobada.
- Si el socio responde, el agente de pagos retoma el flujo de pago.
- Se envía como máximo un recordatorio por periodo, y no se envía si ya hay un pago de renovación en revisión o confirmado.

### Épica C — Escalamiento y handoff humano

**C1. Notificación de escalamiento**
*Como recepcionista, quiero enterarme de inmediato cuando la IA necesita ayuda.*
- Al crearse un escalamiento: aparece en la bandeja del CRM en tiempo real (contador y sonido), se envía un WhatsApp a los números del staff configurados y se envía un email a los usuarios configurados.
- La notificación incluye el tipo, el nombre del lead, un resumen generado por la IA y un link a la conversación.

**C2. Tomar y devolver una conversación**
*Como recepcionista, quiero tomar una conversación y responder yo, y luego devolvérsela a la IA.*
- Al tomarla, la conversación pasa a modo `HUMANO`, queda asignada al usuario y la IA deja de responder.
- Los mensajes del humano se envían desde el CRM por el mismo número y quedan marcados con su autor.
- Al devolverla, la IA retoma con el contexto completo de la conversación, incluidos los mensajes del humano.
- La conversación permanece en modo `HUMANO` hasta que alguien la devuelva explícitamente.
- Si la ventana de 24 h está cerrada, el CRM avisa al humano y solo permite enviar una plantilla.

**C3. Solicitud explícita de humano, quejas y negociación**
- Si el lead pide hablar con una persona, se queja o negocia el precio, el agente lo reconoce con empatía, avisa que alguien del equipo le contestará, crea el escalamiento del tipo correspondiente y se pausa.

### Épica D — Administración y conocimiento

**D1. Editar la base de conocimiento**
*Como Admin, quiero actualizar planes, precios, horarios, FAQ, promociones y datos de pago sin depender de un desarrollador.*
- Hay formularios para: planes (nombre, precio, duración, descripción, link de pago, activo), promociones (texto y vigencia), horarios, ubicación, clases, reglamento, FAQ, datos SPEI y mensajes estándar.
- Los cambios aplican de inmediato a los agentes.
- Cada cambio queda en la bitácora.
- Solo el rol Admin puede editar.

**D2. Gestionar usuarios**
*Como Admin, quiero dar de alta o de baja al personal de recepción.*
- El Admin crea, desactiva y asigna roles. Un usuario desactivado no puede iniciar sesión.

**D3. Configurar notificaciones y horario**
*Como Admin, quiero definir el horario de atención humana y a quién se notifica.*
- Son configurables: el horario de atención humana por día de la semana, los números de WhatsApp del staff, los emails de notificación y los días de anticipación del recordatorio de renovación.

### Épica E — Pipeline y métricas

**E1. Ver y gestionar el pipeline**
*Como recepcionista o Admin, quiero ver los leads por etapa y su historial.*
- Hay vista de lista y kanban por etapa, con filtros por origen, etapa, fecha y horario preferido.
- La ficha del lead muestra los datos, el historial de mensajes, las citas, los pagos y los escalamientos.
- Recepción y Admin pueden mover etapas manualmente (por ejemplo, `Visitó`, `No asistió` o `Perdido`).
- Las etapas no son estrictamente secuenciales: un lead puede pasar a `Socio` desde cualquier etapa cuando recepción registra un pago (B4). `Perdido` es manual en el MVP.

**E2. Dashboard de métricas**
*Como dueño, quiero ver el desempeño del embudo y de la atención.*
- Muestra las métricas de la sección 8 filtrables por rango de fechas y por origen (orgánico o anuncio).

---

## 8. Métricas de éxito

Las metas son iniciales. Se ajustarán con la línea base de las primeras 4 semanas (ver SUPUESTOS).

| Métrica | Definición | Meta MVP |
|---|---|---|
| **Tiempo de primera respuesta** | Desde el primer mensaje del lead hasta la primera respuesta del agente | p95 < 60 s, 24/7 |
| **Tiempo de confirmación de pago** | Desde que se recibe el comprobante hasta que un humano lo confirma o rechaza, **en horario de atención** | Mediana < 30 min |
| **% resolución informativa autónoma** | Conversaciones del periodo **sin** escalamientos `FUERA_DE_CONOCIMIENTO`, `SOLICITUD_HUMANO`, `QUEJA_NEGOCIACION` ni `EMERGENCIA` ÷ total de conversaciones del periodo | ≥ 70 % |
| **% intervenciones humanas** | Conversaciones con al menos un escalamiento **de cualquier tipo** (incluye `PAGO` y `TRAMITE_RECEPCION`) ÷ total de conversaciones, desglosado por tipo. El dashboard muestra numerador y denominador de ambas métricas; ningún caso escalado se excluye del total | Solo monitoreo |
| **% lead → visita agendada** | Leads con al menos una cita ÷ leads nuevos del periodo | ≥ 30 % |
| **% lead → socio pagado** | Leads con pago confirmado ÷ leads nuevos del periodo | ≥ 10 % |
| *Secundarias* | Asistencia a visitas (`Visitó` ÷ `Visita agendada`), tasa de renovación, tasa de rechazo de comprobantes, volumen de escalamientos por tipo y número de respuestas del agente marcadas como incorrectas | Solo monitoreo |

**Métrica de guardia (no se negocia):** 0 pagos confirmados por la IA y 0 precios o promociones inventados en la muestra auditada.

---

## 9. Requisitos no funcionales

- **Stack:** MongoDB, Express, React y Node.js.
- **Volumen:** 1 sucursal y menos de 50 leads nuevos al día. El diseño debe soportar picos de campañas sin perder mensajes (webhook idempotente y cola de procesamiento).
- **Costo:** infraestructura + IA por debajo de ~$50 USD al mes, sin contar el costo de mensajes de Meta.
- **Confiabilidad:** el webhook responde rápido a Meta y procesa de forma asíncrona. Los mensajes duplicados se ignoran por `message_id`.
- **Tiempo real:** la bandeja y los escalamientos se actualizan sin recargar la página.
- **Seguridad:** autenticación con roles, verificación de la firma del webhook de Meta, secretos en variables de entorno y comprobantes accesibles solo para usuarios autenticados.
- **Privacidad:** cumplimiento de la LFPDPPP, con aviso de privacidad disponible para el lead.
- **Idioma:** interfaz y agentes en español de México. Zona horaria `America/Mexico_City`.
- **Responsive:** el CRM debe ser usable desde el celular del recepcionista.

---

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| Alucinación de precios o políticas | Respuestas basadas solo en la base de conocimiento, límites duros en el prompt y evaluaciones con casos de prueba |
| Recepción no atiende los escalamientos a tiempo | Notificaciones múltiples y métrica visible de tiempo de confirmación |
| Bloqueo o baja calidad del número en Meta | API oficial, sin marketing fuera de la ventana de 24 h y plantillas solo de utilidad |
| Comprobantes falsos | Validación humana obligatoria contra el estado de cuenta o el panel del proveedor de pagos |
| Presupuesto de IA excedido | Modelo ligero para el router, límite de contexto por conversación y monitoreo de tokens |
