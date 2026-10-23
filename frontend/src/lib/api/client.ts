import { TokenRefreshResponse } from '@/types';

// ==========================================
// Cookie Helpers (Safe for SSR and Client)
// ==========================================

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + encodeURIComponent(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function setCookie(
  name: string,
  value: string,
  options: {
    days?: number;
    path?: string;
    sameSite?: 'lax' | 'strict' | 'none';
    secure?: boolean;
  } = {}
): void {
  if (typeof document === 'undefined') return;
  const { days = 7, path = '/', sameSite = 'lax', secure = false } = options;

  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  }

  const isSecure =
    secure || (typeof window !== 'undefined' && window.location.protocol === 'https:');
  const secureFlag = isSecure ? '; Secure' : '';

  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}${expires}; path=${path}; SameSite=${sameSite}${secureFlag}`;
}

export function removeCookie(name: string, options: { path?: string } = {}): void {
  if (typeof document === 'undefined') return;
  const { path = '/' } = options;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
}

export function getAccessToken(): string | undefined {
  return getCookie(ACCESS_TOKEN_COOKIE);
}

export function getRefreshToken(): string | undefined {
  return getCookie(REFRESH_TOKEN_COOKIE);
}

export function setTokens(accessToken: string, refreshToken?: string): void {
  setCookie(ACCESS_TOKEN_COOKIE, accessToken, { days: 7, path: '/' });
  if (refreshToken) {
    setCookie(REFRESH_TOKEN_COOKIE, refreshToken, { days: 30, path: '/' });
  }
}

export function clearTokens(): void {
  removeCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
  removeCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
}

// ==========================================
// Custom API Error
// ==========================================

export class ApiClientError extends Error {
  public status: number;
  public code: string;
  public details?: unknown;

  constructor(status: number, message: string, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ==========================================
// API Client Class
// ==========================================

export class ApiClient {
  private baseUrl: string;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(baseUrl?: string) {
    const rawUrl =
      baseUrl ||
      (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined) ||
      'http://localhost:8000/api/v1';
    this.baseUrl = rawUrl.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * Merges concurrent calls into a single in-flight promise.
   */
  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return null;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          clearTokens();
          return null;
        }

        const data: TokenRefreshResponse = await response.json();
        if (data.access_token) {
          setTokens(data.access_token);
          return data.access_token;
        }

        clearTokens();
        return null;
      } catch {
        clearTokens();
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Core request method with 401 retry and typed error parsing.
   */
  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<T> {
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${normalizedEndpoint}`;

    const headers = new Headers(options.headers || {});

    // Set Authorization header from cookie if not explicitly provided
    if (!headers.has('Authorization')) {
      const token = getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    // Default to JSON Content-Type when sending body unless FormData
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    let response: Response;
    try {
      response = await fetch(url, config);
    } catch (networkError: unknown) {
      const msg = networkError instanceof Error ? networkError.message : 'Network error';
      throw new ApiClientError(0, msg, 'NETWORK_ERROR');
    }

    // Handle 401 Unauthorized with token refresh and single retry
    const isAuthRoute =
      normalizedEndpoint.includes('/auth/login') ||
      normalizedEndpoint.includes('/auth/register') ||
      normalizedEndpoint.includes('/auth/refresh');

    if (response.status === 401 && !isRetry && !isAuthRoute) {
      const newAccessToken = await this.refreshAccessToken();
      if (newAccessToken) {
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        return this.request<T>(endpoint, { ...options, headers }, true);
      }
    }

    // Handle non-2xx responses
    if (!response.ok) {
      let errorBody: { error?: { code?: string; message?: string }; message?: string; code?: string } | null = null;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        try {
          errorBody = await response.json();
        } catch {
          // If JSON parse fails, fallback to default text
        }
      }

      const message =
        errorBody?.error?.message ||
        errorBody?.message ||
        response.statusText ||
        `Request failed with status ${response.status}`;

      const code =
        errorBody?.error?.code ||
        errorBody?.code ||
        `HTTP_${response.status}`;

      throw new ApiClientError(response.status, message, code, errorBody);
    }

    // Handle empty 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    // Return parsed JSON
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  }

  // Convenience HTTP Methods
  public async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    });
  }

  public async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    });
  }

  public async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    });
  }

  public async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const api = new ApiClient();
