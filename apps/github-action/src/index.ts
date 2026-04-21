import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyDocs } from "@docs-drift/cli";

async function appendStepSummary(summaryPath: string, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const githubStepSummary = env.GITHUB_STEP_SUMMARY;
  if (!githubStepSummary) {
    return;
  }

  const summary = await fs.readFile(summaryPath, "utf8");
  await fs.appendFile(githubStepSummary, `${summary}\n`, "utf8");
}

function parseNumber(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value?: string): boolean | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

function parseHostList(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const items = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

export interface GitHubActionVerifyInput {
  rootDir: string;
  summaryFile: string;
  sandbox?: "docker" | "local";
  timeoutMs?: number;
  httpAllowHosts?: string[];
  httpTimeoutMs?: number;
  httpMaxRedirects?: number;
  httpMaxBodyBytes?: number;
  httpBlockPrivateNetworks?: boolean;
}

export function resolveGitHubActionVerifyInput(env: NodeJS.ProcessEnv = process.env): GitHubActionVerifyInput {
  const rootDir = env.GITHUB_WORKSPACE ?? process.cwd();
  const summaryFile = ".docs-drift/summary.md";
  const sandboxValue = env.INPUT_SANDBOX ?? env.DOCS_DRIFT_SANDBOX;
  const sandbox = sandboxValue === "local" || sandboxValue === "docker" ? sandboxValue : undefined;

  const readFromEnv = (inputEnvName: string, fallbackEnvName?: string): string | undefined => {
    const inputValue = env[inputEnvName];
    if (typeof inputValue === "string" && inputValue.trim() !== "") {
      return inputValue;
    }
    if (!fallbackEnvName) {
      return undefined;
    }
    const fallbackValue = env[fallbackEnvName];
    return typeof fallbackValue === "string" && fallbackValue.trim() !== "" ? fallbackValue : undefined;
  };

  return {
    rootDir,
    summaryFile,
    sandbox,
    timeoutMs: parseNumber(readFromEnv("INPUT_TIMEOUT_MS", "DOCS_DRIFT_TIMEOUT_MS")),
    httpAllowHosts: parseHostList(readFromEnv("INPUT_HTTP_ALLOW_HOSTS", "DOCS_DRIFT_HTTP_ALLOW_HOSTS")),
    httpTimeoutMs: parseNumber(readFromEnv("INPUT_HTTP_TIMEOUT_MS", "DOCS_DRIFT_HTTP_TIMEOUT_MS")),
    httpMaxRedirects: parseNumber(readFromEnv("INPUT_HTTP_MAX_REDIRECTS", "DOCS_DRIFT_HTTP_MAX_REDIRECTS")),
    httpMaxBodyBytes: parseNumber(readFromEnv("INPUT_HTTP_MAX_BODY_BYTES", "DOCS_DRIFT_HTTP_MAX_BODY_BYTES")),
    httpBlockPrivateNetworks: parseBoolean(
      readFromEnv("INPUT_HTTP_BLOCK_PRIVATE_NETWORKS", "DOCS_DRIFT_HTTP_BLOCK_PRIVATE_NETWORKS")
    )
  };
}

export async function runGitHubAction(
  env: NodeJS.ProcessEnv = process.env,
  executeVerifyDocs: typeof verifyDocs = verifyDocs
): Promise<number> {
  const options = resolveGitHubActionVerifyInput(env);
  const exitCode = await executeVerifyDocs(options);

  await appendStepSummary(path.join(options.rootDir, options.summaryFile), env);
  return exitCode;
}

async function main(): Promise<void> {
  const exitCode = await runGitHubAction();
  process.exit(exitCode);
}

const isEntrypoint = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isEntrypoint) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[docs-drift-action] ${message}\n`);
    process.exit(1);
  });
}
