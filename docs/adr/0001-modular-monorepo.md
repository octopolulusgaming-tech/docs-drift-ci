# ADR-0001: Arquitectura modular en monorepo pnpm

- Fecha: 2026-04-20
- Estado: Aprobado

## Contexto

Docs Drift CI necesita evolucionar rápido sin romper contratos entre parseo,
ejecución, assertions y reportes.

## Decisión

Adoptar monorepo con `pnpm workspaces` y módulos separados por responsabilidad:

- `config`
- `discovery`
- `parser`
- `planner`
- `runner-core`
- `runner-shell`
- `assertions-core`
- `assertions-json`
- `reporter-core`
- `reporter-markdown`
- `shared`

Apps:

- `apps/cli`
- `apps/github-action`

## Consecuencias

### Positivas

- Contratos explícitos y reusables.
- Contribución paralela sin conflicto conceptual.
- Camino claro para soportar más runners/assertions/reporters.

### Negativas

- Más paquetes implica más wiring inicial.
- Requiere disciplina para evitar circular dependencies.

## Alternativas consideradas

1. Paquete único:
   - más simple al inicio, pero mezcla responsabilidades.
2. Microservicios:
   - sobreingeniería para v1.
