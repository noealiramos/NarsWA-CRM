export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Cliente HTTP de la API. Convierte fallas de red y respuestas de error en ApiError
// con un mensaje en español listo para mostrarse.
export async function apiRequest(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Verifica que esté en ejecución.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const fallback = res.status >= 500 ? 'Error del servidor. Intenta de nuevo.' : `Error ${res.status}`;
    throw new ApiError(res.status, data?.error ?? fallback, data?.details);
  }
  return data;
}
