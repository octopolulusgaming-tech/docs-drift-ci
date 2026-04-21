# Adoption Guide

This guide is for teams adding Docs Drift to a real repository for the first time.

## Recommended rollout

Start smaller than you think.

1. verify one shell snippet first
2. get CI green
3. add one HTTP example if you need it
4. expand from there

The goal of the first week is confidence, not coverage.

If you are running a pilot in a real repo, use:

- [docs/user-guide/pilot-adoption.md](pilot-adoption.md)

## Starter template

Use the starter files in:

- [templates/basic/README.md](../../templates/basic/README.md)

They are designed to be copied into a real repo with minimal edits.

## Suggested first adoption scope

Good first candidates:

- one `README.md` quickstart command
- one setup command in `docs/`
- one stable public HTTP example

Avoid as first targets:

- long multi-step shell flows with many environment assumptions
- private internal APIs that only work on a corporate network
- exotic `curl` flags outside the supported subset

## Config strategy

Put stable behavior in `docs-drift.config.json`.

Good config file candidates:

- `include`
- public API hosts in `http.allowHosts`
- timeout, redirects, and body limits your team agrees on

Use CI overrides only for environment differences, such as:

- a stricter allowlist in CI
- a lower or higher timeout in a slower environment
- forcing `http-block-private-networks=true` in CI even if local experiments disable it

Precedence is always:

1. CLI flags or GitHub Action inputs/env vars
2. `docs-drift.config.json`
3. defaults

## Teams with HTTP examples

If your docs contain `curl` blocks:

- keep `http.allowHosts` explicit
- prefer public or stable test endpoints
- keep `blockPrivateNetworks=true` in CI unless you have a deliberate reason not to
- only disable private-network blocking when your environment truly depends on loopback or literal internal IPs

Important limitation:

- Docs Drift does not perform DNS resolution to detect whether a hostname eventually points to a private address

See the operational behavior matrix here:

- [docs/reference/http-behavior.md](../reference/http-behavior.md)

## Recommended docs structure

One simple structure that works well:

```text
README.md
docs/
  verified-examples.md
docs-drift.config.json
.github/workflows/docs-drift.yml
```

Why this works:

- the README holds the most visible quickstart
- `docs/verified-examples.md` gives you a safe place to grow coverage
- config stays checked in and easy to review

## Avoiding first-week frustration

- start with `sandbox=local` for local evaluation
- keep the first shell snippet dependency-light
- only add HTTP once the team understands allowlist and private-network behavior
- treat the first few failures as feedback about the docs surface, not as a reason to disable the tool

## CI quickstart

Use the GitHub Action template:

- [templates/basic/.github/workflows/docs-drift.yml](../../templates/basic/.github/workflows/docs-drift.yml)

And the Action reference:

- [apps/github-action/README.md](../../apps/github-action/README.md)
- [docs/maintainers/v0.1.1-triage.md](../maintainers/v0.1.1-triage.md)

## Known limitations to keep in mind

- `runner-http` is a controlled subset of `curl`
- private-network policy applies to literal IPs only
- redirect handling is intentionally minimal
- generic long stderr may still be truncated outside operational HTTP failures
- the public MVP release is optimized for GitHub Action adoption and checked-in config, not a broad distribution story across package registries yet
