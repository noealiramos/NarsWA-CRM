import { Server } from 'socket.io';

// Socket.IO para el CRM y el simulador. Sin servidor adjunto (por ejemplo, en pruebas),
// emit() no hace nada.
let io = null;

export function attachRealtime(httpServer, { clientOrigin }) {
  io = new Server(httpServer, { cors: { origin: clientOrigin } });
  return io;
}

export function emit(event, payload) {
  io?.emit(event, payload);
}
