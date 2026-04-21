# Cómo agregar una nueva assertion

1. Crear clase que implemente `Assertion`.
2. Exportarla desde su paquete.
3. Inyectarla en `apps/cli/src/index.ts` usando `extraAssertions`.
4. Agregar tests unitarios.
