import { getFirebaseAuth } from '@/lib/firebase';

export function getApiBaseUrl(): string {
  return 'https://aidraft.bond/api';
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('aidraft_auth_token');
}

export function getCurrentUid(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('aidraft_current_uid');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('aidraft_auth_token', token);
}

export function setCurrentUid(uid: string): void {
  localStorage.setItem('aidraft_current_uid', uid);
}

export function clearAuth(): void {
  localStorage.removeItem('aidraft_auth_token');
  localStorage.removeItem('aidraft_current_uid');
}

/**
 * Get a fresh Firebase ID token. This automatically refreshes expired tokens
 * by calling user.getIdToken() on the current Firebase user.
 *
 * IMPORTANT: Always use this instead of getAuthToken() for API calls,
 * because getAuthToken() returns a static localStorage value that expires
 * after 1 hour and causes 401 errors.
 */
export async function getFirebaseIdToken(forceRefresh: boolean = false): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null;
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) return getAuthToken(); // fallback to localStorage
    const freshToken = await user.getIdToken(forceRefresh);
    // Keep localStorage in sync so getAuthToken() also returns fresh value
    setAuthToken(freshToken);
    return freshToken;
  } catch {
    return getAuthToken(); // fallback to localStorage
  }
}

export async function apiCall(endpoint: string, body: any, token?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // If an explicit token was passed, use it. Otherwise, get a fresh token.
  if (!token) {
    token = await getFirebaseIdToken() || undefined;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // If 401 and we used an explicit token, try once more with a fresh token
    if (res.status === 401 && token) {
      const freshToken = await getFirebaseIdToken(true);
      if (freshToken && freshToken !== token) {
        headers['Authorization'] = `Bearer ${freshToken}`;
        const retry = await fetch(`${getApiBaseUrl()}${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        if (retry.ok) return retry.json();
        const errText = await retry.text().catch(() => 'Unknown error');
        throw new Error(`API error ${retry.status}: ${errText}`);
      }
    }
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`API error ${res.status}: ${errText}`);
  }

  return res.json();
}

export async function apiGet(endpoint: string, token?: string): Promise<any> {
  const headers: Record<string, string> = {};

  if (!token) {
    token = await getFirebaseIdToken() || undefined;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    // If 401, retry once with a fresh token
    if (res.status === 401 && token) {
      const freshToken = await getFirebaseIdToken(true);
      if (freshToken && freshToken !== token) {
        headers['Authorization'] = `Bearer ${freshToken}`;
        const retry = await fetch(`${getApiBaseUrl()}${endpoint}`, {
          method: 'GET',
          headers,
        });
        if (retry.ok) return retry.json();
        const errText = await retry.text().catch(() => 'Unknown error');
        throw new Error(`API error ${retry.status}: ${errText}`);
      }
    }
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`API error ${res.status}: ${errText}`);
  }

  return res.json();
}
