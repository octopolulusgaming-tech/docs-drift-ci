# Verified Examples

Start with one shell snippet that should always pass.

```bash id=docs-drift-health docs-drift:expect-exit=0 docs-drift:expect-stdout-contains=ok
printf 'ok\n'
```

Optional HTTP example once your team is ready:

````md
```curl id=get-users docs-drift:expect-status=200 docs-drift:expect-json-equals=get-users-expected
curl https://api.example.com/users -H 'Accept: application/json'
```

```json id=get-users-expected
{"users":[{"id":"u_1","name":"Ada"}]}
```
````
