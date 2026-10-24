// Seed de datos de prueba de la Fase 4: 10 contactos ficticios, una conversación cada uno y 30 mensajes
// históricos. Escribe SOLO en MongoDB local y es idempotente: inserta con $setOnInsert y llaves
// deterministas, nunca borra ni sobrescribe. No importa el server, el outbox ni Socket.IO: estos mensajes
// no se envían a WhatsApp ni activan agentes. Los textos no mencionan importes ni horarios (datos
// [CONFIRMAR]) y Sofía nunca confirma pagos ni visitas: eso lo hace recepción.
import { pathToFileURL } from 'node:url';
import { config, redactUri } from '../server/src/config/env.js';
import { connectDb, dbName, disconnectDb } from '../server/src/db.js';
// Modelos importados uno por uno (no models/index.js) para no registrar AuditLog: el seed no toca auditlogs.
import { Contact } from '../server/src/models/Contact.js';
import { Conversation } from '../server/src/models/Conversation.js';
import { Message } from '../server/src/models/Message.js';

export const SEED_TAG = 'seed-fase4';
export const DEV_DB_NAME = 'fuerza-gym-crm';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

// Teléfonos E.164 con lada 000, que no existe en México: no pueden ser de una persona real.
const phone = (n) => `+52100000000${String(n).padStart(2, '0')}`;

const lead = (text) => ({ direction: 'ENTRANTE', author: { kind: 'LEAD' }, text });
const sofia = (text) => ({ direction: 'SALIENTE', author: { kind: 'AGENTE', ref: 'sofia' }, text });
const recepcion = (text) => ({ direction: 'SALIENTE', author: { kind: 'USUARIO', ref: 'recepcion' }, text });

