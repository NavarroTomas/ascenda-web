const encoder = new TextEncoder()
const decoder = new TextDecoder()

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function deriveKey(pin, salt, usages) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 180000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    usages,
  )
}

export async function encryptNote(content, pin) {
  if (!pin || pin.length < 4) throw new Error('El PIN debe tener al menos 4 caracteres.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(pin, salt, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(content || ''))
  return { encrypted_content: bytesToBase64(encrypted), encryption_iv: bytesToBase64(iv), encryption_salt: bytesToBase64(salt) }
}

export async function decryptNote(note, pin) {
  try {
    const salt = base64ToBytes(note.encryption_salt)
    const iv = base64ToBytes(note.encryption_iv)
    const encrypted = base64ToBytes(note.encrypted_content)
    const key = await deriveKey(pin, salt, ['decrypt'])
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
    return decoder.decode(plain)
  } catch {
    throw new Error('PIN incorrecto o nota dañada.')
  }
}
