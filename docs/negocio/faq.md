# Preguntas frecuentes — Fuerza Gym

> **Negocio ficticio.** Respuestas simuladas para fines académicos.
> `[CONFIRMAR]` = dato de la entrevista (2026-10-23) que requiere validación de negocio. `[PENDIENTE]` = no definido; Sofía escala.
>
> Las respuestas salen **solo** de [catalogo.md](catalogo.md), [horarios.md](horarios.md) y
> [playbook-ventas.md](playbook-ventas.md). Si un dato cambia allí, cambia aquí.
>
> **Columna "Atiende":**
> - **Sofía**: responde sola.
> - **Sofía + escala**: responde lo general y crea un escalamiento del tipo indicado.
> - **Humano**: Sofía avisa que lo canaliza y se pausa (ver [playbook-ventas.md §6](playbook-ventas.md)).

## Índice

| # | Pregunta | Categoría | Atiende |
|---|---|---|---|
| 1 | ¿Cuánto cuesta la mensualidad? | Costos y planes | Sofía |
| 2 | ¿Qué planes tienen? | Costos y planes | Sofía |
| 3 | ¿Qué incluye la membresía? | Costos y planes | Sofía |
| 4 | ¿Tienen plan para estudiantes? ¿Qué necesito? | Costos y planes | Sofía |
| 5 | ¿Venden pase por día? | Costos y planes | Sofía |
| 6 | ¿Cobran inscripción? | Inscripción | Sofía |
| 7 | Si dejo de ir un tiempo, ¿vuelvo a pagar inscripción? | Inscripción | Sofía |
| 8 | ¿Me puedo inscribir si soy menor de edad? | Inscripción | Humano (`SOLICITUD_HUMANO`) |
| 9 | ¿Puedo conocer el gym antes de pagar? | Inscripción | Sofía + escala (`TRAMITE_RECEPCION`) |
| 10 | ¿Qué horario tienen? | Horarios | Sofía |
| 11 | ¿Abren en días festivos? | Horarios | Sofía (fechas no listadas: + escala) |
| 12 | ¿A qué hora atiende recepción? | Horarios | Sofía |
| 13 | ¿Dónde están? | Instalaciones | Sofía + escala (`TRAMITE_RECEPCION`) |
| 14 | ¿Tienen estacionamiento? | Instalaciones | Sofía |
| 15 | ¿Hay regaderas y lockers? | Instalaciones | Sofía |
| 16 | ¿Qué tengo que llevar? | Instalaciones | Sofía |
| 17 | ¿Hay entrenadores? ¿Me arman una rutina? | Entrenadores | Sofía |
| 18 | ¿Cuánto cuesta un entrenador personal? | Entrenadores | Sofía (para agendar: + escala `TRAMITE_RECEPCION`) |
| 19 | ¿Tienen nutriólogo? | Entrenadores | Sofía (para agendar: + escala `TRAMITE_RECEPCION`) |
| 20 | ¿Qué clases tienen y a qué hora? | Clases | Sofía |
| 21 | ¿Cómo reservo una clase? | Clases | Sofía + escala (`TRAMITE_RECEPCION`) |
| 22 | ¿Tienen alguna promoción? | Promociones | Sofía |
| 23 | ¿Cómo puedo pagar? | Pagos | Sofía (datos SPEI: + escala) |
| 24 | ¿Aceptan meses sin intereses? | Pagos | Sofía |
| 25 | Ya pagué, ¿cuándo se activa mi membresía? | Pagos | Sofía + escala (`PAGO`) |
| 26 | ¿Puedo cancelar? ¿Me devuelven mi dinero? | Cancelaciones | Humano (`SOLICITUD_HUMANO`) |
| 27 | ¿Puedo congelar mi membresía? | Cancelaciones | Sofía + escala (`TRAMITE_RECEPCION`) |
| 28 | ¿Puedo pasar mi membresía a otra persona? | Cancelaciones | Sofía |
| 29 | ¿Cómo entro al gimnasio? | Acceso | Sofía |
| 30 | ¿Puedo llevar a un acompañante? | Acceso | Sofía |
| 31 | ¿Estoy hablando con una persona o con un robot? | Sobre Sofía | Sofía |
| 32 | ¿Tienen WiFi gratuito? | Instalaciones | Sofía |
| 33 | ¿Las regaderas tienen agua caliente? | Instalaciones | Sofía |
| 34 | ¿El gimnasio tiene aire acondicionado? | Instalaciones | Sofía |
| 35 | ¿Hay mucha gente por las tardes o noches? | Horarios | Sofía |
| 36 | ¿Es un gimnasio seguro para mujeres? | Seguridad | Sofía (reporte de incidente: Humano) |
| 37 | ¿Tienen cámaras de seguridad? | Seguridad | Sofía |
| 38 | Nunca he ido a un gimnasio, ¿puedo inscribirme? | Primera visita | Sofía |
| 39 | ¿Puedo entrenar sin contratar un entrenador personal? | Primera visita | Sofía |
| 40 | ¿Puedo renovar mi membresía antes de que venza? | Membresías | Sofía + escala (`TRAMITE_RECEPCION`) |

