import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errors.js';
import { STAGES } from '../models/index.js';
import { getContactConversation, listContacts } from '../services/crm.js';

// Vista CRM mínima (solo lectura). Sin autenticación todavía: PENDIENTES #41.
export const crmRouter = Router();

const listQuerySchema = z.object({ stage: z.enum(STAGES).optional() });
const idParamsSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Id inválido') });

crmRouter.get('/contacts', async (req, res) => {
  const { stage } = listQuerySchema.parse(req.query);
  res.json({ stages: STAGES, contacts: await listContacts({ stage }) });
});

crmRouter.get('/contacts/:id', async (req, res) => {
  const { id } = idParamsSchema.parse(req.params);
  const data = await getContactConversation({ _id: id });
  if (!data) throw new HttpError(404, 'Contacto no encontrado');
  res.json(data);
});
