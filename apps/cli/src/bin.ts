#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyDocs } from "./index.js";

function readArgs(name: string, argv: string[]): string[] {
  return argv
    .filter((entry) => entry.startsWith(`${name}=`))
    .map((entry) => entry.split("=").slice(1).join("="))
    .filter(Boolean);
}

export interface VerifyCliArgs {
  rootDir?: string;
  sandbox?: "docker" | "local";
  summaryFile?: string;
  timeoutMs?: number;
  httpAllowHosts?: string[];
  httpTimeoutMs?: number;
  httpMaxRedirects?: number;
  httpMaxBodyBytes?: number;
  httpBlockPrivateNetworks?: boolean;
}

function readArgValue(name: string, argv: string[]): string | undefined {
  return argv.find((entry) => entry.startsWith(`${name}=`))?.split("=").slice(1).join("=");
}

function parseOptionalBoolean(value?: string): boolean | undefined {
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

export function parseVerifyCliArgs(argv: string[]): VerifyCliArgs {
  const rootDir = readArgValue("--root", argv);
  const sandboxValue = readArgValue("--sandbox", argv);
  const summaryFile = readArgValue("--summary", argv);
  const timeoutRaw = readArgValue("--timeout-ms", argv);
  const httpTimeoutRaw = readArgValue("--http-timeout-ms", argv);
  const maxRedirectsRaw = readArgValue("--http-max-redirects", argv);
  const maxBodyBytesRaw = readArgValue("--http-max-body-bytes", argv);
  const httpBlockPrivateNetworksRaw = readArgValue("--http-block-private-networks", argv);
  const timeoutMs = timeoutRaw ? Number(timeoutRaw) : undefined;
  const httpTimeoutMs = httpTimeoutRaw ? Number(httpTimeoutRaw) : undefined;
  const httpMaxRedirects = maxRedirectsRaw ? Number(maxRedirectsRaw) : undefined;
  const httpMaxBodyBytes = maxBodyBytesRaw ? Number(maxBodyBytesRaw) : undefined;
  const sandbox = sandboxValue === "local" || sandboxValue === "docker" ? sandboxValue : undefined;
  const httpAllowHosts = readArgs("--http-allow-host", argv);

  return {
    rootDir,
    sandbox,
    summaryFile,
    timeoutMs,
    httpAllowHosts: httpAllowHosts.length > 0 ? httpAllowHosts : undefined,
    httpTimeoutMs,
    httpMaxRedirects,
    httpMaxBodyBytes,
    httpBlockPrivateNetworks: parseOptionalBoolean(httpBlockPrivateNetworksRaw)
  };
}

async function main(): Promise<void> {
  const command = process.argv[2];

  if (command !== "verify") {
    process.stderr.write(
      "Usage: docs-drift verify [--root=.] [--sandbox=docker|local] [--summary=.docs-drift/summary.md] [--http-allow-host=api.example.com] [--http-timeout-ms=5000] [--http-max-redirects=3] [--http-max-body-bytes=262144] [--http-block-private-networks=false]\n"
    );
    process.exit(1);
  }

  const args = parseVerifyCliArgs(process.argv.slice(3));
  const exitCode = await verifyDocs(args);
  process.exit(exitCode);
}

const isEntrypoint = process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isEntrypoint) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`docs-drift failed: ${message}\n`);
    process.exit(1);
  });
}
