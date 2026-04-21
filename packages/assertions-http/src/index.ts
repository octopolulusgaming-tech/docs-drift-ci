import type { Assertion, AssertionResult, ExecutionResult, ExpectedOutcome } from "@docs-drift/shared";

function resolveBody(result: ExecutionResult): string {
  return result.http?.response.body ?? result.stdout;
}

export class HttpStatusAssertion implements Assertion {
  name = "http-status";

  async evaluate(result: ExecutionResult, expected: ExpectedOutcome): Promise<AssertionResult> {
    if (typeof expected.expectedStatus === "undefined") {
      return {
        assertion: this.name,
        ok: true,
        message: "No HTTP status expectation configured."
      };
    }

    const actualStatus = result.http?.response.status;
    if (typeof actualStatus === "undefined") {
      return {
        assertion: this.name,
        ok: false,
        message: "Execution result does not include an HTTP response."
      };
    }

    return {
      assertion: this.name,
      ok: actualStatus === expected.expectedStatus,
      message:
        actualStatus === expected.expectedStatus
          ? `HTTP status matched (${expected.expectedStatus}).`
          : `Expected HTTP status ${expected.expectedStatus}, got ${actualStatus}.`
    };
  }
}

export class BodyContainsAssertion implements Assertion {
  name = "body-contains";

  async evaluate(result: ExecutionResult, expected: ExpectedOutcome): Promise<AssertionResult> {
    const needle = expected.expectedBodyContains;
    if (!needle) {
      return {
        assertion: this.name,
        ok: true,
        message: "No body expectation configured."
      };
    }

    const body = resolveBody(result);
    return {
      assertion: this.name,
      ok: body.includes(needle),
      message: body.includes(needle) ? `Body contains '${needle}'.` : `Expected body to contain '${needle}'.`
    };
  }
}
