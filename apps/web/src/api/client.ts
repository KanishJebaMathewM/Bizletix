export class ApiError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(message: string, code = 'API_ERROR', status = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const API_BASE = '/api';

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Include session cookie
  });

  if (res.status === 204) {
    return {} as T;
  }

  // Handle file downloads
  const contentType = res.headers.get('content-type');
  if (contentType && (contentType.includes('text/csv') || contentType.includes('application/octet-stream') || contentType.includes('application/json') && options.headers && (options.headers as any)['Accept'] === 'application/octet-stream')) {
    const text = await res.text();
    return text as unknown as T;
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(`Request failed with status ${res.status}`, 'HTTP_ERROR', res.status);
  }

  if (!res.ok || (data && data.success === false)) {
    const message = data?.error?.message || data?.message || `Request failed with status ${res.status}`;
    const code = data?.error?.code || 'UNKNOWN_ERROR';
    const details = data?.error?.details;
    throw new ApiError(message, code, res.status, details);
  }

  return (data?.data !== undefined ? data.data : data) as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => request<T>(endpoint, { method: 'GET', ...options }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      ...options,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: 'DELETE', ...options }),
};
