---
version: 1
sources:
  docs/negocio/catalogo.md: sha256:5241ad94d7d17b264887feb23acfc83880f79e91cdd30805d4f176257ade89fa
  docs/negocio/playbook-ventas.md: sha256:9b42745225b43132fea4c746e792de055c10dc93e1f627659e674d5f2c94ceb2
---
# Extracto para ventas [CONFIRMAR]

Datos de simulación. Se conservan marcadores y reglas del prompt. El contenido no incluido se escala, no se inventa.

## 3. Membresías y precios `[CONFIRMAR]`

Precios en **MXN con IVA incluido**. Duración en **días naturales**.

| Plan | Precio | Duración | Requisito | Incluye |
|---|---:|---|---|---|
| Pase diario | $90 | 1 día (fecha de compra) | Solo en sucursal | Pesas, cardio, funcional, vestidores, regaderas y lockers temporales. **Sin** clases grupales ni servicios personalizados |
| Mensual General | $499 | 30 días | — | Todo lo de §2.1, sin restricción de horario |
| Trimestral | $1,299 | 90 días | Pago en una sola exhibición | Igual que Mensual General |
| Semestral | $2,399 | 180 días | Pago en una sola exhibición | Igual que Mensual General |
| Estudiante | $399 | 30 días | Credencial escolar vigente y ser estudiante activo | Igual que Mensual General, sin restricción de horario |

**Plan Estudiante:** es un **plan** con requisitos de elegibilidad, **no un descuento** sobre el Mensual
General. Recepción verifica la credencial en persona al inscribir o renovar. Sofía informa el requisito pero
**no** pide fotos de la credencial ni valida documentos por WhatsApp `[CONFIRMAR]`.

### 3.1 Equivalente mensual (argumento comercial autorizado) `[CONFIRMAR]`

Cálculo orientativo para comparar planes. **No** es una modalidad de pago fraccionado: Trimestral y Semestral
se pagan por adelantado en una sola exhibición.

| Plan | Precio total | Equivalente mensual aprox. |
|---|---:|---:|
| Mensual General | $499 | $499 |
| Trimestral | $1,299 | $433 |
| Semestral | $2,399 | $399.83 |

## 4. Inscripción y reinscripción `[CONFIRMAR]`

- **Cuota de inscripción:** $199 MXN, IVA incluido, pago único al contratar por primera vez.
- **Se cobra en:** Mensual General y Estudiante.
- **No se cobra en:** Trimestral y Semestral (beneficio **permanente** del plan, no una promoción) ni en el
  Pase diario.
- **No hay** anualidad ni cuota de mantenimiento.

### 4.1 Pago inicial por plan

| Plan | Membresía | Inscripción | Total inicial |
|---|---:|---:|---:|
| Pase diario | $90 | $0 | $90 |
| Mensual General | $499 | $199 | $698 |
| Trimestral | $1,299 | $0 | $1,299 |
| Semestral | $2,399 | $0 | $2,399 |
| Estudiante | $399 | $199 | $598 |

### 4.2 Reinscripción

- Si renueva **durante la vigencia** o dentro de los **30 días naturales** posteriores al vencimiento: **no**
  paga reinscripción.
- Si pasan **más de 30 días naturales** desde el vencimiento: paga de nuevo $199 al contratar Mensual General
  o Estudiante.
- Trimestral y Semestral siempre están exentos.
- Cualquier situación excepcional la resuelve recepción.

### 4.3 Edad para inscribirse

| Edad | Regla |
|---|---|
| 18 años o más | Se inscribe directamente |
| 16 y 17 años | Autorización escrita del padre, la madre o el tutor legal, quien debe estar presente en la inscripción |
| Menos de 16 años | No puede inscribirse ni entrar a las áreas generales de entrenamiento |

Sofía **no** pregunta la edad de forma proactiva (S7). Si el lead dice que es menor, Sofía explica la regla,
no pide documentos ni datos adicionales, no confirma la inscripción y **escala** (`SOLICITUD_HUMANO`).

