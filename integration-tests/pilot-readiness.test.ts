import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REQUIRED_PATHS = [
  "docs/user-guide/pilot-adoption.md",
  "docs/maintainers/v0.1.1-triage.md",
  ".github/ISSUE_TEMPLATE/bug_runtime_report.md",
  ".github/ISSUE_TEMPLATE/onboarding_dx_friction.md",
  ".github/ISSUE_TEMPLATE/pilot_summary.md",
  "templates/basic/README.md",
  "templates/basic/.github/workflows/docs-drift.yml"
];

describe("pilot readiness docs", () => {
  it("points to real adoption and feedback files", async () => {
    for (const relativePath of REQUIRED_PATHS) {
      await expect(fs.access(path.resolve(process.cwd(), relativePath))).resolves.toBeUndefined();
    }
  });

  it("documents the pilot flow, repo suitability, and feedback fields", async () => {
    const readme = await fs.readFile(path.resolve(process.cwd(), "README.md"), "utf8");
    const pilotGuide = await fs.readFile(path.resolve(process.cwd(), "docs/user-guide/pilot-adoption.md"), "utf8");
    const triageGuide = await fs.readFile(path.resolve(process.cwd(), "docs/maintainers/v0.1.1-triage.md"), "utf8");
    const bugTemplate = await fs.readFile(path.resolve(process.cwd(), ".github/ISSUE_TEMPLATE/bug_runtime_report.md"), "utf8");
    const dxTemplate = await fs.readFile(
      path.resolve(process.cwd(), ".github/ISSUE_TEMPLATE/onboarding_dx_friction.md"),
      "utf8"
    );
    const pilotTemplate = await fs.readFile(path.resolve(process.cwd(), ".github/ISSUE_TEMPLATE/pilot_summary.md"), "utf8");
    const templateReadme = await fs.readFile(path.resolve(process.cwd(), "templates/basic/README.md"), "utf8");

    expect(readme).toContain("docs/user-guide/pilot-adoption.md");
    expect(readme).toContain("docs/maintainers/v0.1.1-triage.md");
    expect(readme).toContain(".github/ISSUE_TEMPLATE");

    expect(pilotGuide).toContain("Repo suitability matrix");
    expect(pilotGuide).toContain("Success criteria");
    expect(pilotGuide).toContain("Sharp edges");
    expect(pilotGuide).toContain("docs/maintainers/v0.1.1-triage.md");

    expect(triageGuide).toContain("Issue classes");
    expect(triageGuide).toContain("onboarding");
    expect(triageGuide).toContain("CI / Action");
    expect(triageGuide).toContain("HTTP runtime");
    expect(triageGuide).toContain("feature request");

    expect(bugTemplate).toContain("Repo type");
    expect(bugTemplate).toContain("Environment");
    expect(bugTemplate).toContain("Config used");
    expect(bugTemplate).toContain("Workaround");
    expect(bugTemplate).toContain("Classification");

    expect(dxTemplate).toContain("Repo shape");
    expect(dxTemplate).toContain("Where friction happened");
    expect(dxTemplate).toContain("What config did you try");
    expect(dxTemplate).toContain("What would have made this easier");

    expect(pilotTemplate).toContain("Repo");
    expect(pilotTemplate).toContain("Outcome");
    expect(pilotTemplate).toContain("Success criteria");
    expect(pilotTemplate).toContain("Recommendation");

    expect(templateReadme).toContain("Pilot-ready rollout");
    expect(templateReadme).toContain("do not try to verify the whole repo on day one");
    expect(templateReadme).toContain("keep the first example dependency-light");
  });
});
