import path from "node:path";
import { describe, expect, it } from "vitest";
import { verifyDocs } from "../apps/cli/src/index.js";

describe("verifyDocs", () => {
  it("passes against the bundled passing fixture", async () => {
    const rootDir = path.resolve(process.cwd(), "fixtures/passing");
    const exitCode = await verifyDocs({
      rootDir,
      sandbox: "local",
      summaryFile: ".docs-drift/summary.md"
    });

    expect(exitCode).toBe(0);
  });
});
