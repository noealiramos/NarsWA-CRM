import { Contact, Conversation, Message } from '../models/index.js';
import { serializeContact, serializeConversation, serializeMessage } from './serializers.js';

// Contactos con su conversación, último mensaje y número de mensajes (vista CRM).
export async function listContacts({ stage } = {}) {
  const contacts = await Contact.find(stage ? { stage } : {}).sort({ updatedAt: -1 }).limit(200);
  const ids = contacts.map((c) => c._id);

  const [conversations, stats] = await Promise.all([
    Conversation.find({ contact: { $in: ids } }),
    Message.aggregate([
      { $match: { contact: { $in: ids } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$contact', count: { $sum: 1 }, last: { $first: '$$ROOT' } } },
    ]),
  ]);
  const conversationByContact = new Map(conversations.map((c) => [String(c.contact), c]));
  const statsByContact = new Map(stats.map((s) => [String(s._id), s]));

  return contacts.map((contact) => {
    const conversation = conversationByContact.get(String(contact._id));
    const stat = statsByContact.get(String(contact._id));
    return {
      ...serializeContact(contact),
      conversation: conversation ? serializeConversation(conversation) : null,
      messageCount: stat?.count ?? 0,
      lastMessage: stat ? serializeMessage(stat.last) : null,
    };
  });
}

export async function getContactConversation(filter) {
  const contact = await Contact.findOne(filter);
  if (!contact) return null;
  const conversation = await Conversation.findOne({ contact: contact._id });
  const messages = conversation ? await Message.find({ conversation: conversation._id }).sort({ createdAt: 1, _id: 1 }) : [];
  return {
    contact: serializeContact(contact),
    conversation: conversation ? serializeConversation(conversation) : null,
    messages: messages.map(serializeMessage),
  };
}
