import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("GitHub Action docs and workflow", () => {
  it("keeps workflow input names aligned with action.yml", async () => {
    const actionYaml = await fs.readFile(path.resolve(process.cwd(), "apps/github-action/action.yml"), "utf8");
    const workflowYaml = await fs.readFile(path.resolve(process.cwd(), ".github/workflows/docs-drift.yml"), "utf8");
    const templateWorkflowYaml = await fs.readFile(
      path.resolve(process.cwd(), "templates/basic/.github/workflows/docs-drift.yml"),
      "utf8"
    );

    const expectedInputs = [
      "http-timeout-ms",
      "http-max-redirects",
      "http-max-body-bytes",
      "http-block-private-networks"
    ];

    for (const inputName of expectedInputs) {
      expect(actionYaml).toContain(`${inputName}:`);
      expect(workflowYaml).toContain(`${inputName}:`);
      expect(templateWorkflowYaml).toContain(`${inputName}:`);
    }
  });

  it("keeps the adoption template wired to the public action ref and config file", async () => {
    const templateWorkflowYaml = await fs.readFile(
      path.resolve(process.cwd(), "templates/basic/.github/workflows/docs-drift.yml"),
      "utf8"
    );
    const templateConfig = await fs.readFile(path.resolve(process.cwd(), "templates/basic/docs-drift.config.json"), "utf8");

    expect(templateWorkflowYaml).toContain("your-org/docs-drift-ci/apps/github-action@v0.1.0");
    expect(templateConfig).toContain("\"allowHosts\"");
    expect(templateConfig).toContain("\"timeoutMs\"");
    expect(templateConfig).toContain("\"maxRedirects\"");
    expect(templateConfig).toContain("\"maxBodyBytes\"");
    expect(templateConfig).toContain("\"blockPrivateNetworks\"");
  });
});
