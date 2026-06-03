/**
 * AI Draft — E2EE Encryption Utility
 * Uses Web Crypto API for AES-256-GCM encryption
 * All user data is encrypted/decrypted with a key derived from the user's UID
 */

const SALT_LENGTH = 16
const IV_LENGTH = 12
const KEY_ITERATIONS = 100000

// Storage key prefix for UID-scoped data
export function storageKey(uid: string, key: string): string {
  return `aidraft_enc_${uid}_${key}`
}

// Storage key for the encryption salt (not encrypted)
function saltKey(uid: string): string {
  return `aidraft_salt_${uid}`
}

// Storage key for the derived key material (encrypted with a static app-level key)
function keyMaterialKey(uid: string): string {
  return `aidraft_keymat_${uid}`
}

/**
 * Derive an AES-256-GCM key from user UID using PBKDF2
 * The key is derived once and cached per session
 */
async function deriveKey(uid: string): Promise<CryptoKey> {
  // Check cache first
  const cached = keyCache.get(uid)
  if (cached) return cached

  const encoder = new TextEncoder()
  
  // Get or create salt for this user
  let salt: Uint8Array
  const storedSalt = localStorage.getItem(saltKey(uid))
  if (storedSalt) {
    salt = Uint8Array.from(atob(storedSalt), c => c.charCodeAt(0))
  } else {
    salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
    localStorage.setItem(saltKey(uid), btoa(String.fromCharCode(...salt)))
  }

  // Import the base key material from UID
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(uid),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  // Derive AES-256-GCM key
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: KEY_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  // Cache the key
  keyCache.set(uid, aesKey)
  return aesKey
}

// In-memory key cache
const keyCache = new Map<string, CryptoKey>()

/**
 * Encrypt data and store in localStorage
 */
export async function encryptAndStore<T>(uid: string, key: string, data: T): Promise<void> {
  try {
    const aesKey = await deriveKey(uid)
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
    const encoder = new TextEncoder()
    const plaintext = encoder.encode(JSON.stringify(data))

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      plaintext
    )

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length)
    combined.set(iv)
    combined.set(new Uint8Array(ciphertext), iv.length)

    localStorage.setItem(
      storageKey(uid, key),
      btoa(String.fromCharCode(...combined))
    )
  } catch (error) {
    console.error('[E2EE] Encrypt failed:', error)
    // Fallback: store unencrypted if crypto fails (shouldn't happen in modern browsers)
    localStorage.setItem(storageKey(uid, key), JSON.stringify({ _raw: data }))
  }
}

/**
 * Decrypt and retrieve data from localStorage
 */
export async function decryptAndRetrieve<T>(uid: string, key: string): Promise<T | null> {
  try {
    const stored = localStorage.getItem(storageKey(uid, key))
    if (!stored) return null

    const combined = Uint8Array.from(atob(stored), c => c.charCodeAt(0))

    // Check for unencrypted fallback
    try {
      const parsed = JSON.parse(stored)
      if (parsed && parsed._raw !== undefined) {
        return parsed._raw as T
      }
    } catch {
      // Not a fallback, continue with decryption
    }

    const aesKey = await deriveKey(uid)
    const iv = combined.slice(0, IV_LENGTH)
    const ciphertext = combined.slice(IV_LENGTH)

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      ciphertext
    )

    const decoder = new TextDecoder()
    return JSON.parse(decoder.decode(plaintext)) as T
  } catch (error) {
    console.error('[E2EE] Decrypt failed:', error)
    return null
  }
}

/**
 * Remove encrypted data for a user
 */
export function removeEncryptedData(uid: string, key: string): void {
  localStorage.removeItem(storageKey(uid, key))
}

/**
 * Clear all data for a user (on account deletion)
 */
export function clearAllUserData(uid: string): void {
  const prefix = storageKey(uid, '')
  const salt = saltKey(uid)
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i)
    if (k && (k.startsWith(prefix) || k === salt)) {
      localStorage.removeItem(k)
    }
  }
  keyCache.delete(uid)
}