export const SEED_CONTACTS = [
  {
    slug: 'carlos',
    name: 'Carlos (prueba)',
    stage: 'NUEVO',
    messages: [
      lead('Hola, buenas tardes'),
      sofia('¡Hola, Carlos! 👋 Soy Sofía, asistente virtual de Fuerza Gym. ¿En qué te puedo ayudar?'),
    ],
  },
  {
    slug: 'anuncio',
    name: 'Contacto desde anuncio (prueba)',
    stage: 'NUEVO',
    source: { type: 'ANUNCIO', referral: { source_type: 'ad', source_id: SEED_TAG } },
    messages: [
      lead('Hola, vi su anuncio y quiero más información'),
      sofia('¡Hola! 😊 Soy Sofía, asistente virtual de Fuerza Gym. Con gusto te ayudo. ¿Te interesa conocer nuestros planes o los servicios que incluye la membresía?'),
    ],
  },
  {
    slug: 'mariana',
    name: 'Mariana (prueba)',
    stage: 'EN_CONVERSACION',
    preferredSchedule: 'TARDE',
    messages: [
      lead('Hola, ¿qué planes tienen?'),
      sofia('¡Hola, Mariana! 😊 Tenemos los planes Mensual General, Trimestral, Semestral y Estudiante. Todos incluyen los mismos servicios de la membresía general. ¿Quieres que te cuente en qué se diferencian?'),
      lead('Sí, ¿cuál es la diferencia entre el Trimestral y el Semestral?'),
      sofia('La diferencia es la duración: el Trimestral dura 90 días y el Semestral 180. Los dos se pagan en una sola exhibición y no cobran inscripción. ¿Te gustaría conocer el gym con una visita gratuita antes de decidir?'),
    ],
  },
  {
    slug: 'jorge',
    name: 'Jorge (prueba)',
    stage: 'EN_CONVERSACION',
    messages: [
      lead('Buenas, soy estudiante. ¿Tienen algún plan para mí?'),
      sofia('¡Claro, Jorge! 💪 Tenemos el Plan Estudiante. Es un plan, no un descuento, y para contratarlo necesitas credencial escolar vigente y ser estudiante activo. Recepción revisa la credencial en persona al inscribirte.'),
      lead('Ok, deja lo checo y te aviso'),
    ],
  },
  {
    slug: 'daniela',
    name: 'Daniela (prueba)',
    stage: 'VISITA_AGENDADA',
    preferredSchedule: 'MANANA',
    messages: [
      lead('Hola, me gustaría conocer el gimnasio antes de inscribirme'),
      sofia('¡Con gusto, Daniela! 😊 Puedes hacer una visita gratuita. Registro tu solicitud y recepción te confirmará la fecha y la hora por este medio.'),
      recepcion('Hola, Daniela. Te escribe recepción de Fuerza Gym: tu visita quedó confirmada para el día y la hora que acordamos. ¡Te esperamos!'),
      lead('Perfecto, ahí nos vemos. ¡Gracias!'),
    ],
  },
  {
    slug: 'luis',
    name: 'Luis (prueba)',
    stage: 'VISITO',
    messages: [
      lead('Ya fui a conocer el gym y me gustó. ¿Cómo puedo pagar?'),
      sofia('¡Qué gusto que te haya gustado, Luis! 💪 Puedes pagar en recepción con efectivo o tarjeta, o por transferencia SPEI. Para los datos de transferencia te canalizo con recepción.'),
      lead('Va, gracias'),
    ],
  },
  {
    slug: 'fernanda',
    name: 'Fernanda (prueba)',
    stage: 'PAGO_EN_REVISION',
    messages: [
      lead('Ya hice la transferencia, te mando el comprobante'),
      sofia('¡Gracias, Fernanda! 😊 Recibí tu mensaje. Recepción revisará tu pago y te avisará en cuanto quede validado. Por ahora tu pago está en revisión.'),
      lead('Ok, quedo al pendiente'),
    ],
  },
  {
    slug: 'ricardo',
    name: 'Ricardo (prueba)',
    stage: 'SOCIO',
    messages: [
      lead('Buenas, ¿ya quedó mi pago?'),
      recepcion('Hola, Ricardo. Te escribe recepción de Fuerza Gym: confirmamos tu pago y tu membresía ya está activa.'),
      sofia('¡Ricardo, te damos la bienvenida a Fuerza Gym! 🎉💪 Tu orientación inicial está incluida: pídela a un entrenador de piso. ¡Nos vemos pronto!'),
    ],
  },
  {
    slug: 'paola',
    name: 'Paola (prueba)',
    stage: 'PERDIDO',
    status: 'CERRADA',
    messages: [
      lead('Hola, ¿qué incluye la membresía?'),
      sofia('¡Hola, Paola! 😊 La membresía general incluye pesas y máquinas, cardio, zona funcional, clases grupales con reservación previa, orientación inicial, vestidores y regaderas. ¿Te gustaría conocer el gym con una visita gratuita?'),
      lead('Gracias, pero ya me inscribí en otro gimnasio'),
      sofia('¡Gracias por avisarnos, Paola! Si más adelante necesitas información sobre Fuerza Gym, con gusto te ayudo.'),
    ],
  },
  {
    slug: 'hugo',
    name: 'Hugo (prueba)',
    stage: 'PERDIDO',
    status: 'CERRADA',
    messages: [
      lead('No me manden más mensajes, por favor'),
      sofia('Entendido, Hugo. Ya no te enviaremos mensajes de seguimiento. Si algún día nos escribes, con gusto te atenderemos.'),
    ],
  },
].map((contact, i) => ({ ...contact, phone: phone(i + 1) }));

// Fechas fijas para que cada ejecución genere lo mismo: un contacto por día desde el 2026-10-12 a las
// 10:00 de America/Mexico_City (16:00 UTC, sin horario de verano), con 5 minutos entre mensajes.
const messageDate = (contactIndex, messageIndex) =>
  new Date(Date.UTC(2026, 9, 12 + contactIndex, 16, 5 * messageIndex));

// Lanza un error si la cadena de conexión no apunta a la base local esperada.
export function assertSafeTarget(uri, expectedDbName, nodeEnv = process.env.NODE_ENV) {
  if (nodeEnv === 'production') throw new Error('El seed no se ejecuta con NODE_ENV=production.');
  const match = /^mongodb:\/\/(?:[^@/]+@)?([^/?]+)\/([^/?]*)/.exec(uri);
  if (!match) throw new Error('El seed solo acepta mongodb:// con nombre de base (no mongodb+srv:// ni servidores remotos).');
  const hosts = match[1].split(',').map((h) => h.replace(/^\[(.*)\](:\d+)?$/, '$1').replace(/:\d+$/, ''));
  if (!hosts.every((h) => LOCAL_HOSTS.has(h))) throw new Error(`El seed solo escribe en MongoDB local, no en ${hosts.join(', ')}.`);
  if (match[2] !== expectedDbName) throw new Error(`La base destino es "${match[2]}"; el seed solo escribe en "${expectedDbName}".`);
}

const isDuplicateKey = (err) => err?.code === 11000;

