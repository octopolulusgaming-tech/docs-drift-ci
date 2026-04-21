import { describe, expect, it } from "vitest";
import { resolveGitHubActionVerifyInput } from "./index.js";

describe("resolveGitHubActionVerifyInput", () => {
  it("parses dedicated HTTP inputs", () => {
    const result = resolveGitHubActionVerifyInput({
      GITHUB_WORKSPACE: "/tmp/repo",
      INPUT_SANDBOX: "docker",
      INPUT_HTTP_ALLOW_HOSTS: "api.example.com,*.example.com\nlocalhost",
      INPUT_HTTP_TIMEOUT_MS: "5000",
      INPUT_HTTP_MAX_REDIRECTS: "3",
      INPUT_HTTP_MAX_BODY_BYTES: "262144",
      INPUT_HTTP_BLOCK_PRIVATE_NETWORKS: "false"
    });

    expect(result.rootDir).toBe("/tmp/repo");
    expect(result.sandbox).toBe("docker");
    expect(result.httpAllowHosts).toEqual(["api.example.com", "*.example.com", "localhost"]);
    expect(result.httpTimeoutMs).toBe(5000);
    expect(result.httpMaxRedirects).toBe(3);
    expect(result.httpMaxBodyBytes).toBe(262144);
    expect(result.httpBlockPrivateNetworks).toBe(false);
  });

  it("falls back to DOCS_DRIFT env vars when inputs are absent", () => {
    const result = resolveGitHubActionVerifyInput({
      GITHUB_WORKSPACE: "/tmp/repo",
      DOCS_DRIFT_HTTP_ALLOW_HOSTS: "api.example.com",
      DOCS_DRIFT_HTTP_TIMEOUT_MS: "9000",
      DOCS_DRIFT_HTTP_MAX_REDIRECTS: "4",
      DOCS_DRIFT_HTTP_MAX_BODY_BYTES: "1024",
      DOCS_DRIFT_HTTP_BLOCK_PRIVATE_NETWORKS: "true"
    });

    expect(result.httpAllowHosts).toEqual(["api.example.com"]);
    expect(result.httpTimeoutMs).toBe(9000);
    expect(result.httpMaxRedirects).toBe(4);
    expect(result.httpMaxBodyBytes).toBe(1024);
    expect(result.httpBlockPrivateNetworks).toBe(true);
  });

  it("gives action inputs precedence over env fallbacks", () => {
    const result = resolveGitHubActionVerifyInput({
      GITHUB_WORKSPACE: "/tmp/repo",
      INPUT_HTTP_TIMEOUT_MS: "5000",
      DOCS_DRIFT_HTTP_TIMEOUT_MS: "9000"
    });

    expect(result.httpTimeoutMs).toBe(5000);
  });
});