---

## Costos y planes

**1. ¿Cuánto cuesta la mensualidad?** `[CONFIRMAR]`
El plan Mensual General cuesta **$499** por 30 días, más **$199** de inscripción la primera vez (total
inicial **$698**). Precios en MXN con IVA incluido. También tenemos planes Trimestral, Semestral y Estudiante,
por si quieres compararlos. 💪

**2. ¿Qué planes tienen?** `[CONFIRMAR]`
- **Pase diario:** $90, solo el día de compra, en sucursal.
- **Mensual General:** $499 por 30 días (+ $199 de inscripción).
- **Trimestral:** $1,299 por 90 días, sin inscripción (aprox. $433 al mes, pago en una sola exhibición).
- **Semestral:** $2,399 por 180 días, sin inscripción (aprox. $399.83 al mes, pago en una sola exhibición).
- **Estudiante:** $399 por 30 días (+ $199 de inscripción), con credencial escolar vigente.

¿Qué horario te acomoda más para entrenar? Así te ayudo a elegir.

**3. ¿Qué incluye la membresía?** `[CONFIRMAR]`
Los planes Mensual, Trimestral, Semestral y Estudiante incluyen:
- pesas y máquinas, cardio y zona funcional;
- clases grupales (spinning, funcional, HIIT y acondicionamiento) con reservación y cupo limitado;
- una orientación inicial con un entrenador de piso;
- apoyo de entrenadores de piso en su horario;
- vestidores, regaderas, lockers temporales y WiFi.

El entrenamiento personalizado, la nutrición y la evaluación física se cobran aparte.

**4. ¿Tienen plan para estudiantes? ¿Qué necesito?** `[CONFIRMAR]`
Sí, el **Plan Estudiante** cuesta $399 por 30 días (+ $199 de inscripción la primera vez) e incluye lo mismo
que el Mensual General, sin restricción de horario. Necesitas ser estudiante activo y presentar tu
**credencial escolar vigente en recepción** al inscribirte o renovar. No hace falta que me la mandes por aquí. 😊

**5. ¿Venden pase por día?** `[CONFIRMAR]`
Sí, el **Pase diario** cuesta $90 y vale solo el día que lo compras. Se paga **en sucursal**, en horario de
recepción, en efectivo o con tarjeta; no se vende por WhatsApp ni por transferencia. Incluye pesas, cardio,
funcional, vestidores y lockers temporales, pero **no** clases grupales.

## Inscripción

**6. ¿Cobran inscripción?** `[CONFIRMAR]`
Sí: **$199** (pago único) en los planes Mensual General y Estudiante. Los planes **Trimestral y Semestral no
pagan inscripción**, y el Pase diario tampoco. No hay anualidad ni cuota de mantenimiento.

**7. Si dejo de ir un tiempo, ¿vuelvo a pagar inscripción?** `[CONFIRMAR]`
Solo si pasan **más de 30 días naturales** desde que venció tu membresía y contratas Mensual General o
Estudiante. Si renuevas antes de vencer o dentro de esos 30 días, no pagas reinscripción. Trimestral y
Semestral nunca la pagan. Si tu caso es especial, recepción lo revisa contigo.

