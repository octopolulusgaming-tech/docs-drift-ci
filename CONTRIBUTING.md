# Contributing

## Requisitos

- Node.js 22 (mínimo recomendado para producción)
- pnpm workspaces
- Docker (opcional en local, requerido para sandbox estricto)

## Flujo recomendado

1. Crear rama de trabajo.
2. Ejecutar `npx pnpm install`.
3. Desarrollar por módulo (`packages/*`) y exponer wiring en `apps/cli`.
4. Ejecutar tests y typecheck antes de abrir PR.

## Principios de código

- Modularidad por responsabilidad técnica.
- Contratos explícitos en `@docs-drift/shared`.
- Evitar sobreingeniería y abstracciones prematuras.
- Mantener comportamiento observable y fácil de depurar.

## Pull Requests

Incluye en el PR:

- problema que resuelve;
- cambios en comportamiento;
- riesgo principal;
- evidencia (tests / output de `docs-drift verify`).

## Beta y piloto

Si estás reportando fricción de adopción o feedback de piloto, usa los templates de GitHub Issues:

- [bug runtime report](.github/ISSUE_TEMPLATE/bug_runtime_report.md)
- [onboarding DX friction](.github/ISSUE_TEMPLATE/onboarding_dx_friction.md)
- [pilot summary](.github/ISSUE_TEMPLATE/pilot_summary.md)

Antes de abrir un issue, revisa:

- [docs/user-guide/pilot-adoption.md](docs/user-guide/pilot-adoption.md)
- [docs/reference/http-behavior.md](docs/reference/http-behavior.md)
- [docs/maintainers/v0.1.1-triage.md](docs/maintainers/v0.1.1-triage.md)
