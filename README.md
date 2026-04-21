# Docs Drift CI ✨

Docs Drift CI verifies that executable examples in `README.md` and `docs/**/*.md`
still match the real behavior of your code.

> 🌿 Warm, practical docs verification for shell and HTTP snippets.

`v0.1.0` is the first public MVP release of the project.

## Why Docs Drift 💡

Docs Drift exists for a specific problem: documentation rots faster than code reviews catch it.

Common drift that this project is built to catch:

- shell examples that stop working
- `curl` commands that hit the wrong endpoint or payload shape
- JSON examples that no longer match the real API response
- quickstarts that silently diverge from the actual happy path

Docs Drift is **not** another markdown linter.
It is a verification tool for executable documentation.

Use it when:

- your repo has runnable snippets in `README.md` or `docs/**/*.md`
- you want CI to fail when docs stop matching reality
- you need useful failures for shell and HTTP examples

Do not expect it to be:

- a full `curl` replacement
- a web UI
- a plugin marketplace
- a general-purpose browser automation tool

## 5-Minute Quickstart 🚀

The fastest way to evaluate Docs Drift today is to run the checked-in example:

```bash
npx pnpm install
npx pnpm quickstart
```

That command verifies [examples/basic/README.md](examples/basic/README.md) and should pass immediately.

To see a useful failure:

1. Open [examples/basic/README.md](examples/basic/README.md).
2. Change the expected JSON block from `"status":"ok"` to `"status":"broken"`.
3. Run `npx pnpm quickstart` again.
4. Restore the expected JSON and rerun to confirm the fix.

Canonical onboarding guide:

- [docs/user-guide/getting-started.md](docs/user-guide/getting-started.md)

## Quickstart In Your Repo 🧭

For third-party adoption, the recommended `v0.1.0` path is:

1. Copy the starter files from [templates/basic/README.md](templates/basic/README.md).
2. Add one verified snippet to `README.md` or `docs/verified-examples.md`.
3. Commit a `docs-drift.config.json`.
4. Add the GitHub Action workflow template from [templates/basic/.github/workflows/docs-drift.yml](templates/basic/.github/workflows/docs-drift.yml).
5. Expand coverage gradually once the first snippet is green.

Practical adoption guide:

- [docs/user-guide/adoption.md](docs/user-guide/adoption.md)
- [docs/user-guide/pilot-adoption.md](docs/user-guide/pilot-adoption.md)

Public beta loop:

- pilot guide: [docs/user-guide/pilot-adoption.md](docs/user-guide/pilot-adoption.md)
- triage guide: [docs/maintainers/v0.1.1-triage.md](docs/maintainers/v0.1.1-triage.md)
- issue templates: [`.github/ISSUE_TEMPLATE`](.github/ISSUE_TEMPLATE)

## What v0.1.0 Includes 📦

- Markdown discovery for `README.md` and `docs/**/*.md`
- Parsing of fenced `bash`, `sh`, `json`, and `curl` blocks
- Execution pipeline for shell and HTTP snippets
- Shell assertions:
  - `exit-code`
  - `stdout-contains`
- HTTP and JSON assertions:
  - `http-status`
  - `body-contains`
  - `json-equals`
  - `json-has-keys`
- `docs-drift.config.json` for checked-in project config
- GitHub Action support
- HTTP hardening:
  - host allowlist
  - timeout
  - redirect limit
  - max body size
  - private-network policy for literal IPs

## Canonical Flows 🗺️

| Flow | Recommended path |
|---|---|
| Local evaluation | `npx pnpm quickstart` |
| Local HTTP evaluation | [examples/http-local/README.md](examples/http-local/README.md) |
| Config-driven HTTP example | [examples/http-config/README.md](examples/http-config/README.md) |
| Repo adoption | [templates/basic/README.md](templates/basic/README.md) |
| CI adoption | [apps/github-action/README.md](apps/github-action/README.md) |
| HTTP behavior and troubleshooting | [docs/reference/http-behavior.md](docs/reference/http-behavior.md) |

## Minimal Config ⚙️

`docs-drift.config.json` lives at the root of the repo being verified:

```json
{
  "include": ["README.md", "docs/**/*.md"],
  "http": {
    "allowHosts": ["api.example.com"],
    "timeoutMs": 5000,
    "maxRedirects": 3,
    "maxBodyBytes": 262144,
    "blockPrivateNetworks": true
  }
}
```

Configuration precedence is explicit:

1. CLI flags or GitHub Action inputs/env vars
2. `docs-drift.config.json`
3. built-in defaults

## GitHub Action Quickstart 🤖

Minimal CI shape for external repos:

```yaml
name: docs-drift

on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/docs-drift-ci/apps/github-action@v0.1.0
        with:
          sandbox: docker
```

For a fuller copy/paste template, use:

- [templates/basic/.github/workflows/docs-drift.yml](templates/basic/.github/workflows/docs-drift.yml)

The Action supports HTTP overrides when CI needs different limits or hosts than local development:

- `http-allow-hosts`
- `http-timeout-ms`
- `http-max-redirects`
- `http-max-body-bytes`
- `http-block-private-networks`

## Known Limitations 🧩

Visible limitations matter more than aspirational ones in `v0.1.0`:

- `runner-http` supports a controlled subset of `curl`, not the full CLI
- private-network blocking applies to literal IPs, not hostnames resolved through DNS
- no DNS resolution is performed as part of policy evaluation
- redirect handling is intentionally minimal
- generic long stderr may still be truncated in some reports, although operational HTTP errors are preserved
- the recommended public adoption path today is the GitHub Action plus checked-in config; standalone package distribution is not the focus of this release

## Read Next 📚

- [docs/user-guide/getting-started.md](docs/user-guide/getting-started.md)
- [docs/user-guide/adoption.md](docs/user-guide/adoption.md)
- [docs/user-guide/pilot-adoption.md](docs/user-guide/pilot-adoption.md)
- [docs/maintainers/v0.1.1-triage.md](docs/maintainers/v0.1.1-triage.md)
- [apps/github-action/README.md](apps/github-action/README.md)
- [docs/reference/http-behavior.md](docs/reference/http-behavior.md)
- [CHANGELOG.md](CHANGELOG.md)
