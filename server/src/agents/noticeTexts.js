// Textos fijos del sistema copiados literalmente de docs/negocio/playbook-ventas.md (ADR-005 §4, ADR-006 §2).
// Siguen siendo `[CONFIRMAR]` (S44): son datos de simulación hasta que el negocio los valide.
// Módulo puro sin dependencias ni acceso al entorno: solo declara cadenas (orchestrator-rule.test.js).
// notice-texts.test.js exige que sean iguales al playbook; si el playbook cambia, la prueba falla.

// Playbook §2: aviso de canalización cuando la conversación pasa a una persona.
export const HANDOFF_NOTICE =
  'Con gusto voy a canalizar tu consulta con nuestro equipo de recepción para que puedan ayudarte personalmente. 😊';

// Playbook §6, EMERGENCIA, viñeta 2: aviso del 911, se envía antes de pausar.
export const EMERGENCY_NOTICE =
  'Si estás ante una emergencia médica, busca ayuda inmediata y llama al 911. 🚨 Yo no puedo proporcionar atención médica de emergencia. También voy a canalizar tu mensaje al personal responsable de Fuerza Gym.';

// Playbook §8.4: mensaje estándar médico (límite duro 3). Lo usa replyGuard G4; NO es un aviso del sistema.
export const MEDICAL_NOTICE =
  'Gracias por tu pregunta. 😊 Para temas relacionados con lesiones, enfermedades, alimentación o suplementos, lo mejor es consultar a un profesional de la salud. Yo soy Sofía, asistente virtual de Fuerza Gym, y no puedo ofrecer recomendaciones médicas ni nutricionales. Con gusto puedo informarte sobre nuestros servicios o canalizarte con recepción para recibir orientación sobre las opciones disponibles. 💪';
