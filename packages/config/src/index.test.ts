import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_HTTP_MAX_BODY_BYTES,
  DEFAULT_HTTP_MAX_REDIRECTS,
  DEFAULT_HTTP_TIMEOUT_MS,
  loadVerifyConfig
} from "./index.js";

describe("loadVerifyConfig", () => {
  it("reads HTTP options from docs-drift.config.json", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "docs-drift-config-"));
    await fs.writeFile(
      path.join(dir, "docs-drift.config.json"),
      JSON.stringify({
        http: {
          allowHosts: ["api.example.com", "*.example.com"],
          timeoutMs: 7000,
          maxRedirects: 5,
          maxBodyBytes: 4096,
          blockPrivateNetworks: false
        }
      })
    );

    const config = await loadVerifyConfig({ rootDir: dir });

    expect(config.http.allowHosts).toEqual(["api.example.com", "*.example.com"]);
    expect(config.http.timeoutMs).toBe(7000);
    expect(config.http.maxRedirects).toBe(5);
    expect(config.http.maxBodyBytes).toBe(4096);
    expect(config.http.blockPrivateNetworks).toBe(false);
  });

  it("lets CLI-style input override project config", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "docs-drift-config-"));
    await fs.writeFile(
      path.join(dir, "docs-drift.config.json"),
      JSON.stringify({
        http: {
          timeoutMs: 7000,
          maxRedirects: 5
        }
      })
    );

    const config = await loadVerifyConfig({
      rootDir: dir,
      httpTimeoutMs: 1000,
      httpMaxRedirects: 1
    });

    expect(config.http.timeoutMs).toBe(1000);
    expect(config.http.maxRedirects).toBe(1);
  });

  it("merges project and CLI allowHosts in sandbox=local", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "docs-drift-config-"));
    await fs.writeFile(
      path.join(dir, "docs-drift.config.json"),
      JSON.stringify({
        http: {
          allowHosts: ["site.api.espn.com"]
        }
      })
    );

    const config = await loadVerifyConfig({
      rootDir: dir,
      sandbox: "local",
      httpAllowHosts: ["sports.core.api.espn.com"]
    });

    expect(config.http.allowHosts).toEqual(["site.api.espn.com", "sports.core.api.espn.com"]);
  });

  it("lets project config override defaults", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "docs-drift-config-"));
    await fs.writeFile(
      path.join(dir, "docs-drift.config.json"),
      JSON.stringify({
        http: {
          timeoutMs: 2500
        }
      })
    );

    const config = await loadVerifyConfig({ rootDir: dir });

    expect(config.http.timeoutMs).toBe(2500);
    expect(config.http.maxRedirects).toBe(DEFAULT_HTTP_MAX_REDIRECTS);
    expect(config.http.maxBodyBytes).toBe(DEFAULT_HTTP_MAX_BODY_BYTES);
  });

  it("falls back to explicit defaults when no config file is present", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "docs-drift-config-"));
    const config = await loadVerifyConfig({ rootDir: dir });

    expect(config.http.timeoutMs).toBe(DEFAULT_HTTP_TIMEOUT_MS);
    expect(config.http.maxRedirects).toBe(DEFAULT_HTTP_MAX_REDIRECTS);
    expect(config.http.maxBodyBytes).toBe(DEFAULT_HTTP_MAX_BODY_BYTES);
    expect(config.http.blockPrivateNetworks).toBeUndefined();
  });
});
