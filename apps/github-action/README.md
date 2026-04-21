# GitHub Action

`@docs-drift/github-action` runs the same verification pipeline as the CLI and is the recommended adoption path for external repositories in `v0.1.0`.

Release tags bundle the Action entrypoint so consumers do not need to build the Action itself before using `@v0.1.0`.

## What it is good for

- failing PRs when runnable docs drift
- enforcing HTTP hardening in CI
- keeping checked-in docs config while allowing CI-specific overrides

## Precedence

HTTP and runtime options resolve in this order:

1. GitHub Action inputs or dedicated env vars
2. `docs-drift.config.json`
3. built-in defaults

This means the repo can keep stable defaults in version control while CI only overrides what is genuinely environment-specific.

## Supported HTTP inputs

- `http-allow-hosts`
- `http-timeout-ms`
- `http-max-redirects`
- `http-max-body-bytes`
- `http-block-private-networks`

`http-allow-hosts` accepts comma-separated or newline-separated values.

## Minimal external usage

```yaml
- uses: your-org/docs-drift-ci/apps/github-action@v0.1.0
  with:
    sandbox: docker
```

Replace `your-org/docs-drift-ci` with the published repository path for Docs Drift.

## Recommended usage with HTTP defaults

```yaml
- uses: your-org/docs-drift-ci/apps/github-action@v0.1.0
  with:
    sandbox: docker
    http-timeout-ms: "5000"
    http-max-redirects: "3"
    http-max-body-bytes: "262144"
    http-block-private-networks: "true"
```

If your repository already defines `docs-drift.config.json`, keep most HTTP policy there and only override the few fields that differ in CI.

## Copy/paste template

- [templates/basic/.github/workflows/docs-drift.yml](../../templates/basic/.github/workflows/docs-drift.yml)

## HTTP reference and troubleshooting

- [docs/reference/http-behavior.md](../../docs/reference/http-behavior.md)

## Adoption guide

- [docs/user-guide/adoption.md](../../docs/user-guide/adoption.md)
