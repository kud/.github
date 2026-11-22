import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { BASE, buildRequest, InputError, send, threadUrl } from "../lib/comms.js"

const CHANNEL = "CVNcLS9CiaJeCEVCRWi6D"
const THREAD = "CVNcLWRAtheEKgPC9avpa"
const fixedId = () => "NEW-ID"

describe("buildRequest", () => {
  it("opens a thread that notifies the channel by default", () => {
    const request = buildRequest({ channelId: CHANNEL, title: "Deploy failed", content: "Build 12" }, fixedId)
    assert.deepEqual(request, {
      path: "threads/add",
      body: { id: "NEW-ID", channel_id: CHANNEL, title: "Deploy failed", content: "Build 12", groups: ["EVERYONE"] },
    })
  })

  it("closes with a comment carrying thread_action, quietly by default", () => {
    const request = buildRequest({ mode: "close", threadId: THREAD, content: "Fixed in 13" }, fixedId)
    assert.deepEqual(request, {
      path: "comments/add",
      body: { id: "NEW-ID", thread_id: THREAD, content: "Fixed in 13", thread_action: "close", recipients: [], groups: [] },
    })
  })

  it("lets the caller choose the audience", () => {
    const open = buildRequest({ channelId: CHANNEL, title: "t", content: "c", notify: "quiet" }, fixedId)
    assert.deepEqual(open.body.groups, [])
    const close = buildRequest({ mode: "close", threadId: THREAD, content: "c", notify: "channel" }, fixedId)
    assert.deepEqual(close.body.groups, ["EVERYONE"])
  })

  it("refuses missing or malformed input before any request", () => {
    const cases = [
      { title: "t", content: "c" },
      { channelId: "ops-alerts", title: "t", content: "c" },
      { channelId: CHANNEL, content: "c" },
      { channelId: CHANNEL, title: "t", content: "  " },
      { mode: "close", content: "c" },
      { mode: "reopen", threadId: THREAD, content: "c" },
      { channelId: CHANNEL, title: "t", content: "c", notify: "everyone" },
    ]
    for (const input of cases) assert.throws(() => buildRequest(input, fixedId), InputError, JSON.stringify(input))
  })

  it("mints a fresh id for every request", () => {
    const a = buildRequest({ channelId: CHANNEL, title: "t", content: "c" })
    const b = buildRequest({ channelId: CHANNEL, title: "t", content: "c" })
    assert.notEqual(a.body.id, b.body.id)
  })
})

describe("send", () => {
  const fakeFetch = (status, body, seen) => async (url, init) => {
    seen.push({ url, init })
    return { ok: status < 300, status, text: async () => body }
  }

  it("posts JSON with the bearer token and returns the parsed answer", async () => {
    const seen = []
    const result = await send(
      { token: "tok", path: "threads/add", body: { a: 1 } },
      fakeFetch(200, '{"id":"x"}', seen),
    )
    assert.deepEqual(result, { id: "x" })
    assert.equal(seen[0].url, `${BASE}/threads/add`)
    assert.equal(seen[0].init.headers.Authorization, "Bearer tok")
    assert.equal(seen[0].init.body, '{"a":1}')
  })

  it("fails loudly on an error status, without echoing the token", async () => {
    const seen = []
    await assert.rejects(
      send({ token: "secret-tok", path: "threads/add", body: {} }, fakeFetch(403, "forbidden", seen)),
      (error) => /403/.test(error.message) && !error.message.includes("secret-tok"),
    )
  })

  it("fails on a success status with no JSON", async () => {
    await assert.rejects(send({ token: "t", path: "p", body: {} }, fakeFetch(200, "<html>", [])), /no JSON/)
  })
})

describe("threadUrl", () => {
  it("builds the web link from the returned thread", () => {
    assert.equal(
      threadUrl({ id: THREAD, workspace_id: 123456, channel_id: CHANNEL }),
      `https://comms.todoist.com/123456/ch/${CHANNEL}/t/${THREAD}/`,
    )
    assert.equal(threadUrl({ id: THREAD }), "")
  })
})
