import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { runGitHubAction } from "../apps/github-action/src/index.js";

let server: http.Server;
let baseUrl = "";
const tempDirs: string[] = [];

beforeAll(async () => {
  server = http.createServer((request, response) => {
    if (request.url === "/users") {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          meta: { requestId: `req-${Date.now()}` },
          users: [{ id: "u_1", name: "Ada" }]
        })
      );
      return;
    }

    if (request.url === "/redirect/users") {
      response.statusCode = 302;
      response.setHeader("location", "/users");
      response.end();
      return;
    }

    response.statusCode = 404;
    response.end("not found");
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        baseUrl = `http://127.0.0.1:${address.port}`;
      }
      resolve();
    });
  });
});

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) =>
      fs.rm(dir, {
        recursive: true,
        force: true
      })
    )
  );
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});

async function assertActionDefinesInputs(inputNames: string[]): Promise<void> {
  const actionYaml = await fs.readFile(path.resolve(process.cwd(), "apps/github-action/action.yml"), "utf8");

  for (const inputName of inputNames) {
    expect(actionYaml).toContain(`${inputName}:`);
  }
}

async function createActionFixture(httpConfig: Record<string, unknown>): Promise<string> {
  const sourceRoot = path.resolve(process.cwd(), "examples/http-config");
  const targetRoot = await fs.mkdtemp(path.join(os.tmpdir(), "docs-drift-action-entrypoint-"));
  tempDirs.push(targetRoot);

  const readme = await fs.readFile(path.join(sourceRoot, "README.md"), "utf8");
  await fs.writeFile(path.join(targetRoot, "README.md"), readme.replaceAll("http://127.0.0.1:4020", baseUrl), "utf8");
  await fs.writeFile(
    path.join(targetRoot, "docs-drift.config.json"),
    JSON.stringify(
      {
        http: httpConfig
      },
      null,
      2
    ),
    "utf8"
  );

  return targetRoot;
}

describe("GitHub Action entrypoint integration", () => {
  it("executes the real Action entrypoint, loads project config, and lets Action inputs override runtime HTTP settings", async () => {
    await assertActionDefinesInputs(["http-max-redirects", "http-block-private-networks"]);

    const rootDir = await createActionFixture({
      allowHosts: ["127.0.0.1"],
      timeoutMs: 1_000,
      maxRedirects: 0,
      maxBodyBytes: 4_096,
      blockPrivateNetworks: true
    });
    const stepSummaryPath = path.join(rootDir, "step-summary.md");

    const exitCode = await runGitHubAction({
      GITHUB_WORKSPACE: rootDir,
      GITHUB_STEP_SUMMARY: stepSummaryPath,
      INPUT_SANDBOX: "local",
      INPUT_HTTP_MAX_REDIRECTS: "2",
      INPUT_HTTP_BLOCK_PRIVATE_NETWORKS: "false"
    });

    expect(exitCode).toBe(0);

    const summary = await fs.readFile(path.join(rootDir, ".docs-drift/summary.md"), "utf8");
    const stepSummary = await fs.readFile(stepSummaryPath, "utf8");

    expect(summary).toContain("Summary: **2/2 passed**");
    expect(summary).toContain("config-users-redirect");
    expect(stepSummary).toContain("Summary: **2/2 passed**");
  });

  it("fails end-to-end when project config overrides local defaults and blocks private network literals", async () => {
    await assertActionDefinesInputs(["http-block-private-networks"]);

    const rootDir = await createActionFixture({
      allowHosts: ["127.0.0.1"],
      timeoutMs: 1_000,
      maxRedirects: 2,
      maxBodyBytes: 4_096,
      blockPrivateNetworks: true
    });
    const stepSummaryPath = path.join(rootDir, "step-summary.md");

    const exitCode = await runGitHubAction({
      GITHUB_WORKSPACE: rootDir,
      GITHUB_STEP_SUMMARY: stepSummaryPath,
      INPUT_SANDBOX: "local"
    });

    expect(exitCode).toBe(1);

    const summary = await fs.readFile(path.join(rootDir, ".docs-drift/summary.md"), "utf8");
    const stepSummary = await fs.readFile(stepSummaryPath, "utf8");

    expect(summary).toContain("HTTP private network blocked by policy.");
    expect(summary).toContain("Hostname: 127.0.0.1");
    expect(summary).toContain("--http-block-private-networks=false");
    expect(stepSummary).toContain("HTTP private network blocked by policy.");
  });
});
