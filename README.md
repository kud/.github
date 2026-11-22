# .github

Shared GitHub Actions workflows for my repositories.

## Secrets scan

Scans the commits each push or pull request brings for credentials, with [betterleaks](https://betterleaks.com): its built-in rules plus [`betterleaks/sensitive.toml`](betterleaks/sensitive.toml), which catches credentials carried in URLs (`?token=…`, `user:pass@host`, public share links). A repository with its own `.betterleaks.toml` or `.gitleaks.toml` keeps it.

Add it to a repository's workflow:

```yaml
jobs:
  secrets:
    uses: kud/.github/.github/workflows/secrets-scan.yml@main
```

Findings are redacted in the log. A failed run means a secret reached a commit: rewrite the commits before merging, and rotate the secret if it was pushed anywhere public.

## Comms thread

A composite action that opens a thread in a [Todoist Comms](https://comms.todoist.com) channel, or closes one, as whoever owns the token: one thread per alert, closed once the problem is gone. It runs as a step in the calling job, with the runner's own Node.js and no dependencies.

```yaml
- id: alert
  uses: kud/.github/comms-thread@main
  with:
    token: ${{ secrets.COMMS_TOKEN }}
    channel-id: <channel id>
    title: "Production deploy failed"
    content: "Run ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"

# later, with the id kept from the alert:
- uses: kud/.github/comms-thread@main
  with:
    token: ${{ secrets.COMMS_TOKEN }}
    mode: close
    thread-id: ${{ steps.alert.outputs.thread-id }}
    content: "Green again."
```

| Input        | Meaning                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------- |
| `token`      | Comms API token of the posting account (a dedicated account posts under its own name)     |
| `mode`       | `open` (default) or `close`                                                                 |
| `channel-id` | channel to open the thread in                                                               |
| `thread-id`  | thread to close                                                                             |
| `title`      | thread title, on open                                                                       |
| `content`    | thread body, or the closing comment; Markdown                                               |
| `notify`     | `channel` (everyone in it) or `quiet`; defaults to `channel` on open, `quiet` on close     |
| `dry-run`    | `"true"` prints the request instead of sending it                                           |

Outputs: `thread-id`, and `url` on open. A thread is closed by a comment carrying `thread_action: "close"`, and every new post carries an id minted by the client (UUIDv7, base58), both as the official [`comms-sdk-typescript`](https://github.com/Doist/comms-sdk-typescript) does. Bad input stops before any request (exit 2); an API error exits 1 with its status.
