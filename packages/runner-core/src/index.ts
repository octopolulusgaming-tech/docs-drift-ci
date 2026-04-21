import { evaluateAssertions, ExitCodeAssertion, StdoutContainsAssertion } from "@docs-drift/assertions-core";
import type { Assertion, DriftReport, ExecutionContext, PlannedExecution, Runner } from "@docs-drift/shared";

export interface VerifyPlanOptions {
  plan: PlannedExecution[];
  runners: Runner[];
  context: ExecutionContext;
  extraAssertions?: Assertion[];
}

export async function runExecutionPlan(options: VerifyPlanOptions): Promise<DriftReport> {
  const startedAt = new Date().toISOString();
  const baseAssertions: Assertion[] = [new ExitCodeAssertion(), new StdoutContainsAssertion()];
  const assertions = [...baseAssertions, ...(options.extraAssertions ?? [])];
  const results = [];

  for (const item of options.plan) {
    const runner = options.runners.find((candidate) => candidate.supports(item.block));
    if (!runner) {
      results.push({
        block: item.block,
        execution: {
          blockId: item.block.id,
          runnerName: "unavailable",
          ok: false,
          exitCode: 1,
          stdout: "",
          stderr: `No runner available for language '${item.block.language}'.`,
          durationMs: 0
        },
        assertions: [
          {
            assertion: "runner-available",
            ok: false,
            message: `No runner registered for '${item.block.language}'.`
          }
        ],
        ok: false
      });
      continue;
    }

    const execution = await runner.execute(item.block, options.context);
    const assertionResults = await evaluateAssertions(execution, item.expected, assertions);
    const ok = execution.ok && assertionResults.every((entry) => entry.ok);

    results.push({
      block: item.block,
      execution,
      assertions: assertionResults,
      ok
    });
  }

  const passed = results.filter((entry) => entry.ok).length;
  const failed = results.length - passed;

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    total: results.length,
    passed,
    failed,
    results
  };
}
