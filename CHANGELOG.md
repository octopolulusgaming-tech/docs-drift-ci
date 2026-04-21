# Changelog

## v0.1.0 - 2026-04-20

First public MVP release of Docs Drift CI.

### Why this release exists

Docs Drift CI exists to catch drift between runnable documentation and real code behavior.
It is aimed at teams whose README files and `/docs` contain shell commands, `curl` examples,
JSON payloads, and quickstarts that need to stay executable in CI.

### What v0.1.0 includes

- Markdown discovery for `README.md` and `docs/**/*.md`
- Parsing for executable `bash`, `sh`, `curl`, and `json` fences
- End-to-end verification pipeline with planning, execution, assertions, and reporting
- Shell assertions for exit code and stdout matching
- HTTP and JSON assertions for status, body contains, JSON equality, and required keys
- `docs-drift.config.json` for checked-in project configuration
- GitHub Action entrypoint with HTTP inputs and config precedence
- HTTP hardening defaults:
  - host allowlist
  - timeout
  - redirect limit
  - max body size
  - private-network blocking for literal IPs
- Starter examples, onboarding docs, and adoption template for external repos

### Recommended adoption path

- Start with one verified snippet in `README.md` or `docs/verified-examples.md`
- Commit `docs-drift.config.json`
- Use the GitHub Action for CI
- Expand coverage gradually after the first green run

### Known limitations in v0.1.0

- `runner-http` implements a controlled subset of `curl`
- private-network policy applies to IP literals only
- no DNS resolution is performed during HTTP policy checks
- redirect behavior is intentionally minimal rather than browser-like
- standalone package distribution is not the primary focus of this initial public release