## 6. Promociones `[CONFIRMAR]`

**No hay promociones temporales vigentes.**

- La exención de inscripción de Trimestral y Semestral es un beneficio permanente del plan, **no** una promoción.
- El Plan Estudiante es un plan, **no** un descuento.
- Ante "¿tienen promociones?", Sofía responde que no hay promociones temporales activas.
- Sofía no afirma que habrá promociones futuras.
- Una promoción nueva solo puede usarse si se registra con **fecha de inicio, fecha de fin y condiciones**.

## 7. Métodos de pago `[CONFIRMAR]`

| Método | Disponible | Detalle |
|---|---|---|
| SPEI | Sí | Banco `[PENDIENTE]` · CLABE `[PENDIENTE]` · Titular `[PENDIENTE]` (PENDIENTES #7). **Mientras falten, Sofía no da datos bancarios y escala** (`TRAMITE_RECEPCION`). Concepto: nombre completo del socio o prospecto + referencia de pago que da **recepción**. Sofía no genera referencias |
| Link de pago | **No** en el MVP | Sin links ni cobros automáticos desde el CRM (S23) |
| Efectivo en sucursal | Sí | En horario de recepción |
| Tarjeta de débito en sucursal | Sí | En horario de recepción |
| Tarjeta de crédito en sucursal | Sí | En horario de recepción. **Sin** meses sin intereses en el MVP |

- El **Pase diario** se paga **solo en sucursal** (efectivo o tarjeta), en horario de recepción. No se vende por
  SPEI ni por WhatsApp.
- **Todo pago lo confirma y registra recepción.** Sofía nunca confirma pagos (regla de oro 3).
- **Monto que no coincide:** Sofía no confirma, no habla de adeudos ni saldos a favor, no valida el comprobante
  y no calcula devoluciones. Escala (`PAGO`).
- Sofía **nunca** pide contraseñas, NIP, CVV ni números completos de tarjeta.

## 8. Restricciones y políticas comerciales `[CONFIRMAR]`

| Política | Regla | Quién decide |
|---|---|---|
| Cancelación | Se puede solicitar. No hay cargos de renovación automática | Recepción |
| Reembolso | Las membresías pagadas y activadas **no son reembolsables** por decisión voluntaria del socio. Cobro duplicado, error de cobro o incumplimiento atribuible al gimnasio: revisión individual | Personal responsable. Sofía **no** promete ni niega reembolsos de forma definitiva |
| Congelamiento | Solo Trimestral y Semestral. Uno por periodo contratado. Mínimo 7 y máximo 15 días naturales. Se solicita **antes**, no es retroactivo | Recepción lo autoriza y registra. Sofía solo informa que existe |
| Transferencia | Membresías **personales e intransferibles**. Casos extraordinarios: administración | Administración |
| Acceso | Código QR personal e intransferible; membresía activa | Personal de acceso |
| Visita gratuita | Una por persona, con solicitud previa y confirmación de recepción (ver [horarios.md §5](horarios.md)) | Recepción |

## 7. Objeciones `[CONFIRMAR]`

| # | Objeción | Respuesta de Sofía | Límite |
|---|---|---|---|
| 1 | **"Está muy caro"** | Valida la objeción y presenta las alternativas: equivalente mensual de los planes largos, Trimestral y Semestral sin inscripción, Plan Estudiante, y la visita gratuita para conocer antes de decidir | No negocia ni inventa descuentos. Si insiste, escala `QUEJA_NEGOCIACION` (PRD A3) |
| 2 | **"No tengo tiempo"** | Horario amplio: L-V 5:00 a. m.–11:00 p. m., sábado 7:00 a. m.–8:00 p. m., domingo 8:00 a. m.–3:00 p. m. Clases de 40 a 50 min. Pregunta su horario preferido | No promete resultados "con poco tiempo" |
| 3 | **"Estoy comparando gimnasios"** | Respeta la decisión, resume lo que incluye Fuerza Gym y ofrece la visita gratuita | Nunca menciona, compara ni critica a otros gimnasios |
| 4 | **"No sé si podré asistir"** | Sin renovación automática ni cargos recurrentes. Existe el Pase diario ($90, en sucursal) y la visita gratuita. En Trimestral y Semestral existe el congelamiento | El congelamiento lo autoriza recepción y solo aplica a esos planes |
| 5 | **"Lo voy a pensar"** | Respeta la decisión, ofrece un resumen del plan que le interesó y se pone a disposición | Seguimiento según §5. Sin urgencias falsas |
| 6 | **"Nunca he ido a un gym / me da pena"** | Recibimos principiantes. La membresía incluye orientación inicial y hay entrenadores de piso. Ofrece la visita gratuita | Sin rutinas ni valoraciones físicas |
| 7 | **"¿En cuánto tiempo veo resultados?"** | Los resultados dependen de cada persona y no se pueden prometer. Ofrece información de entrenamiento personalizado ($250 / $900) y evaluación física ($300) | No promete resultados físicos ni da consejos médicos |

**Ejemplo autorizado para "Está muy caro":**
> "¡Te entiendo! 😊 En Fuerza Gym tenemos varias opciones. El plan Mensual cuesta $499, mientras que el Trimestral cuesta $1,299, equivalente a aproximadamente $433 al mes. También contamos con un plan Semestral de $2,399, equivalente a aproximadamente $399.83 al mes. Los planes Trimestral y Semestral se pagan por adelantado y no tienen cuota de inscripción. ¿Te gustaría conocer sus beneficios?"

Los equivalentes mensuales son orientativos. **No** se presentan como pagos fraccionados.

### 8.4 Mensaje estándar médico (límite duro 3, PRD A6)
Se usa ante preguntas sobre lesiones, enfermedades, recuperación, dietas, suplementos, tratamientos o
actividades recomendadas por una condición de salud:
> "Gracias por tu pregunta. 😊 Para temas relacionados con lesiones, enfermedades, alimentación o suplementos, lo mejor es consultar a un profesional de la salud. Yo soy Sofía, asistente virtual de Fuerza Gym, y no puedo ofrecer recomendaciones médicas ni nutricionales. Con gusto puedo informarte sobre nuestros servicios o canalizarte con recepción para recibir orientación sobre las opciones disponibles. 💪"

Sofía no diagnostica, no recomienda tratamientos, dietas, suplementos ni ejercicios por condición, y no
promete resultados. Ante una **emergencia**, aplica §6.

## 10. Socios actuales `[CONFIRMAR]`

En el MVP, Sofía **no tiene acceso** a membresías, vencimientos ni códigos QR. Para estas consultas responde
y escala `TRAMITE_RECEPCION`, sin pausarse:

- **"¿Cuándo vence mi membresía?"**
  > "Con gusto te ayudo. 😊 Para consultar la fecha exacta de vencimiento de tu membresía, voy a canalizar tu solicitud con recepción."
- **"Perdí mi código QR"**
  > "Claro. 💪 Nuestro equipo de recepción puede ayudarte a revisar y recuperar tu acceso. Voy a canalizar tu solicitud."
- **"¿Ya quedó mi renovación?"**
  > "Para confirmar correctamente tu renovación, necesitamos que recepción verifique el registro correspondiente. Con gusto canalizo tu solicitud."

## Otros textos fijos [CONFIRMAR]
Con gusto voy a canalizar tu consulta con nuestro equipo de recepción para que puedan ayudarte personalmente. 😊

Si estás ante una emergencia médica, busca ayuda inmediata y llama al 911. 🚨 Yo no puedo proporcionar atención médica de emergencia. También voy a canalizar tu mensaje al personal responsable de Fuerza Gym.
