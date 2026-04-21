# Getting Started

This is the canonical 5-minute path for understanding Docs Drift and seeing it work.

If you want the shortest path possible, stay in this document.

## What you will do

1. run a passing example
2. trigger a failure on purpose
3. fix it
4. wire the same idea into CI

## Step 1: install and run the passing example

From the repository root:

```bash
npx pnpm install
npx pnpm quickstart
```

That command verifies [examples/basic/README.md](../../examples/basic/README.md).

Expected outcome:

- the command exits successfully
- the report says `1/1 passed`

## Step 2: trigger a useful failure

Open [examples/basic/README.md](../../examples/basic/README.md) and change the expected JSON block:

```json
{"service":"docs-drift","status":"broken"}
```

Run the same command again:

```bash
npx pnpm quickstart
```

Now you should see a failed `json-equals` assertion.

## Step 3: fix it

Restore the expected block to:

```json
{"service":"docs-drift","status":"ok"}
```

Run:

```bash
npx pnpm quickstart
```

The report should go back to green.

## Step 4: adopt the same pattern in your repo

Use the starter template:

- [templates/basic/README.md](../../templates/basic/README.md)

The template gives you:

- a starter `docs-drift.config.json`
- a minimal verified docs file
- a GitHub Actions workflow

## Minimal snippet shape

Shell example:

````md
```bash id=health-check docs-drift:expect-exit=0 docs-drift:expect-stdout-contains=ok
printf 'ok\n'
```
````

HTTP example:

````md
```curl id=get-users docs-drift:expect-status=200 docs-drift:expect-json-equals=get-users-expected
curl https://api.example.com/users -H 'Accept: application/json'
```

```json id=get-users-expected
{"users":[{"id":"u_1","name":"Ada"}]}
```
````

## When to use config vs CI overrides

Put stable defaults in `docs-drift.config.json`:

- include globs
- HTTP allowlist for known public hosts
- timeout, redirect limit, and body limits that should apply everywhere

Use CLI or GitHub Action overrides only when CI genuinely needs something different.

Effective precedence:

1. CLI flags or Action inputs/env vars
2. `docs-drift.config.json`
3. defaults

## HTTP examples

If your docs contain `curl` examples, read the HTTP reference before scaling them out:

- [docs/reference/http-behavior.md](../reference/http-behavior.md)

That document covers:

- allowlist rules
- local vs CI behavior
- timeout, redirects, and body limits
- troubleshooting for blocked hosts, timeouts, and private-network failures

## Next step

Once the first snippet is green, move to:

- [docs/user-guide/adoption.md](adoption.md)
- [docs/user-guide/pilot-adoption.md](pilot-adoption.md)
