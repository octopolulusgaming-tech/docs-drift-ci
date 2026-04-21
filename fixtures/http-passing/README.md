# HTTP Passing Fixture ✅

> 🌿 A small HTTP success case with stable assertions.

```curl id=http-users docs-drift:expect-status=200 docs-drift:expect-body-contains=users docs-drift:expect-json-equals=http-users-expected docs-drift:expect-json-has-keys=users.0.id,users.0.name docs-drift:ignore-json-paths=meta.requestId
curl http://127.0.0.1:4510/users -H 'Accept: application/json'
```

```json id=http-users-expected
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
