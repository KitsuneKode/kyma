import { ConvexError } from 'convex/values'

import { runtimeEnv } from '../../lib/env/runtime'

const IV_LENGTH = 12

function getEncryptionKeyBytes() {
  const key = runtimeEnv.KYMA_ENCRYPTION_KEY?.trim()
  if (!key) {
    throw new ConvexError(
      'KYMA_ENCRYPTION_KEY is required for BYOK encryption operations.'
    )
  }
  if (!/^[a-f0-9]{64}$/i.test(key)) {
    throw new ConvexError(
      'KYMA_ENCRYPTION_KEY must be a 64-char hex string (openssl rand -hex 32).'
    )
  }
  const bytes = new Uint8Array(32)
  for (let index = 0; index < 32; index += 1) {
    bytes[index] = Number.parseInt(key.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(value: string) {
  const decoded = atob(value)
  const bytes = new Uint8Array(decoded.length)
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index)
  }
  return bytes
}

async function getCryptoKey() {
  return await crypto.subtle.importKey(
    'raw',
    getEncryptionKeyBytes(),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptProviderKey(plaintext: string) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const cryptoKey = await getCryptoKey()
  const encodedPlaintext = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    cryptoKey,
    encodedPlaintext
  )
  return {
    encryptedKey: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  }
}

export async function decryptProviderKey(args: {
  encryptedKey: string
  iv: string
}) {
  const cryptoKey = await getCryptoKey()
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(args.iv),
    },
    cryptoKey,
    base64ToBytes(args.encryptedKey)
  )
  return new TextDecoder().decode(decrypted)
}
