import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SEED_CONTACTS, SEED_TAG, assertSafeTarget, seed } from '../../scripts/seed.js';
import { Contact, Conversation, Message } from '../src/models/index.js';
import { TEST_DB_NAME, clearTestDb, connectTestDb, disconnectTestDb } from './helpers/db.js';
import { E164 } from '../src/models/Contact.js';

async function seedCounts() {
  const contacts = await Contact.find({ tags: SEED_TAG });
  const ids = contacts.map((c) => c._id);
  return {
    contacts: contacts.length,
    conversations: await Conversation.countDocuments({ contact: { $in: ids } }),
    messages: await Message.countDocuments({ contact: { $in: ids } }),
  };
}

// Contacto ajeno al seed, con conversación y mensaje, como si viniera del simulador.
async function createForeignContact(phone) {
  const contact = await Contact.create({ name: 'Prueba Checkpoint', phone, stage: 'NUEVO' });
  const conversation = await Conversation.create({ contact: contact._id });
  await Message.create({
    conversation: conversation._id,
    contact: contact._id,
    direction: 'ENTRANTE',
    author: { kind: 'LEAD', ref: phone },
    text: 'Hola',
    externalId: 'sim-ajeno-1',
    deliveryStatus: 'RECIBIDO',
  });
  return contact;
}

const snapshot = async (contactId) => ({
  contact: (await Contact.findById(contactId)).toObject(),
  conversations: (await Conversation.find({ contact: contactId })).map((c) => c.toObject()),
  messages: (await Message.find({ contact: contactId })).map((m) => m.toObject()),
});

describe('seed de la Fase 4', () => {
  beforeAll(connectTestDb);
  beforeEach(clearTestDb);
  afterAll(disconnectTestDb);

  it('define 10 contactos con 30 mensajes, teléfonos E.164 únicos y autores válidos', () => {
    expect(SEED_CONTACTS).toHaveLength(10);
    expect(SEED_CONTACTS.flatMap((c) => c.messages)).toHaveLength(30);
    expect(new Set(SEED_CONTACTS.map((c) => c.phone)).size).toBe(10);
    for (const c of SEED_CONTACTS) expect(c.phone).toMatch(E164);
    const authors = new Set(SEED_CONTACTS.flatMap((c) => c.messages.map((m) => `${m.author.kind}:${m.author.ref ?? ''}`)));
    expect([...authors].sort()).toEqual(['AGENTE:sofia', 'LEAD:', 'USUARIO:recepcion']);
  });

  it('es idempotente y no toca los registros ajenos al seed', async () => {
    const foreign = await createForeignContact('+5214490009999');
    const before = await snapshot(foreign._id);

    const first = await seed({ expectedDbName: TEST_DB_NAME });
    expect(first.contacts).toEqual({ created: 10, existing: 0 });
    expect(first.conversations).toEqual({ created: 10, existing: 0 });
    expect(first.messages).toEqual({ created: 30, existing: 0 });
    expect(await seedCounts()).toEqual({ contacts: 10, conversations: 10, messages: 30 });

    const second = await seed({ expectedDbName: TEST_DB_NAME });
    expect(second.contacts).toEqual({ created: 0, existing: 10 });
    expect(second.conversations).toEqual({ created: 0, existing: 10 });
    expect(second.messages).toEqual({ created: 0, existing: 30 });
    expect(second.conflicts).toEqual([]);
    expect(await seedCounts()).toEqual({ contacts: 10, conversations: 10, messages: 30 });

    expect(await Contact.countDocuments()).toBe(11);
    expect(await Conversation.countDocuments()).toBe(11);
    expect(await Message.countDocuments()).toBe(31);
    expect(await snapshot(foreign._id)).toEqual(before);
  });

  it('no sobrescribe un contacto del seed editado a mano', async () => {
    await seed({ expectedDbName: TEST_DB_NAME });
    await Contact.updateOne({ phone: SEED_CONTACTS[0].phone }, { stage: 'EN_CONVERSACION', name: 'Carlos editado' });
    await seed({ expectedDbName: TEST_DB_NAME });
    expect(await Contact.findOne({ phone: SEED_CONTACTS[0].phone })).toMatchObject({ stage: 'EN_CONVERSACION', name: 'Carlos editado' });
  });

  it('omite y reporta un teléfono que ya pertenece a un contacto ajeno', async () => {
    const foreign = await createForeignContact(SEED_CONTACTS[0].phone);
    const before = await snapshot(foreign._id);

    const report = await seed({ expectedDbName: TEST_DB_NAME });
    expect(report.conflicts).toEqual([{ phone: SEED_CONTACTS[0].phone, name: SEED_CONTACTS[0].name, existingId: String(foreign._id) }]);
    expect(await seedCounts()).toEqual({ contacts: 9, conversations: 9, messages: 28 });
    expect(await snapshot(foreign._id)).toEqual(before);
  });

  it('guarda etapas, estados y orden de los mensajes', async () => {
    await seed({ expectedDbName: TEST_DB_NAME });
    const hugo = await Contact.findOne({ phone: SEED_CONTACTS[9].phone });
    expect(hugo.stage).toBe('PERDIDO');
    expect((await Conversation.findOne({ contact: hugo._id })).status).toBe('CERRADA');
    const ricardo = await Contact.findOne({ phone: SEED_CONTACTS[7].phone });
    const messages = await Message.find({ contact: ricardo._id }).sort({ createdAt: 1 });
    expect(messages.map((m) => m.author.kind)).toEqual(['LEAD', 'USUARIO', 'AGENTE']);
    expect(ricardo.lastInboundAt).toEqual(messages[0].createdAt);
  });

  it('se niega a usar otra base que la esperada', async () => {
    await expect(seed({ expectedDbName: 'fuerza-gym-crm' })).rejects.toThrow(/se esperaba/);
    expect(await Contact.countDocuments()).toBe(0);
  });
});

describe('assertSafeTarget', () => {
  const local = 'mongodb://localhost:27017/fuerza-gym-crm';

  it('acepta MongoDB local con la base esperada', () => {
    expect(() => assertSafeTarget(local, 'fuerza-gym-crm', 'development')).not.toThrow();
    expect(() => assertSafeTarget('mongodb://127.0.0.1/fuerza-gym-crm?directConnection=true', 'fuerza-gym-crm', 'development')).not.toThrow();
  });

  it('rechaza producción, servidores remotos, SRV y otra base', () => {
    expect(() => assertSafeTarget(local, 'fuerza-gym-crm', 'production')).toThrow(/production/);
    expect(() => assertSafeTarget('mongodb+srv://u:p@cluster.mongodb.net/fuerza-gym-crm', 'fuerza-gym-crm', 'development')).toThrow();
    expect(() => assertSafeTarget('mongodb://db.example.com:27017/fuerza-gym-crm', 'fuerza-gym-crm', 'development')).toThrow(/local/);
    expect(() => assertSafeTarget('mongodb://localhost,10.0.0.5/fuerza-gym-crm', 'fuerza-gym-crm', 'development')).toThrow(/local/);
    expect(() => assertSafeTarget('mongodb://localhost:27017/fuerza-gym-crm-test', 'fuerza-gym-crm', 'development')).toThrow(/base destino/);
    expect(() => assertSafeTarget('mongodb://localhost:27017', 'fuerza-gym-crm', 'development')).toThrow();
  });
});
