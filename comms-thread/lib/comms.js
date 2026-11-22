import { isCommsId, newId } from "./id.js"

// The two calls a notifier needs, as @todoist/comms-sdk makes them: a thread is
// opened with threads/add, and closed by a comment carrying
// thread_action "close" (there is no threads/close route).

export const BASE = "https://comms.todoist.com/api/v1.0"

export class InputError extends Error {}

const need = (value, name) => {
  if (!value || !String(value).trim()) throw new InputError(`${name} is required`)
  return String(value)
}

const commsId = (value, name) => {
  need(value, name)
  if (!isCommsId(value)) throw new InputError(`${name} is not a Comms id: ${value}`)
  return value
}

// "channel" tags the post "Everyone in channel"; "quiet" notifies nobody.
// Left out, Comms would fall back to the channel's own defaults, which is
// exactly the surprise an alert should not depend on.
const audience = (notify) => {
  if (notify === "channel") return { groups: ["EVERYONE"] }
  if (notify === "quiet") return { recipients: [], groups: [] }
  throw new InputError(`notify must be "channel" or "quiet", not "${notify}"`)
}

export const buildRequest = (input, makeId = newId) => {
  const mode = input.mode || "open"
  const notify = input.notify || (mode === "open" ? "channel" : "quiet")

  if (mode === "open") {
    return {
      path: "threads/add",
      body: {
        id: makeId(),
        channel_id: commsId(input.channelId, "channel-id"),
        title: need(input.title, "title"),
        content: need(input.content, "content"),
        ...audience(notify),
      },
    }
  }
  if (mode === "close") {
    return {
      path: "comments/add",
      body: {
        id: makeId(),
        thread_id: commsId(input.threadId, "thread-id"),
        content: need(input.content, "content"),
        thread_action: "close",
        ...audience(notify),
      },
    }
  }
  throw new InputError(`mode must be "open" or "close", not "${mode}"`)
}

export const threadUrl = ({ workspace_id: ws, channel_id: ch, id }) =>
  ws && ch && id ? `https://comms.todoist.com/${ws}/ch/${ch}/t/${id}/` : ""

export const send = async ({ token, path, body }, fetchImpl = fetch) => {
  const response = await fetchImpl(`${BASE}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`Comms answered ${response.status} on ${path}: ${text.slice(0, 500)}`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Comms answered ${response.status} on ${path} with no JSON: ${text.slice(0, 200)}`)
  }
}
