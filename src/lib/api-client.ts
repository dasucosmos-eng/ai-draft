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

export async function apiCall(endpoint: string, body: any, token?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = token || getAuthToken();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  
  const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`API error ${res.status}: ${errText}`);
  }

  return res.json();
}

export async function apiGet(endpoint: string, token?: string): Promise<any> {
  const headers: Record<string, string> = {};
  const t = token || getAuthToken();
  if (t) headers['Authorization'] = `Bearer ${t}`;

  const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    throw new Error(`API error ${res.status}: ${errText}`);
  }

  return res.json();
}
