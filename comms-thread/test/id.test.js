import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { decodeBase58, encodeBase58, isCommsId, newId, uuidv7Bytes } from "../lib/id.js"

// Well-formed ids (UUIDv7, base58), minted for these tests: Comms issues
// ids of exactly this shape, and the SDK validates them the same way.
const VALID = ["CVNcLS9CiaJeCEVCRWi6D", "CVNcLWRAtheEKgPC9avpa"]

describe("ids", () => {
  it("accepts well-formed ids", () => {
    for (const id of VALID) assert.equal(isCommsId(id), true, id)
  })

  it("mints ids that pass the same check", () => {
    for (let i = 0; i < 200; i++) assert.equal(isCommsId(newId()), true)
  })

  it("rejects what is not a base58 UUIDv7", () => {
    for (const bad of ["", "0OIl", "CVNcLS9CiaJeCEVCRWi6DXX", "123", undefined, 42]) {
      assert.equal(isCommsId(bad), false, String(bad))
    }
    // A valid base58 UUID with the wrong version nibble (v4).
    const v4 = uuidv7Bytes(0, new Uint8Array(10))
    v4[6] = (v4[6] & 0x0f) | 0x40
    assert.equal(isCommsId(encodeBase58(v4)), false)
  })

  it("round-trips through base58, leading zero bytes included", () => {
    const bytes = uuidv7Bytes(0, new Uint8Array(10).fill(0xab))
    assert.equal(bytes[0], 0)
    assert.deepEqual(decodeBase58(encodeBase58(bytes)), bytes)
  })

  it("puts the timestamp first, so ids sort by time", () => {
    const early = uuidv7Bytes(1_700_000_000_000)
    const late = uuidv7Bytes(1_800_000_000_000)
    assert.ok(Buffer.compare(Buffer.from(early.slice(0, 6)), Buffer.from(late.slice(0, 6))) < 0)
  })
})
