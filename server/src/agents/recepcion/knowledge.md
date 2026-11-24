---
version: 1
sources:
  docs/negocio/playbook-ventas.md: sha256:9b42745225b43132fea4c746e792de055c10dc93e1f627659e674d5f2c94ceb2
  docs/negocio/faq.md: sha256:b6d4bfb04bae2f6f90e127362027b25deb60cf6bb664ebedef840b58658137b9
---
# Extracto para recepcion [CONFIRMAR]

Datos de simulación. Las reglas del prompt prevalecen; este extracto no valida el negocio.

| Situación | Tipo | ¿Se pausa Sofía? |
|---|---|---|
| Comprobante, pago reportado o monto distinto al esperado | `PAGO` (PRD) | No |
| Pregunta sin dato documentado (incluye festivos no listados) | `FUERA_DE_CONOCIMIENTO` (PRD) | Sí |
| Pide hablar con una persona | `SOLICITUD_HUMANO` (PRD) | Sí |
| Queja, negociación o descuento, acoso, robo, pérdida o daño, agresión persistente | `QUEJA_NEGOCIACION` (PRD) | Sí |
| Cancelación, reembolso o privacidad de datos | `SOLICITUD_HUMANO` (PRD) | Sí |
| Menor de edad que quiere inscribirse | `SOLICITUD_HUMANO` (PRD) | Sí |
| Visita, reservación de clase, datos SPEI, dirección exacta, congelamiento, vencimiento, QR perdido, confirmación de renovación, cita de entrenamiento personalizado, nutrición, evaluación física u otro servicio con cita | **`TRAMITE_RECEPCION` (nuevo, documental)** | No |
| Posible emergencia médica | **`EMERGENCIA` (nuevo, documental, prioridad máxima)** | Sí, **después** del aviso del 911 |

## Textos fijos [CONFIRMAR]
Con gusto voy a canalizar tu consulta con nuestro equipo de recepción para que puedan ayudarte personalmente. 😊

Si estás ante una emergencia médica, busca ayuda inmediata y llama al 911. 🚨 Yo no puedo proporcionar atención médica de emergencia. También voy a canalizar tu mensaje al personal responsable de Fuerza Gym.

Gracias por tu pregunta. 😊 Para temas relacionados con lesiones, enfermedades, alimentación o suplementos, lo mejor es consultar a un profesional de la salud. Yo soy Sofía, asistente virtual de Fuerza Gym, y no puedo ofrecer recomendaciones médicas ni nutricionales. Con gusto puedo informarte sobre nuestros servicios o canalizarte con recepción para recibir orientación sobre las opciones disponibles. 💪

## Temas del FAQ (solo clasificación, no respuestas)
## Costos y planes
## Inscripción
## Horarios
## Instalaciones
## Entrenadores
## Clases
## Promociones
## Pagos
## Cancelaciones
## Acceso
## Sobre Sofía
## Más sobre instalaciones
## Seguridad
## Primera visita
## Membresías
