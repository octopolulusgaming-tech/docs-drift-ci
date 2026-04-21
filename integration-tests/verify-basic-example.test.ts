import path from "node:path";
import { describe, expect, it } from "vitest";
import { verifyDocs } from "../apps/cli/src/index.js";

describe("examples/basic", () => {
  it("supports the canonical quickstart command", async () => {
    const exitCode = await verifyDocs({
      rootDir: path.resolve(process.cwd(), "examples/basic"),
      sandbox: "local",
      summaryFile: ".docs-drift/basic-summary.md"
    });

    expect(exitCode).toBe(0);
  });
});
