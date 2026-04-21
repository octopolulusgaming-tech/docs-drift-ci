import { describe, expect, it } from "vitest";
import { JsonEqualsAssertion, JsonHasKeysAssertion } from "./index.js";

describe("Json assertions", () => {
  it("compares json using stable key order and ignored paths", async () => {
    const assertion = new JsonEqualsAssertion();
    const result = await assertion.evaluate(
      {
        blockId: "id",
        runnerName: "shell",
        ok: true,
        exitCode: 0,
        stdout: '{"b":2,"a":1,"meta":{"requestId":"abc"}}',
        stderr: "",
        durationMs: 1
      },
      {
        expectedJsonEquals: { a: 1, b: 2, meta: { requestId: "ignored" } },
        ignoreJsonPaths: ["meta.requestId"]
      }
    );

    expect(result.ok).toBe(true);
  });

  it("checks required json keys", async () => {
    const assertion = new JsonHasKeysAssertion();
    const result = await assertion.evaluate(
      {
        blockId: "id",
        runnerName: "http",
        ok: true,
        exitCode: 0,
        stdout: "",
        stderr: "",
        durationMs: 1,
        http: {
          request: { method: "GET", url: "http://example.test", headers: {} },
          response: {
            status: 200,
            headers: {},
            body: '{"data":[{"id":"u_1","name":"Ada"}]}'
          }
        }
      },
      {
        expectedJsonHasKeys: ["data.0.id", "data.0.name"]
      }
    );

    expect(result.ok).toBe(true);
  });
});
