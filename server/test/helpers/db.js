import mongoose from 'mongoose';
import { config } from '../../src/config/env.js';
import { connectDb, disconnectDb, dbName } from '../../src/db.js';

export const TEST_DB_NAME = 'fuerza-gym-crm-test';

export async function connectTestDb() {
  await connectDb(config.MONGODB_URI);
  if (dbName() !== TEST_DB_NAME) {
    await disconnectDb();
    throw new Error(`Las pruebas solo pueden usar la base "${TEST_DB_NAME}", no "${dbName()}".`);
  }
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

// Vacía solo las colecciones de los modelos del proyecto en la base de pruebas.
export async function clearTestDb() {
  if (dbName() !== TEST_DB_NAME) throw new Error('clearTestDb solo opera sobre la base de pruebas');
  await Promise.all(Object.values(mongoose.models).map((model) => model.deleteMany({})));
}

export { disconnectDb as disconnectTestDb };
