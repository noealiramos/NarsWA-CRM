import { createServer } from 'node:http';
import { createApp } from './app.js';
import { config, redactUri } from './config/env.js';
import { connectDb, disconnectDb } from './db.js';
import { attachRealtime } from './realtime/index.js';

async function start() {
  try {
    await connectDb(config.MONGODB_URI);
    console.log(`[server] MongoDB conectado: ${redactUri(config.MONGODB_URI)}`);
  } catch (err) {
    console.error(`[server] No se pudo conectar a MongoDB en ${redactUri(config.MONGODB_URI)}: ${err.message}`);
    console.error('[server] Verifica que el servicio de MongoDB esté en ejecución.');
    process.exit(1);
  }

  const httpServer = createServer(createApp());
  attachRealtime(httpServer, { clientOrigin: config.CLIENT_ORIGIN });

  httpServer.on('error', (err) => {
    console.error(`[server] No se pudo abrir el puerto ${config.PORT}: ${err.message}`);
    process.exit(1);
  });
  httpServer.listen(config.PORT, () => {
    console.log(`[server] Escuchando en http://localhost:${config.PORT} (canal: ${config.WA_PROVIDER})`);
  });

  const shutdown = async (signal) => {
    console.log(`[server] ${signal} recibido, cerrando...`);
    httpServer.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
