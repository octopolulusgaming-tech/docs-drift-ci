import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseMarkdownFile } from "./index.js";

describe("parseMarkdownFile", () => {
  it("extracts code blocks and metadata", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "docs-drift-parser-"));
    const filePath = path.join(dir, "README.md");
    await fs.writeFile(
      filePath,
      [
        "# test",
        "",
        "```bash id=run-1 docs-drift:expect-exit=0 docs-drift:expect-body-contains=\"hello world\"",
        "echo ok",
        "```",
        "",
        "```json id=run-1-out",
        "{\"status\":\"ok\"}",
        "```"
      ].join("\n")
    );

    const result = await parseMarkdownFile({ filePath, allowedLanguages: ["bash", "json"] });

    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[0].id).toBe("run-1");
    expect(result.blocks[0].metadata["docs-drift:expect-exit"]).toBe("0");
    expect(result.blocks[0].metadata["docs-drift:expect-body-contains"]).toBe("hello world");
    expect(result.blocks[1].language).toBe("json");
  });
});
