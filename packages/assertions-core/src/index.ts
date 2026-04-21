import type { Assertion, AssertionResult, ExpectedOutcome, ExecutionResult } from "@docs-drift/shared";

export class ExitCodeAssertion implements Assertion {
  name = "exit-code";

  async evaluate(result: ExecutionResult, expected: ExpectedOutcome): Promise<AssertionResult> {
    const expectedCode = expected.expectedExitCode;
    if (typeof expectedCode === "undefined") {
      return {
        assertion: this.name,
        ok: true,
        message: "No exit code expectation configured."
      };
    }

    const ok = result.exitCode === expectedCode;
    return {
      assertion: this.name,
      ok,
      message: ok ? `Exit code matched (${expectedCode}).` : `Expected exit code ${expectedCode}, got ${result.exitCode}.`
    };
  }
}

export class StdoutContainsAssertion implements Assertion {
  name = "stdout-contains";

  async evaluate(result: ExecutionResult, expected: ExpectedOutcome): Promise<AssertionResult> {
    const needle = expected.expectedStdoutContains;
    if (!needle) {
      return {
        assertion: this.name,
        ok: true,
        message: "No stdout expectation configured."
      };
    }

    const ok = result.stdout.includes(needle);
    return {
      assertion: this.name,
      ok,
      message: ok ? `stdout contains '${needle}'.` : `Expected stdout to contain '${needle}'.`
    };
  }
}

export async function evaluateAssertions(
  result: ExecutionResult,
  expected: ExpectedOutcome,
  assertions: Assertion[]
): Promise<AssertionResult[]> {
  const outcomes: AssertionResult[] = [];
  for (const assertion of assertions) {
    outcomes.push(await assertion.evaluate(result, expected));
  }
  return outcomes;
}