// Inserta el documento solo si no existe ninguno con `filter`. Devuelve true si lo insertó.
async function insertIfMissing(Model, filter, data) {
  const doc = new Model(data);
  await doc.validate();
  try {
    const res = await Model.updateOne(filter, { $setOnInsert: doc.toObject() }, { upsert: true, timestamps: false });
    return res.upsertedCount === 1;
  } catch (err) {
    // Otra ejecución simultánea lo insertó primero.
    if (isDuplicateKey(err)) return false;
    throw err;
  }
}

async function seedContact(spec, index, report) {
  const dates = spec.messages.map((_, i) => messageDate(index, i));
  const inboundDates = dates.filter((_, i) => spec.messages[i].direction === 'ENTRANTE');
  const createdAt = dates[0];

  const createdContact = await insertIfMissing(
    Contact,
    { phone: spec.phone },
    {
      name: spec.name,
      phone: spec.phone,
      stage: spec.stage,
      preferredSchedule: spec.preferredSchedule,
      source: spec.source ?? { type: 'ORGANICO' },
      tags: [SEED_TAG],
      lastInboundAt: inboundDates.at(-1),
      createdAt,
      updatedAt: createdAt,
    },
  );
  const contact = await Contact.findOne({ phone: spec.phone });
  // Mismo teléfono pero no es del seed: es información legítima y no se toca.
  if (!contact.tags.includes(SEED_TAG)) {
    report.conflicts.push({ phone: spec.phone, name: spec.name, existingId: String(contact._id) });
    return;
  }
  report.contacts[createdContact ? 'created' : 'existing'] += 1;

  const createdConversation = await insertIfMissing(
    Conversation,
    { contact: contact._id },
    { contact: contact._id, status: spec.status ?? 'ABIERTA', lastMessageAt: dates.at(-1), createdAt, updatedAt: createdAt },
  );
  report.conversations[createdConversation ? 'created' : 'existing'] += 1;
  const conversation = await Conversation.findOne({ contact: contact._id });

  for (const [i, message] of spec.messages.entries()) {
    // Llave determinista: externalId en los entrantes (como el wamid) e idempotencyKey en los salientes
    // (como el gate). El prefijo evita choques con las llaves reales.
    const key = `${SEED_TAG}:${spec.slug}:${i + 1}`;
    const keyField = message.direction === 'ENTRANTE' ? 'externalId' : 'idempotencyKey';
    const created = await insertIfMissing(
      Message,
      { [keyField]: key },
      {
        ...message,
        author: { ...message.author, ref: message.author.ref ?? spec.phone },
        conversation: conversation._id,
        contact: contact._id,
        type: 'TEXTO',
        [keyField]: key,
        deliveryStatus: message.direction === 'ENTRANTE' ? 'RECIBIDO' : 'ENTREGADO',
        createdAt: dates[i],
        updatedAt: dates[i],
      },
    );
    report.messages[created ? 'created' : 'existing'] += 1;
  }
}

// Aplica el seed sobre la conexión de Mongoose ya abierta, que debe ser la base `expectedDbName`.
export async function seed({ expectedDbName }) {
  if (dbName() !== expectedDbName) throw new Error(`Conectado a "${dbName()}"; se esperaba "${expectedDbName}".`);
  const counter = () => ({ created: 0, existing: 0 });
  const report = { contacts: counter(), conversations: counter(), messages: counter(), conflicts: [] };
  for (const [i, spec] of SEED_CONTACTS.entries()) await seedContact(spec, i, report);
  return report;
}

async function main() {
  assertSafeTarget(config.MONGODB_URI, DEV_DB_NAME, config.NODE_ENV);
  await connectDb(config.MONGODB_URI);
  try {
    console.log(`Seed ${SEED_TAG} en ${redactUri(config.MONGODB_URI)}`);
    const report = await seed({ expectedDbName: DEV_DB_NAME });
    for (const key of ['contacts', 'conversations', 'messages']) {
      console.log(`  ${key}: ${report[key].created} creados, ${report[key].existing} ya existían`);
    }
    for (const c of report.conflicts) {
      console.warn(`  OMITIDO ${c.name}: el teléfono ${c.phone} ya pertenece a un contacto ajeno al seed (${c.existingId})`);
    }
  } finally {
    await disconnectDb();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (err) {
    console.error(`Seed cancelado: ${err.message}`);
    process.exitCode = 1;
  }
}
