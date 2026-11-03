// Error único de la capa LLM (ADR-004). `code` dice qué falló y `retryable` si tiene sentido
// reintentar; la política de reintentos es de quien llama.
// Ningún mensaje debe incluir `system`, `messages` ni texto del lead.

export const LLM_ERROR_CODES = ['INPUT', 'CONFIG', 'TIMEOUT', 'PROCESS', 'PROVIDER', 'INVALID_OUTPUT'];

export class LlmError extends Error {
  constructor(code, message, { retryable = false, status, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'LlmError';
    this.code = code;
    this.retryable = retryable;
    if (status !== undefined) this.status = status;
  }
}

// Reintentable si el estado es 429, 529, >= 500 o no hay estado; 401, 403 y demás 4xx no.
export function isRetryableStatus(status) {
  if (typeof status !== 'number') return true;
  return status === 429 || status === 529 || status >= 500;
}

// Recorta texto del proveedor (result o stderr) para los mensajes de error.
export function clip(text, max = 300) {
  return String(text ?? '').trim().slice(0, max);
}
