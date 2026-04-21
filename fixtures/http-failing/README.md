# HTTP Failing Fixture

```curl id=http-users-fail docs-drift:expect-status=200 docs-drift:expect-body-contains=missing docs-drift:expect-json-equals=http-users-fail-expected
curl http://127.0.0.1:4510/users -H 'Accept: application/json'
```

```json id=http-users-fail-expected
{
  "users": [
    {
      "id": "u_999",
      "name": "Grace"
    }
  ]
}
```
