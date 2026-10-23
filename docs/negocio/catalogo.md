# Catálogo — Fuerza Gym

> **Negocio ficticio.** Fuerza Gym es un gimnasio simulado para fines académicos. Ningún dato de este
> documento corresponde a un establecimiento real.
>
> **Marcas:**
> - `[CONFIRMAR]`: dato dado en la entrevista (2026-10-23) que **requiere validación de negocio** antes de
>   que los agentes lo usen como información confirmada.
> - `[PENDIENTE]`: dato que no existe o no está definido. El agente **no lo menciona** y escala.
>
> Documentos relacionados: [horarios.md](horarios.md) · [faq.md](faq.md) · [playbook-ventas.md](playbook-ventas.md) ·
> [PRD](../PRD.md) · [SUPUESTOS](../SUPUESTOS.md) · [PENDIENTES](../PENDIENTES.md)

## 1. Información general

| Campo | Valor |
|---|---|
| Nombre comercial | Fuerza Gym `[CONFIRMAR]` |
| Nombre alternativo | Fuerza Gym Aguascalientes `[CONFIRMAR]` |
| Eslogan | "Tu fuerza, tu mejor versión" `[CONFIRMAR]` |
| Sucursales | 1 (PRD, S1) `[CONFIRMAR]` |
| Ciudad | Aguascalientes, Aguascalientes, México `[CONFIRMAR]` |
| Zona | Zona norte de Aguascalientes, Aguascalientes, México (única referencia que se comunica) `[CONFIRMAR]` |
| Dirección exacta | `[PENDIENTE]` (PENDIENTES #4). No se inventa calle ni número |
| Google Maps | `[PENDIENTE]` (PENDIENTES #4). No se envían enlaces |
| Estacionamiento | Gratuito para clientes, sujeto a disponibilidad `[CONFIRMAR]` |
| WiFi | Gratuito para socios; la contraseña se da en recepción `[CONFIRMAR]` |
| Climatización | Las áreas principales cuentan con ventilación y climatización `[CONFIRMAR]` |
| Cámaras de seguridad | En accesos y áreas comunes. Nunca en vestidores, regaderas ni sanitarios `[CONFIRMAR]` |

**Descripción** `[CONFIRMAR]`: Fuerza Gym es un gimnasio en la ciudad de Aguascalientes enfocado en ofrecer
un espacio moderno, accesible y motivador para mejorar la condición física, desarrollar fuerza y fomentar
hábitos saludables. Cuenta con instalaciones para entrenamiento de fuerza, acondicionamiento cardiovascular y
clases grupales, con atención para personas que comienzan a entrenar y para usuarios experimentados.

### 1.1 Público objetivo `[CONFIRMAR]`

- Jóvenes y adultos que quieren mejorar su condición física.
- Principiantes que buscan iniciar una rutina.
- Usuarios intermedios y avanzados de fuerza o musculación.
- Estudiantes universitarios.
- Profesionistas que necesitan horarios flexibles.
- Adultos mayores que desean mantenerse activos. El agente puede decir que las instalaciones están abiertas
  para ellos, pero **no** determina qué actividad le conviene a una persona (límite duro 3).

Espacio incluyente para hombres y mujeres de cualquier nivel de experiencia `[CONFIRMAR]`.

### 1.2 Diferenciadores `[CONFIRMAR]`

Se usan solo como **descripción general**, nunca como comparación con otros gimnasios (ver
[playbook-ventas.md §7](playbook-ventas.md)).

- **Atención personalizada:** orientación inicial para conocer los equipos.
- **Precios accesibles:** varias opciones de membresía.
- **Instalaciones modernas:** fuerza, cardio y funcional en un mismo lugar.
- **Ambiente amigable:** respetuoso y motivador, en especial para quien va por primera vez.
- **Horarios amplios:** mañana, tarde y noche (ver [horarios.md](horarios.md)).
- **Variedad de actividades:** la membresía general incluye áreas y clases grupales.
- **Atención por WhatsApp:** Sofía, asistente virtual, informa de planes, horarios y servicios *(funcionalidad
  prevista; aún no implementada, PENDIENTES #40)*.
- **Atención humana cuando hace falta:** pagos, casos particulares y dudas fuera de conocimiento.

## 2. Servicios

### 2.1 Incluidos en la membresía general `[CONFIRMAR]`

Aplican a los planes Mensual General, Trimestral, Semestral y Estudiante.

| Servicio | Condiciones |
|---|---|
| Pesas libres y máquinas de musculación | — |
| Cardio (caminadoras, bicicletas, elípticas) | Límite de 30 min continuos cuando hay lista de espera |
| Zona de entrenamiento funcional | — |
| Clases grupales: spinning, funcional, HIIT y acondicionamiento general | Cupo limitado y **reservación previa** con confirmación de recepción (ver [horarios.md §3](horarios.md)) |
| Orientación inicial de entrenamiento | **Una sola vez** al contratar. Recorrido, reglas de seguridad y uso general de los equipos, con un entrenador de piso en su horario. **No** es una evaluación física ni un plan personalizado |
| Entrenadores de piso | Orientación básica en su horario (ver [horarios.md §4](horarios.md)). No se confirma la disponibilidad de un entrenador específico |
| Vestidores y regaderas con agua caliente | Sujeto a disponibilidad operativa |
| Lockers temporales | Sin costo, solo durante la visita. El usuario lleva su propio candado. Se desocupan al terminar; no se dejan pertenencias de noche. **No** hay renta de lockers fijos en el MVP |
| Bebederos de agua potable | — |
| WiFi | Contraseña en recepción |

### 2.2 Servicios con costo adicional `[CONFIRMAR]`

Se cobran aparte de la membresía. Precios en MXN con IVA incluido. Horarios y disponibilidad los coordina
**recepción**.

| Servicio | Precio | Condiciones |
|---|---:|---|
| Entrenamiento personalizado | $250 | Sesión individual de 60 min |
| Paquete de entrenamiento personalizado | $900 | 4 sesiones individuales de 60 min |
| Asesoría nutricional | $450 | Consulta con profesional especializado, previa cita |
| Evaluación física personalizada | $300 | Sesión individual con personal especializado, mediante cita. Puede incluir revisión de objetivos, mediciones y una propuesta de entrenamiento |
| Talleres o programas especiales | `[PENDIENTE]` | Precio y programación por definir. El agente escala |
| Venta de bebidas y accesorios deportivos | `[PENDIENTE]` | Sin lista de precios. El agente escala |

**Límite:** Sofía solo informa que estos servicios existen, su precio y que se contratan en recepción. No
evalúa, no da dietas y no recomienda rutinas (límite duro 3).

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

## 5. Vigencia y renovación `[CONFIRMAR]`

- **Inicio:** el día en que **recepción confirma el pago y activa** la membresía, aunque la transferencia se
  haya hecho antes. Ejemplo: transferencia el lunes, confirmación el martes → la vigencia empieza el martes.
- **Cálculo:** días naturales, en `America/Mexico_City`. La vigencia empieza a las 00:00 del día de activación
  y termina antes de las 00:00 del día siguiente al último día contratado.
  Ejemplo: plan de 30 días activado el 1 de noviembre → último día de acceso el 30 de noviembre; el 1 de
  diciembre ya está vencida.
- **Renovación anticipada:** el nuevo periodo se agrega **al final** de la vigencia actual; el socio no pierde
  días. Ejemplo: vence el 30 de noviembre, renueva el 25 → el nuevo periodo va del 1 al 30 de diciembre.
- **Renovación tras vencer:** el nuevo periodo empieza cuando recepción confirma el pago.
- **Corrección de la fecha de activación:** solo recepción o administración, como corrección administrativa
  justificada, registrando quién, cuándo y por qué. No se permite alterar fechas para extender una membresía.
  *No implementado (PENDIENTES #46).*
- **Sin renovación automática** ni cargos recurrentes. Una membresía vencida queda inactiva hasta un nuevo pago.
- **Recordatorio:** uno solo, 5 días naturales antes del vencimiento, solo a socios con membresía activa
  (regla futura; ver PRD B6).
- Sofía informa la duración, pero **no** activa membresías ni modifica fechas.

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

## 9. Límites del agente sobre este catálogo

Sofía **puede**: informar precios y características de los planes documentados, explicar duraciones, comparar
los planes internos, calcular el pago inicial y el equivalente mensual con este catálogo, explicar los
requisitos del Plan Estudiante y las reglas de renovación, registrar interés en una visita e informar que
existen servicios adicionales.

Sofía **no puede**: confirmar pagos, activar membresías, autorizar descuentos, prometer promociones no
documentadas, confirmar citas o reservaciones, validar credenciales, modificar precios, inventar políticas ni
dar recomendaciones médicas, nutricionales o de rutina.

**Mientras un dato tenga `[CONFIRMAR]`, es información de simulación**, no validada para atender clientes reales.
