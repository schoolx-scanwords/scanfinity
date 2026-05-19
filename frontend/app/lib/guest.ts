'use client';

export const GUEST_TOKEN_PREFIX = 'guest:';

export interface StoredGuestUser {
  username: string;
  isAnonymous: true;
  guestId: string;
  avatar?: string;
  email?: string;
}

export function isGuestToken(token: string | null | undefined): boolean {
  if (!token) return false;
  return token === 'anonymous' || token.startsWith(GUEST_TOKEN_PREFIX);
}

function randomId(): string {
  // Prefer cryptographically strong IDs when available.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function createGuestToken(guestId: string): string {
  // Embed guestId for easier debugging, but keep uniqueness via random suffix.
  return `${GUEST_TOKEN_PREFIX}${guestId}:${randomId()}`;
}

export function readStoredGuestUser(): StoredGuestUser | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('auth_token');
  const rawUser = localStorage.getItem('auth_user');
  if (!rawUser) return null;

  try {
    const parsed = JSON.parse(rawUser) as Partial<StoredGuestUser> & { isAnonymous?: unknown };
    const isAnon = parsed?.isAnonymous === true;
    if (!isAnon) return null;

    // Back-compat: historically token was exactly 'anonymous'.
    if (token && !isGuestToken(token)) {
      return null;
    }

    const username = typeof parsed.username === 'string' ? parsed.username : '';
    if (!username) return null;

    const guestId =
      typeof parsed.guestId === 'string' && parsed.guestId.trim() !== ''
        ? parsed.guestId
        : username;

    // Migrate legacy guest sessions that used a shared token.
    if (token === 'anonymous') {
      localStorage.setItem('auth_token', createGuestToken(guestId));
    }

    return {
      username,
      isAnonymous: true,
      guestId,
      avatar: typeof parsed.avatar === 'string' ? parsed.avatar : undefined,
      email: typeof (parsed as any).email === 'string' ? (parsed as any).email : undefined,
    };
  } catch {
    return null;
  }
}

export function getGuestDisplayName(): string | null {
  return readStoredGuestUser()?.username ?? null;
}
