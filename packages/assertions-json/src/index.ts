import type { Assertion, AssertionResult, ExecutionResult, ExpectedOutcome } from "@docs-drift/shared";
import { compareJson } from "@docs-drift/shared";

function safeParseJson(value: string): { ok: true; parsed: unknown } | { ok: false } {
  try {
    return { ok: true, parsed: JSON.parse(value) };
  } catch {
    return { ok: false };
  }
}

function resolveBody(result: ExecutionResult): string {
  return result.http?.response.body ?? result.stdout;
}

function hasJsonPath(value: unknown, keyPath: string): boolean {
  const parts = keyPath.split(".").filter(Boolean);
  let current: unknown = value;

  for (const part of parts) {
    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return false;
      }
      current = current[index];
      continue;
    }

    if (typeof current !== "object" || current === null || !(part in current)) {
      return false;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return true;
}

export class JsonEqualsAssertion implements Assertion {
  name = "json-equals";

  async evaluate(result: ExecutionResult, expected: ExpectedOutcome): Promise<AssertionResult> {
    if (typeof expected.expectedJsonEquals === "undefined") {
      return {
        assertion: this.name,
        ok: true,
        message: "No JSON equality expectation configured."
      };
    }

    const parsed = safeParseJson(resolveBody(result).trim());
    if (!parsed.ok) {
      return {
        assertion: this.name,
        ok: false,
        message: "Response body is not valid JSON."
      };
    }

    const comparison = compareJson(expected.expectedJsonEquals, parsed.parsed, expected.ignoreJsonPaths ?? []);
    if (comparison.ok) {
      return {
        assertion: this.name,
        ok: true,
        message: "JSON output matches expected payload."
      };
    }

    const details = comparison.differences.length > 0 ? comparison.differences.join("; ") : "JSON payload differs.";
    return {
      assertion: this.name,
      ok: false,
      message: `${details}\nExpected:\n${comparison.expectedText}\nActual:\n${comparison.actualText}`
    };
  }
}

export class JsonHasKeysAssertion implements Assertion {
  name = "json-has-keys";

  async evaluate(result: ExecutionResult, expected: ExpectedOutcome): Promise<AssertionResult> {
    const keyPaths = expected.expectedJsonHasKeys;
    if (!keyPaths || keyPaths.length === 0) {
      return {
        assertion: this.name,
        ok: true,
        message: "No JSON key expectation configured."
      };
    }

    const parsed = safeParseJson(resolveBody(result).trim());
    if (!parsed.ok) {
      return {
        assertion: this.name,
        ok: false,
        message: "Response body is not valid JSON."
      };
    }

    const missing = keyPaths.filter((keyPath) => !hasJsonPath(parsed.parsed, keyPath));
    return {
      assertion: this.name,
      ok: missing.length === 0,
      message: missing.length === 0 ? `JSON contains keys: ${keyPaths.join(", ")}.` : `Missing JSON keys: ${missing.join(", ")}.`
    };
  }
}

export class JsonOutputAssertion extends JsonEqualsAssertion {}