**8. ¿Me puedo inscribir si soy menor de edad?** `[CONFIRMAR]`
Desde los **16 años**. Si tienes 16 o 17, necesitas autorización escrita de tu papá, mamá o tutor, y que te
acompañe a inscribirte. Menores de 16 no pueden inscribirse. Para tu trámite te canalizo con recepción. 😊
→ Sofía **no** pide edad, identificación ni datos adicionales, no confirma la inscripción y escala
(`SOLICITUD_HUMANO`).

**9. ¿Puedo conocer el gym antes de pagar?** `[CONFIRMAR]`
¡Claro! Tienes **una visita gratuita**: un recorrido de 20 a 30 min y acceso a las áreas generales ese mismo
día (sin clases grupales). Se puede hacer de L-V de 7:00 a. m. a 9:00 p. m., sábado de 8:00 a. m. a 6:00 p. m.
o domingo de 9:00 a. m. a 2:00 p. m. ¿Qué día y hora te quedan mejor? Recepción te confirma la visita.
Lleva una identificación para registrarte al llegar.
→ Sofía registra el día y la hora preferidos y escala (`TRAMITE_RECEPCION`). **No** confirma la cita (operación
provisional, ver [horarios.md §5](horarios.md)).

## Horarios

**10. ¿Qué horario tienen?** `[CONFIRMAR]`
- Lunes a viernes: 5:00 a. m. a 11:00 p. m.
- Sábado: 7:00 a. m. a 8:00 p. m.
- Domingo: 8:00 a. m. a 3:00 p. m.

El último acceso es 30 min antes del cierre.

**11. ¿Abren en días festivos?** `[CONFIRMAR]`
- **Cerramos** el 1 de enero y el 25 de diciembre.
- El 16 de septiembre, el 24 y el 31 de diciembre abrimos de **8:00 a. m. a 2:00 p. m.**, sin clases grupales.
- El 5 de febrero y durante la Feria de San Marcos, horario habitual salvo aviso.

Para otras fechas, el horario está **sujeto a confirmación**.
→ Para una fecha no listada, Sofía no inventa el horario: informa que requiere confirmación y escala
(`FUERA_DE_CONOCIMIENTO`, con pausa).

**12. ¿A qué hora atiende recepción?** `[CONFIRMAR]`
- Lunes a viernes: 7:00 a. m. a 9:00 p. m.
- Sábado: 8:00 a. m. a 6:00 p. m.
- Domingo: 9:00 a. m. a 2:00 p. m.

Inscripciones, pagos, visitas y reservaciones se atienden en ese horario.

## Instalaciones

**13. ¿Dónde están?** `[CONFIRMAR]` / dirección `[PENDIENTE]`
Estamos en la **zona norte de Aguascalientes**. Para darte la ubicación exacta te canalizo con recepción. 😊
→ Sofía **no** inventa dirección ni enlace de Maps y escala (`TRAMITE_RECEPCION`). PENDIENTES #4.

**14. ¿Tienen estacionamiento?** `[CONFIRMAR]`
Sí, gratuito para clientes, sujeto a disponibilidad.

**15. ¿Hay regaderas y lockers?** `[CONFIRMAR]`
Sí. Hay vestidores y regaderas con agua caliente. Los lockers son temporales y sin costo mientras entrenas.
Lleva tu propio candado y desocúpalo al terminar. No rentamos lockers fijos.

**16. ¿Qué tengo que llevar?** `[CONFIRMAR]`
- Ropa deportiva y **tenis cerrados** (no sandalias ni huaraches).
- Toalla.
- Candado si vas a usar locker.
- Tu agua en recipiente con tapa (evita el vidrio).

Si es tu visita gratuita, trae una identificación para registrarte. 💪

## Entrenadores

**17. ¿Hay entrenadores? ¿Me arman una rutina?** `[CONFIRMAR]`
Hay **entrenadores de piso** que te orientan en el uso de los equipos: L-V de 6:00 a. m. a 10:00 p. m.,
sábado de 8:00 a. m. a 7:00 p. m. y domingo de 9:00 a. m. a 2:00 p. m. Al inscribirte tienes una orientación
inicial. Un plan personalizado es un servicio aparte: **entrenamiento personalizado** o **evaluación física**.
→ Sofía **no** arma rutinas.

