# Example: local HTTP verification 🌐

> 🫶 A local-first HTTP example that stays friendly to run and easy to read.

Run `node mock-server.mjs` in this directory and then verify the docs:

```curl id=example-users docs-drift:expect-status=200 docs-drift:expect-body-contains=users docs-drift:expect-json-equals=example-users-expected docs-drift:expect-json-has-keys=users.0.id,users.0.name docs-drift:ignore-json-paths=meta.requestId
curl http://127.0.0.1:4010/users -H 'Accept: application/json'
```

```json id=example-users-expected
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
