# Arquitectura v1

Pipeline principal:

1. discovery
2. parser
3. planner
4. runners (`runner-shell`, `runner-http`)
5. assertions
6. reporter

El contrato base vive en `packages/shared/src/index.ts`.
La sintaxis recomendada para expectativas usa metadata `docs-drift:*` en el fence.
`ExecutionContext` propaga opciones HTTP al `runner-http`, incluyendo allowlist, timeout, redirect limit, max body size y private-network policy.
`packages/config` resuelve `docs-drift.config.json` y aplica precedencia `CLI > config > defaults`.
La política HTTP se evalúa antes de cada `fetch` y cada redirect: allowlist de hosts, normalización de trailing dot y bloqueo opcional de IPs privadas literales sin DNS resolution.
`apps/github-action` no reimplementa la policy: solo traduce inputs/env vars a la misma forma de config que consume `verifyDocs`, con precedencia `Action > config > defaults`.
La referencia funcional y operativa de HTTP vive en [docs/reference/http-behavior.md](../reference/http-behavior.md).
La guía de adopción para repos externos vive en [docs/user-guide/adoption.md](../user-guide/adoption.md).
