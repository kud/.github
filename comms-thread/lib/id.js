import { randomBytes } from "node:crypto"

// Comms wants the client to mint every new post's id: a UUIDv7, sent as
// base58. The encoding follows @todoist/comms-sdk's src/utils/uuidv7.ts, so
// no dependency is needed for these few lines.

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

export const encodeBase58 = (bytes) => {
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++
  let n = 0n
  for (const b of bytes) n = (n << 8n) | BigInt(b)
  let out = ""
  while (n > 0n) {
    out = ALPHABET[Number(n % 58n)] + out
    n /= 58n
  }
  return "1".repeat(zeros) + out
}

export const decodeBase58 = (value) => {
  if (typeof value !== "string" || value.length === 0 || value.length > 22) return null
  let zeros = 0
  while (zeros < value.length && value[zeros] === "1") zeros++
  let n = 0n
  for (const ch of value) {
    const digit = ALPHABET.indexOf(ch)
    if (digit < 0) return null
    n = n * 58n + BigInt(digit)
  }
  const raw = []
  while (n > 0n) {
    raw.unshift(Number(n & 0xffn))
    n >>= 8n
  }
  const bytes = Uint8Array.from([...Array(zeros).fill(0), ...raw])
  return bytes.length === 16 ? bytes : null
}

// 48 bits of Unix milliseconds, then random bits with the version (7) and
// RFC 9562 variant set.
export const uuidv7Bytes = (now = Date.now(), random = randomBytes(10)) => {
  const bytes = new Uint8Array(16)
  let ms = BigInt(now)
  for (let i = 5; i >= 0; i--) {
    bytes[i] = Number(ms & 0xffn)
    ms >>= 8n
  }
  bytes.set(random, 6)
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return bytes
}

export const newId = () => encodeBase58(uuidv7Bytes())

// The same check the SDK runs before a request leaves it.
export const isCommsId = (value) => {
  const bytes = decodeBase58(value)
  return bytes !== null && (bytes[6] & 0xf0) === 0x70 && (bytes[8] & 0xc0) === 0x80
}