**18. ¿Cuánto cuesta un entrenador personal?** `[CONFIRMAR]`
- Sesión individual de 60 min: **$250**.
- Paquete de 4 sesiones: **$900**.

Los horarios se coordinan con recepción.
→ Si quiere agendar, Sofía escala (`TRAMITE_RECEPCION`). No confirma citas ni disponibilidad.

**19. ¿Tienen nutriólogo?** `[CONFIRMAR]`
Sí, hay **asesoría nutricional** con profesional especializado por **$450**, previa cita en recepción. Yo no
puedo darte recomendaciones de alimentación, pero con gusto te canalizo para agendarla.
→ Si quiere agendar, Sofía escala (`TRAMITE_RECEPCION`). Si pide una dieta o un consejo, usa el mensaje
estándar médico ([playbook-ventas.md §8](playbook-ventas.md)).

## Clases

**20. ¿Qué clases tienen y a qué hora?** `[CONFIRMAR]`
Spinning, funcional, HIIT y acondicionamiento general. Algunos ejemplos:
- Spinning: L-M-V 6:00 a. m.
- Funcional: L-V 8:00 a. m.
- HIIT: Ma-J 6:00 p. m.

¿Qué días y horario te interesan? Te paso los de esa clase. Están incluidas en tu membresía (no en el Pase
diario) y requieren reservación.
→ Calendario completo en [horarios.md §3](horarios.md). Sofía no garantiza que haya lugar.

**21. ¿Cómo reservo una clase?** `[CONFIRMAR]`
Puedes pedirla en recepción o por aquí, desde **24 h antes** de la clase. El cupo es limitado, así que
**recepción te confirma tu lugar**. Si no puedes ir, avisa con al menos 2 h de anticipación.
→ Sofía registra la solicitud y escala (`TRAMITE_RECEPCION`). No confirma lugares.

## Promociones

**22. ¿Tienen alguna promoción?** `[CONFIRMAR]`
Por ahora **no hay promociones temporales activas**. Lo que sí tenemos siempre:
- los planes **Trimestral y Semestral no pagan inscripción**;
- existe el **Plan Estudiante**.

¿Te cuento de alguno?
→ Sofía no promete promociones futuras ni da descuentos. Si el lead insiste, escala (`QUEJA_NEGOCIACION`).

## Pagos

**23. ¿Cómo puedo pagar?** `[CONFIRMAR]` / datos SPEI `[PENDIENTE]`
- **En sucursal:** efectivo, tarjeta de débito o de crédito, en horario de recepción.
- **Por transferencia SPEI:** los datos bancarios te los comparte recepción.

Por ahora no manejamos links de pago.
→ Sofía **no** da datos bancarios mientras estén pendientes y escala (`TRAMITE_RECEPCION`). PENDIENTES #7.

**24. ¿Aceptan meses sin intereses?** `[CONFIRMAR]`
Por ahora no. Puedes pagar con tarjeta de crédito, pero en una sola exhibición.

**25. Ya pagué, ¿cuándo se activa mi membresía?** `[CONFIRMAR]`
¡Gracias! Tu pago queda **en revisión**: recepción lo verifica y activa tu membresía. Tu vigencia empieza el
día de la activación. Si escribes fuera del horario de recepción, lo revisarán en su próximo horario de atención.
→ Sofía **nunca** dice "tu pago está confirmado". Crea un escalamiento `PAGO` (PRD B2).

## Cancelaciones

**26. ¿Puedo cancelar? ¿Me devuelven mi dinero?** `[CONFIRMAR]`
Puedes solicitar la cancelación en recepción; no hay cargos automáticos de renovación. Como política general,
las membresías ya pagadas y activadas no son reembolsables por decisión propia. Si hubo un cobro duplicado o
un error, el equipo revisa tu caso. Te canalizo con recepción. 😊
→ Sofía no promete ni niega un reembolso de forma definitiva. Escala (`SOLICITUD_HUMANO`).

**27. ¿Puedo congelar mi membresía?** `[CONFIRMAR]`
En los planes **Trimestral y Semestral** puedes solicitar un congelamiento de **7 a 15 días**, una vez por
periodo y con anticipación (no es retroactivo). Lo autoriza recepción.
→ Sofía no autoriza ni cambia fechas. Escala (`TRAMITE_RECEPCION`). Si menciona una lesión, no la valora.

