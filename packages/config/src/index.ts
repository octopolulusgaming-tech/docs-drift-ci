import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const DEFAULT_HTTP_TIMEOUT_MS = 5_000;
export const DEFAULT_HTTP_MAX_REDIRECTS = 3;
export const DEFAULT_HTTP_MAX_BODY_BYTES = 262_144;
export const DEFAULT_HTTP_BLOCK_PRIVATE_NETWORKS = true;

export const httpConfigSchema = z.object({
  allowHosts: z.array(z.string()).default([]),
  timeoutMs: z.number().int().positive().default(DEFAULT_HTTP_TIMEOUT_MS),
  maxRedirects: z.number().int().min(0).default(DEFAULT_HTTP_MAX_REDIRECTS),
  maxBodyBytes: z.number().int().positive().default(DEFAULT_HTTP_MAX_BODY_BYTES),
  blockPrivateNetworks: z.boolean().optional()
});

export const projectVerifyConfigSchema = z.object({
  include: z.array(z.string()).optional(),
  http: httpConfigSchema.partial().optional()
});

export const verifyConfigSchema = z.object({
  rootDir: z.string().default(process.cwd()),
  timeoutMs: z.number().int().positive().default(15_000),
  sandbox: z.enum(["docker", "local"]).default("docker"),
  include: z.array(z.string()).default(["README.md", "docs/**/*.md"]),
  http: httpConfigSchema.default({})
});

export type VerifyConfig = z.infer<typeof verifyConfigSchema>;
export type ProjectVerifyConfig = z.infer<typeof projectVerifyConfigSchema>;

export interface VerifyConfigInput {
  rootDir?: string;
  timeoutMs?: number;
  sandbox?: "docker" | "local";
  include?: string[];
  http?: Partial<VerifyConfig["http"]>;
  httpAllowHosts?: string[];
  httpTimeoutMs?: number;
  httpMaxRedirects?: number;
  httpMaxBodyBytes?: number;
  httpBlockPrivateNetworks?: boolean;
}

const PROJECT_CONFIG_FILE = "docs-drift.config.json";

function normalizeInput(input: VerifyConfigInput): VerifyConfigInput {
  const http = {
    ...(input.http ?? {})
  };

  if (typeof input.httpAllowHosts !== "undefined") {
    http.allowHosts = input.httpAllowHosts;
  }

  if (typeof input.httpTimeoutMs !== "undefined") {
    http.timeoutMs = input.httpTimeoutMs;
  }

  if (typeof input.httpMaxRedirects !== "undefined") {
    http.maxRedirects = input.httpMaxRedirects;
  }

  if (typeof input.httpMaxBodyBytes !== "undefined") {
    http.maxBodyBytes = input.httpMaxBodyBytes;
  }

  if (typeof input.httpBlockPrivateNetworks !== "undefined") {
    http.blockPrivateNetworks = input.httpBlockPrivateNetworks;
  }

  return {
    rootDir: input.rootDir,
    timeoutMs: input.timeoutMs,
    sandbox: input.sandbox,
    include: input.include,
    http
  };
}

function mergeHttpAllowHosts(
  projectAllowHosts: string[] | undefined,
  inputAllowHosts: string[] | undefined,
  sandbox: "docker" | "local" | undefined
): string[] | undefined {
  const defaults = projectAllowHosts ?? [];
  const overrides = inputAllowHosts ?? [];

  if (sandbox === "local") {
    return Array.from(new Set([...defaults, ...overrides]));
  }

  if (typeof inputAllowHosts !== "undefined") {
    return inputAllowHosts;
  }

  return projectAllowHosts;
}

export async function loadProjectVerifyConfig(rootDir: string): Promise<ProjectVerifyConfig> {
  const configPath = path.join(rootDir, PROJECT_CONFIG_FILE);

  try {
    const rawText = await fs.readFile(configPath, "utf8");
    return projectVerifyConfigSchema.parse(JSON.parse(rawText));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

export async function loadVerifyConfig(input: VerifyConfigInput = {}): Promise<VerifyConfig> {
  const normalizedInput = normalizeInput(input);
  const rootDir = normalizedInput.rootDir ?? process.cwd();
  const projectConfig = await loadProjectVerifyConfig(rootDir);
  const httpAllowHosts = mergeHttpAllowHosts(projectConfig.http?.allowHosts, normalizedInput.http?.allowHosts, normalizedInput.sandbox);

  return verifyConfigSchema.parse({
    rootDir,
    timeoutMs: normalizedInput.timeoutMs,
    sandbox: normalizedInput.sandbox,
    include: normalizedInput.include ?? projectConfig.include,
    http: {
      ...(projectConfig.http ?? {}),
      ...(normalizedInput.http ?? {}),
      allowHosts: httpAllowHosts
    }
  });
}
