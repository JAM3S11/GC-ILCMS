export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  let payload: { error?: string };
  try {
    payload = await response.json() as { error?: string };
  } catch {
    throw new ApiError('The server returned an invalid response.', response.status);
  }
  if (!response.ok) {
    throw new ApiError(payload.error || 'The request could not be completed.', response.status);
  }
  return payload as T;
}