**28. ¿Puedo pasar mi membresía a otra persona?** `[CONFIRMAR]`
No, las membresías son personales e intransferibles. Si tienes una situación especial, administración puede
revisarla.

## Acceso

**29. ¿Cómo entro al gimnasio?** `[CONFIRMAR]`
Con tu **código QR personal**, que recibes al activar tu membresía y muestras desde tu celular. Es
intransferible. Si no lo traes, el personal de acceso te apoya.
→ Sofía no genera ni reenvía QR. Si un socio lo perdió, escala (`TRAMITE_RECEPCION`).

**30. ¿Puedo llevar a un acompañante?** `[CONFIRMAR]`
Solo entran personas con acceso autorizado (socios, Pase diario o visita). Si tu acompañante quiere conocer
el gym, puede pedir su propia visita gratuita. No se permiten menores de 16 años en las áreas de entrenamiento
ni mascotas, salvo animales de asistencia.

## Sobre Sofía

**31. ¿Estoy hablando con una persona o con un robot?** `[CONFIRMAR]`
Soy **Sofía, asistente virtual** de Fuerza Gym. 🤖 Te ayudo con información de planes, horarios y servicios,
y si lo necesitas te canalizo con una persona de nuestro equipo.

## Más sobre instalaciones

**32. ¿Tienen WiFi gratuito?** `[CONFIRMAR]`
Sí, para socios. La contraseña te la dan en recepción.

**33. ¿Las regaderas tienen agua caliente?** `[CONFIRMAR]`
Sí, sujeto a disponibilidad operativa.

**34. ¿El gimnasio tiene aire acondicionado?** `[CONFIRMAR]`
Las áreas principales de entrenamiento cuentan con ventilación y climatización.

**35. ¿Hay mucha gente por las tardes o noches?** `[CONFIRMAR]`
Varía según el día. En general, el horario de mayor actividad es de **6:00 a 9:00 p. m.** Si prefieres
entrenar con menos gente, puede convenirte otro horario.
→ Sin cifras de ocupación y sin garantizar equipos libres.

## Seguridad

**36. ¿Es un gimnasio seguro para mujeres?** `[CONFIRMAR]`
Promovemos un ambiente de respeto e inclusión para todas las personas. Hay personal durante todo el horario
de operación y reglas que prohíben el acoso, las conductas intimidatorias y grabar a otros sin su consentimiento.
→ Sofía no garantiza que nunca haya incidentes. Un reporte de acoso o inseguridad se escala de inmediato
(`QUEJA_NEGOCIACION`) y Sofía se pausa.

**37. ¿Tienen cámaras de seguridad?** `[CONFIRMAR]`
Sí, en accesos y áreas comunes. Nunca en vestidores, regaderas ni sanitarios.
→ Si preguntan por el uso de las grabaciones o de sus datos, aplica el aviso de privacidad `[PENDIENTE]`
(PENDIENTES #8): Sofía escala (`SOLICITUD_HUMANO`).

## Primera visita

**38. Nunca he ido a un gimnasio, ¿puedo inscribirme?** `[CONFIRMAR]`
¡Claro que sí! Recibimos a muchas personas que empiezan. Tu membresía incluye una orientación inicial para
conocer las instalaciones, las reglas y cómo usar los equipos, y hay entrenadores de piso para apoyarte. Si
quieres, primero agenda tu visita gratuita. 💪
→ Sin rutinas personalizadas.

**39. ¿Puedo entrenar sin contratar un entrenador personal?** `[CONFIRMAR]`
Sí. Tu membresía te da acceso a todas las áreas generales, y los entrenadores de piso te orientan en su
horario. El entrenamiento personalizado es opcional y se cobra aparte.

## Membresías

**40. ¿Puedo renovar mi membresía antes de que venza?** `[CONFIRMAR]`
Sí, y **no pierdes días**: el nuevo periodo empieza cuando termina el actual. La renovación la confirma
recepción cuando verifica tu pago.
→ Sofía no consulta fechas de vencimiento (no tiene acceso). Escala (`TRAMITE_RECEPCION`).
