import mongoose from 'mongoose';

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

export async function connectDb(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

export function dbStatus() {
  return STATES[mongoose.connection.readyState] ?? 'unknown';
}

export function dbName() {
  return mongoose.connection.name;
}
