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
