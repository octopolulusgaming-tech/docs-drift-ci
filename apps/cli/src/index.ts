import { spawn } from "node:child_process";
import path from "node:path";
import { loadVerifyConfig, type VerifyConfig } from "@docs-drift/config";
import { discoverMarkdownFiles } from "@docs-drift/discovery";
import { parseMarkdownFiles } from "@docs-drift/parser";
import { buildExecutionPlan } from "@docs-drift/planner";
import { BodyContainsAssertion, HttpStatusAssertion } from "@docs-drift/assertions-http";
import { JsonEqualsAssertion, JsonHasKeysAssertion } from "@docs-drift/assertions-json";
import { runExecutionPlan } from "@docs-drift/runner-core";
import { HttpRunner } from "@docs-drift/runner-http";
import { ShellRunner } from "@docs-drift/runner-shell";
import { MarkdownReporter } from "@docs-drift/reporter-markdown";
import { hasFailures } from "@docs-drift/reporter-core";

export interface VerifyCommandInput {
  rootDir?: string;
  sandbox?: "docker" | "local";
  timeoutMs?: number;
  summaryFile?: string;
  httpAllowHosts?: string[];
  httpTimeoutMs?: number;
  httpMaxRedirects?: number;
  httpMaxBodyBytes?: number;
  httpBlockPrivateNetworks?: boolean;
}

function runCommand(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

async function resolveSandbox(config: VerifyConfig): Promise<"docker" | "local"> {
  if (config.sandbox === "local") {
    return "local";
  }

  const hasDocker = await runCommand("docker", ["version"]);
  if (!hasDocker) {
    process.stderr.write("[docs-drift] Docker no disponible, usando sandbox local.\n");
    return "local";
  }

  return "docker";
}

export async function verifyDocs(input: VerifyCommandInput = {}): Promise<number> {
  const invocationDir = process.env.INIT_CWD ?? process.cwd();
  const resolvedRoot = input.rootDir ? path.resolve(invocationDir, input.rootDir) : invocationDir;
  const config = await loadVerifyConfig({
    rootDir: resolvedRoot,
    timeoutMs: input.timeoutMs,
    sandbox: input.sandbox,
    httpAllowHosts: input.httpAllowHosts,
    httpTimeoutMs: input.httpTimeoutMs,
    httpMaxRedirects: input.httpMaxRedirects,
    httpMaxBodyBytes: input.httpMaxBodyBytes,
    httpBlockPrivateNetworks: input.httpBlockPrivateNetworks
  });

  const files = await discoverMarkdownFiles({
    rootDir: config.rootDir,
    include: config.include
  });

  const blocks = await parseMarkdownFiles(files, ["bash", "sh", "json", "curl"]);
  const plan = buildExecutionPlan({ blocks });

  const sandbox = await resolveSandbox(config);
  const report = await runExecutionPlan({
    plan,
    runners: [new ShellRunner(), new HttpRunner()],
    context: {
      cwd: config.rootDir,
      timeoutMs: config.timeoutMs,
      sandbox,
      http: {
        allowHosts: config.http.allowHosts,
        timeoutMs: config.http.timeoutMs,
        maxRedirects: config.http.maxRedirects,
        maxBodyBytes: config.http.maxBodyBytes,
        blockPrivateNetworks: config.http.blockPrivateNetworks
      }
    },
    extraAssertions: [new HttpStatusAssertion(), new BodyContainsAssertion(), new JsonEqualsAssertion(), new JsonHasKeysAssertion()]
  });

  const summaryPath = input.summaryFile ? path.resolve(config.rootDir, input.summaryFile) : undefined;
  await new MarkdownReporter({ outputFile: summaryPath, writeToStdout: true }).publish(report);

  return hasFailures(report) ? 1 : 0;
}
