import { describe, expect, it } from "vitest";
import { buildExecutionPlan } from "./index.js";
import type { DocBlock } from "@docs-drift/shared";

const base: Omit<DocBlock, "id" | "language" | "content" | "metadata"> = {
  filePath: "README.md",
  lineStart: 1,
  lineEnd: 3
};

describe("buildExecutionPlan", () => {
  it("links curl block with docs-drift expectations", () => {
    const blocks: DocBlock[] = [
      {
        ...base,
        id: "users-list",
        language: "curl",
        content: "curl http://localhost:3000/users",
        metadata: {
          "docs-drift:expect-status": "200",
          "docs-drift:expect-body-contains": "status",
          "docs-drift:expect-json-equals": "hello-json",
          "docs-drift:expect-json-has-keys": "status,data.0.id",
          "docs-drift:ignore-json-paths": "meta.requestId"
        }
      },
      {
        ...base,
        id: "hello-json",
        language: "json",
        content: '{"status":"ok","data":[{"id":"u_1"}],"meta":{"requestId":"ignore-me"}}',
        metadata: {}
      }
    ];

    const plan = buildExecutionPlan({ blocks });
    expect(plan).toHaveLength(1);
    expect(plan[0].expected.expectedStatus).toBe(200);
    expect(plan[0].expected.expectedBodyContains).toBe("status");
    expect(plan[0].expected.expectedJsonEquals).toEqual({
      status: "ok",
      data: [{ id: "u_1" }],
      meta: { requestId: "ignore-me" }
    });
    expect(plan[0].expected.expectedJsonHasKeys).toEqual(["status", "data.0.id"]);
    expect(plan[0].expected.ignoreJsonPaths).toEqual(["meta.requestId"]);
  });
});
