# Passing Fixture ✅

> 🌱 A tiny passing shell example for regression coverage.

```bash id=health-check expectExit=0 expectStdout=status expectJson=health-expected
printf '{"status":"ok","service":"fixture"}'
```

```json id=health-expected
{"service":"fixture","status":"ok"}
```
