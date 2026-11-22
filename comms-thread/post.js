import { appendFileSync } from "node:fs"
import { buildRequest, InputError, send, threadUrl } from "./lib/comms.js"

// Entry point of the composite action. Inputs arrive as COMMS_* variables
// (action.yml maps them); outputs go to $GITHUB_OUTPUT.
// `node post.js --dry-run` prints the request body instead of sending it.

const env = process.env
const dryRun = process.argv.includes("--dry-run")

const output = (name, value) => {
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `${name}=${value}\n`)
}

const main = async () => {
  const request = buildRequest({
    mode: env.COMMS_MODE,
    channelId: env.COMMS_CHANNEL_ID,
    threadId: env.COMMS_THREAD_ID,
    title: env.COMMS_TITLE,
    content: env.COMMS_CONTENT,
    notify: env.COMMS_NOTIFY,
  })

  if (dryRun) {
    console.log(JSON.stringify(request, null, 2))
    return
  }

  const token = env.COMMS_TOKEN
  if (!token) throw new InputError("token is required")

  const result = await send({ token, ...request })

  if (request.path === "threads/add") {
    const url = threadUrl(result)
    output("thread-id", result.id ?? "")
    output("url", url)
    console.log(`Opened thread ${result.id ?? "(no id returned)"} ${url}`)
  } else {
    output("thread-id", request.body.thread_id)
    console.log(`Closed thread ${request.body.thread_id}`)
  }
}

main().catch((error) => {
  console.log(`::error::${error.message}`)
  process.exit(error instanceof InputError ? 2 : 1)
})
