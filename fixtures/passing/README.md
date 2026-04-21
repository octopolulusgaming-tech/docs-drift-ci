# Passing Fixture

```bash id=health-check expectExit=0 expectStdout=status expectJson=health-expected
printf '{"status":"ok","service":"fixture"}'
```

```json id=health-expected
{"service":"fixture","status":"ok"}
```
