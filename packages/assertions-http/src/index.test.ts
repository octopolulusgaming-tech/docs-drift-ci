import { describe, expect, it } from "vitest";
import { BodyContainsAssertion, HttpStatusAssertion } from "./index.js";

const httpResult = {
  blockId: "req-1",
  runnerName: "http-runner",
  ok: true,
  exitCode: 0,
  stdout: "{\"status\":\"ok\"}",
  stderr: "",
  durationMs: 10,
  http: {
    request: { method: "GET", url: "http://localhost/test", headers: {} },
    response: { status: 200, headers: {}, body: "{\"status\":\"ok\"}" }
  }
};

describe("HTTP assertions", () => {
  it("validates status code", async () => {
    const result = await new HttpStatusAssertion().evaluate(httpResult, { expectedStatus: 200 });
    expect(result.ok).toBe(true);
  });

  it("validates body contains text", async () => {
    const result = await new BodyContainsAssertion().evaluate(httpResult, { expectedBodyContains: "status" });
    expect(result.ok).toBe(true);
  });
});
