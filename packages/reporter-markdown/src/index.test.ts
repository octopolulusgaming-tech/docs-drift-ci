import { describe, expect, it } from "vitest";
import { renderMarkdownReport } from "./index.js";

describe("renderMarkdownReport", () => {
  it("keeps blocked-host errors actionable in the report", () => {
    const markdown = renderMarkdownReport({
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      total: 1,
      passed: 0,
      failed: 1,
      results: [
        {
          block: {
            id: "curl-blocked",
            language: "curl",
            content: "curl https://api.example.com/users",
            filePath: "/tmp/README.md",
            lineStart: 1,
            lineEnd: 1,
            metadata: {}
          },
          execution: {
            blockId: "curl-blocked",
            runnerName: "http-runner",
            ok: false,
            exitCode: 1,
            stdout: "",
            stderr:
              "HTTP host blocked by policy. Hostname: api.example.com URL: https://api.example.com/users Allowlist: (empty) To allow this host, rerun with --http-allow-host=api.example.com",
            durationMs: 1,
            http: {
              request: {
                method: "GET",
                url: "https://api.example.com/users",
                headers: {}
              },
              response: {
                status: 0,
                headers: {},
                body: ""
              }
            }
          },
          assertions: [
            {
              assertion: "http-status",
              ok: false,
              message: "blocked"
            }
          ],
          ok: false
        }
      ]
    });

    expect(markdown).toContain("HTTP host blocked by policy.");
    expect(markdown).toContain("Allowlist: (empty)");
    expect(markdown).toContain("--http-allow-host=api.example.com");
  });

  it("keeps operational HTTP errors actionable in the report", () => {
    const markdown = renderMarkdownReport({
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      total: 1,
      passed: 0,
      failed: 1,
      results: [
        {
          block: {
            id: "curl-timeout",
            language: "curl",
            content: "curl https://api.example.com/slow",
            filePath: "/tmp/README.md",
            lineStart: 1,
            lineEnd: 1,
            metadata: {}
          },
          execution: {
            blockId: "curl-timeout",
            runnerName: "http-runner",
            ok: false,
            exitCode: 1,
            stdout: "",
            stderr:
              "HTTP request timed out. URL: https://api.example.com/slow TimeoutMs: 5000 To allow more time, rerun with --http-timeout-ms=10000",
            durationMs: 1,
            http: {
              request: {
                method: "GET",
                url: "https://api.example.com/slow",
                headers: {}
              },
              response: {
                status: 0,
                headers: {},
                body: ""
              }
            }
          },
          assertions: [
            {
              assertion: "http-status",
              ok: false,
              message: "timeout"
            }
          ],
          ok: false
        }
      ]
    });

    expect(markdown).toContain("HTTP request timed out.");
    expect(markdown).toContain("TimeoutMs: 5000");
    expect(markdown).toContain("--http-timeout-ms=10000");
  });
});
