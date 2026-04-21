# Example: HTTP config file ⚙️

> 🌷 Small, readable HTTP hardening through `docs-drift.config.json`.

This example shows how to move HTTP hardening settings into `docs-drift.config.json`
instead of passing everything through CLI flags.

## What this example demonstrates ✨

- `allowHosts`
- `timeoutMs`
- `maxRedirects`
- `maxBodyBytes`
- `blockPrivateNetworks`

The config file allows loopback traffic to `127.0.0.1`, sets a request timeout, allows
up to two redirects, caps the response body size, and disables private-network blocking
for this local example so loopback literals can be used outside production CI defaults.

## Run locally 🏃

Start the mock server:

```text
node mock-server.mjs
```

In another terminal, verify the docs:

```text
npx pnpm docs-drift verify --root=examples/http-config --sandbox=local
```

No extra HTTP flags are required because the project config file provides them.

## Executable snippets 📎

Direct request:

```curl id=config-users docs-drift:expect-status=200 docs-drift:expect-body-contains=users docs-drift:expect-json-equals=config-users-expected docs-drift:expect-json-has-keys=users.0.id,users.0.name docs-drift:ignore-json-paths=meta.requestId
curl http://127.0.0.1:4020/users -H 'Accept: application/json'
```

Redirected request:

```curl id=config-users-redirect docs-drift:expect-status=200 docs-drift:expect-body-contains=users docs-drift:expect-json-equals=config-users-expected docs-drift:expect-json-has-keys=users.0.id,users.0.name docs-drift:ignore-json-paths=meta.requestId
curl http://127.0.0.1:4020/redirect/users -H 'Accept: application/json'
```

```json id=config-users-expected
{
  "meta": {
    "requestId": "ignore-me"
  },
  "users": [
    {
      "id": "u_1",
      "name": "Ada"
    }
  ]
}
```
