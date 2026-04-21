# HTTP Behavior Reference

This reference describes the current behavior of `runner-http` as implemented today.

## Compatibility Matrix

| Area | Current behavior | Source of config | Notes / limits |
|---|---|---|---|
| Executable blocks | Supports fenced `curl` blocks | Markdown parser + `runner-http` | This is not a full `curl` implementation |
| Supported request flags | `-X`, `--request`, `-H`, `--header`, `-d`, `--data`, `--data-raw`, `--data-binary`, `--json`, `--url`, `-I`, `--head`, `-G`, `--get` | Snippet content | Unsupported flags fail fast |
| Host allowlist | Exact host match and `*.subdomain` wildcard | CLI / config / Action | Matching uses `URL.hostname` only |
| Wildcard matching | `*.example.com` matches `api.example.com` but not `example.com` | Same | No URL-string heuristics |
| Host normalization | Case-insensitive and trailing-dot normalization | Runtime policy | `api.example.com.` is normalized to `api.example.com` |
| IPv6 normalization | Brackets removed before policy checks | Runtime policy | Example: `[::1]` becomes `::1` |
| Timeout | Per request hop via `AbortController` | CLI / config / Action / defaults | Default `5000ms` |
| Redirects | Manual redirect handling with bounded hop count | CLI / config / Action / defaults | Default `3`; redirect semantics are intentionally minimal |
| Response body size | Streams response body and enforces max bytes | CLI / config / Action / defaults | Default `262144` bytes |
| Private network policy | Blocks literal private / loopback / link-local IPs outside local by default | CLI / config / Action / defaults | Applies to IP literals only, not DNS-resolved hostnames |
| `sandbox=local` | Allows `localhost`, `127.0.0.1`, `::1` by default and disables private-network blocking by default | Runtime defaults | Keeps local examples usable |
| Non-local sandbox | Host allowlist enforced; private literal IP blocking enabled by default | Runtime defaults | Typical CI posture |
| Config precedence | CLI or Action input/env > `docs-drift.config.json` > defaults | `packages/config` + Action adapter | Action does not reimplement policy |
| Reporter behavior | Operational HTTP errors are preserved in full in markdown summary | Reporter | Errors starting with `HTTP ` are not truncated |

## Configuration Precedence

HTTP options resolve in this order:

1. CLI flags or GitHub Action inputs/env vars
2. `docs-drift.config.json`
3. built-in defaults

Effective defaults:

| Option | Default |
|---|---|
| `http.allowHosts` | `[]`, plus local loopback defaults when `sandbox=local` |
| `http.timeoutMs` | `5000` |
| `http.maxRedirects` | `3` |
| `http.maxBodyBytes` | `262144` |
| `http.blockPrivateNetworks` | `true` outside `sandbox=local`, `false` in `sandbox=local` |

Important interactions:

| Case | Result |
|---|---|
| `allowHosts` omitted | No remote hosts are implicitly allowed outside local |
| `sandbox=local` | `localhost`, `127.0.0.1`, `::1` are added automatically |
| `sandbox=local` allowlist merge | Local loopback defaults are additive with `docs-drift.config.json` and CLI allowHosts |
| Literal private/loopback IP is allowlisted but `blockPrivateNetworks=true` | Request is still blocked |
| `blockPrivateNetworks=false` | Literal private/loopback IPs can proceed if the host policy also allows them |
| GitHub Action input present and config file also sets same field | Action input wins |

## CLI / Config / Action Mapping

| Behavior | CLI | `docs-drift.config.json` | GitHub Action input |
|---|---|---|---|
| Allow hosts | `--http-allow-host=...` repeatable | `http.allowHosts` | `http-allow-hosts` |
| Timeout | `--http-timeout-ms=5000` | `http.timeoutMs` | `http-timeout-ms` |
| Redirect limit | `--http-max-redirects=3` | `http.maxRedirects` | `http-max-redirects` |
| Max body bytes | `--http-max-body-bytes=262144` | `http.maxBodyBytes` | `http-max-body-bytes` |
| Block private networks | `--http-block-private-networks=true|false` | `http.blockPrivateNetworks` | `http-block-private-networks` |

GitHub Action also supports dedicated env vars with the `DOCS_DRIFT_HTTP_*` prefix as fallback to inputs.

## Troubleshooting

| Error | Why it happens | What to do |
|---|---|---|
| `HTTP host blocked by policy.` | The request hostname is not in the effective allowlist | Add `--http-allow-host=...`, set `http.allowHosts` in `docs-drift.config.json`, or use the Action input `http-allow-hosts` |
| `HTTP private network blocked by policy.` | The URL uses a literal loopback/private/link-local IP and `blockPrivateNetworks=true` | For local/test environments, use `sandbox=local` or explicitly set `--http-block-private-networks=false`, `http.blockPrivateNetworks=false`, or the Action input |
| `HTTP request timed out.` | The response did not complete within `http.timeoutMs` | Increase `--http-timeout-ms`, `http.timeoutMs`, or Action `http-timeout-ms` |
| `HTTP redirect limit exceeded.` | The request followed more redirects than allowed | Raise `--http-max-redirects`, `http.maxRedirects`, or Action `http-max-redirects` |
| `HTTP response body too large.` | The response body exceeded `http.maxBodyBytes` | Raise `--http-max-body-bytes`, `http.maxBodyBytes`, or Action `http-max-body-bytes` |
| Works in `sandbox=local` but fails in CI | Local mode auto-allows loopback and disables private-network blocking by default | In CI, allow the target host explicitly and review whether literal IP access should stay blocked |

## Known Limitations

| Limitation | Current state |
|---|---|
| DNS resolution | Not performed |
| Private network detection for hostnames | Not supported; policy applies only to IP literals |
| Full `curl` compatibility | Not supported; `runner-http` implements a controlled subset |
| Redirect semantics | Minimal and intentional, not a full browser or curl clone |
| Unsupported `curl` features | No auth helpers, no `--form`, no broad flag coverage |
| Host policy scope | Evaluates `URL.hostname`, not arbitrary URL strings |
| Reporter truncation | Generic long stderr may still be truncated; HTTP operational errors are preserved |

## Practical References

- [README.md](../../README.md)
- [docs/user-guide/getting-started.md](../user-guide/getting-started.md)
- [docs/user-guide/adoption.md](../user-guide/adoption.md)
- [docs/user-guide/pilot-adoption.md](../user-guide/pilot-adoption.md)
- [docs/maintainers/v0.1.1-triage.md](../maintainers/v0.1.1-triage.md)
- [apps/github-action/README.md](../../apps/github-action/README.md)
- [templates/basic/README.md](../../templates/basic/README.md)
- [examples/http-local/README.md](../../examples/http-local/README.md)
- [examples/http-config/README.md](../../examples/http-config/README.md)
