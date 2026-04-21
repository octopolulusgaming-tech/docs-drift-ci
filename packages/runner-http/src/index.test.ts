import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { HttpRunner, parseCurlCommand } from "./index.js";

const servers: http.Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        })
    )
  );
  servers.length = 0;
});

function startServer(handler: http.RequestListener): Promise<string> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    servers.push(server);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address === "object") {
        resolve(`http://127.0.0.1:${address.port}`);
      }
    });
  });
}

describe("parseCurlCommand", () => {
  it("parses method, url, headers and body", () => {
    const parsed = parseCurlCommand(
      "curl -X POST http://127.0.0.1:9999/users -H 'Authorization: Bearer token' --json '{\"name\":\"Ada\"}'"
    );

    expect(parsed.method).toBe("POST");
    expect(parsed.url).toBe("http://127.0.0.1:9999/users");
    expect(parsed.headers.Authorization).toBe("Bearer token");
    expect(parsed.headers["Content-Type"]).toBe("application/json");
    expect(parsed.body).toBe("{\"name\":\"Ada\"}");
  });
});

describe("HttpRunner", () => {
  it("executes curl blocks through fetch", async () => {
    const baseUrl = await startServer((request, response) => {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ method: request.method, ok: true }));
    });

    const result = await new HttpRunner().execute(
      {
        id: "curl-1",
        language: "curl",
        content: `curl ${baseUrl}/health`,
        filePath: "README.md",
        lineStart: 1,
        lineEnd: 1,
        metadata: {}
      },
      {
        cwd: process.cwd(),
        timeoutMs: 15_000,
        sandbox: "local"
      }
    );

    expect(result.http?.request.method).toBe("GET");
    expect(result.http?.response.status).toBe(200);
    expect(result.http?.response.body).toContain("\"ok\":true");
  });

  it("fails clearly when a request exceeds the configured timeout", async () => {
    const baseUrl = await startServer((_, response) => {
      setTimeout(() => {
        response.end("slow");
      }, 50);
    });

    const result = await new HttpRunner().execute(
      {
        id: "curl-timeout",
        language: "curl",
        content: `curl ${baseUrl}/slow`,
        filePath: "README.md",
        lineStart: 1,
        lineEnd: 1,
        metadata: {}
      },
      {
        cwd: process.cwd(),
        timeoutMs: 15_000,
        sandbox: "local",
        http: {
          timeoutMs: 10
        }
      }
    );

    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("HTTP request timed out.");
    expect(result.stderr).toContain(`URL: ${baseUrl}/slow`);
    expect(result.stderr).toContain("TimeoutMs: 10");
  });

  it("allows requests within the configured timeout", async () => {
    const baseUrl = await startServer((_, response) => {
      setTimeout(() => {
        response.end("fast-enough");
      }, 10);
    });

    const result = await new HttpRunner().execute(
      {
        id: "curl-timeout-pass",
        language: "curl",
        content: `curl ${baseUrl}/fast`,
        filePath: "README.md",
        lineStart: 1,
        lineEnd: 1,
        metadata: {}
      },
      {
        cwd: process.cwd(),
        timeoutMs: 15_000,
        sandbox: "local",
        http: {
          timeoutMs: 100
        }
      }
    );

    expect(result.ok).toBe(true);
    expect(result.http?.response.body).toBe("fast-enough");
  });

  it("follows redirects within the configured limit", async () => {
    const baseUrl = await startServer((request, response) => {
      if (request.url === "/redirect-1") {
        response.statusCode = 302;
        response.setHeader("location", "/redirect-2");
        response.end();
        return;
      }

      if (request.url === "/redirect-2") {
        response.statusCode = 302;
        response.setHeader("location", "/final");
        response.end();
        return;
      }

      response.end("redirect-ok");
    });

    const result = await new HttpRunner().execute(
      {
        id: "curl-redirect-ok",
        language: "curl",
        content: `curl ${baseUrl}/redirect-1`,
        filePath: "README.md",
        lineStart: 1,
        lineEnd: 1,
        metadata: {}
      },
      {
        cwd: process.cwd(),
        timeoutMs: 15_000,
        sandbox: "local",
        http: {
          maxRedirects: 3
        }
      }
    );

    expect(result.ok).toBe(true);
    expect(result.http?.request.url).toBe(`${baseUrl}/final`);
    expect(result.http?.response.body).toBe("redirect-ok");
  });

  it("fails clearly when the redirect limit is exceeded", async () => {
    const baseUrl = await startServer((request, response) => {
      if (request.url === "/redirect-1") {
        response.statusCode = 302;
        response.setHeader("location", "/redirect-2");
        response.end();
        return;
      }

      if (request.url === "/redirect-2") {
        response.statusCode = 302;
        response.setHeader("location", "/final");
        response.end();
        return;
      }

      response.end("redirect-ok");
    });

    const result = await new HttpRunner().execute(
      {
        id: "curl-redirect-fail",
        language: "curl",
        content: `curl ${baseUrl}/redirect-1`,
        filePath: "README.md",
        lineStart: 1,
        lineEnd: 1,
        metadata: {}
      },
      {
        cwd: process.cwd(),
        timeoutMs: 15_000,
        sandbox: "local",
        http: {
          maxRedirects: 1
        }
      }
    );

    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("HTTP redirect limit exceeded.");
    expect(result.stderr).toContain(`URL: ${baseUrl}/redirect-2`);
    expect(result.stderr).toContain("MaxRedirects: 1");
  });

  it("fails clearly when the response body exceeds the configured size", async () => {
    const baseUrl = await startServer((_, response) => {
      response.end("x".repeat(20));
    });

    const result = await new HttpRunner().execute(
      {
        id: "curl-body-too-large",
        language: "curl",
        content: `curl ${baseUrl}/large`,
        filePath: "README.md",
        lineStart: 1,
        lineEnd: 1,
        metadata: {}
      },
      {
        cwd: process.cwd(),
        timeoutMs: 15_000,
        sandbox: "local",
        http: {
          maxBodyBytes: 8
        }
      }
    );

    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("HTTP response body too large.");
    expect(result.stderr).toContain(`URL: ${baseUrl}/large`);
    expect(result.stderr).toContain("MaxBodyBytes: 8");
  });

  it("allows responses below the configured body-size limit", async () => {
    const baseUrl = await startServer((_, response) => {
      response.end("small");
    });

    const result = await new HttpRunner().execute(
      {
        id: "curl-body-small",
        language: "curl",
        content: `curl ${baseUrl}/small`,
        filePath: "README.md",
        lineStart: 1,
        lineEnd: 1,
        metadata: {}
      },
      {
        cwd: process.cwd(),
        timeoutMs: 15_000,
        sandbox: "local",
        http: {
          maxBodyBytes: 32
        }
      }
    );

    expect(result.ok).toBe(true);
    expect(result.http?.response.body).toBe("small");
  });

  it("blocks hosts before fetch in restrictive mode", async () => {
    const result = await new HttpRunner().execute(
      {
        id: "curl-blocked",
        language: "curl",
        content: "curl https://api.example.com/users",
        filePath: "README.md",
        lineStart: 1,
        lineEnd: 1,
        metadata: {}
      },
      {
        cwd: process.cwd(),
        timeoutMs: 15_000,
        sandbox: "docker"
      }
    );

    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("HTTP host blocked by policy.");
    expect(result.stderr).toContain("Hostname: api.example.com");
    expect(result.stderr).toContain("URL: https://api.example.com/users");
    expect(result.stderr).toContain("Allowlist: (empty)");
    expect(result.stderr).toContain("--http-allow-host=api.example.com");
  });

  it("blocks private-network literals outside local by default", async () => {
    const result = await new HttpRunner().execute(
      {
        id: "curl-private-blocked",
        language: "curl",
        content: "curl http://127.0.0.1/health",
        filePath: "README.md",
        lineStart: 1,
        lineEnd: 1,
        metadata: {}
      },
      {
        cwd: process.cwd(),
        timeoutMs: 15_000,
        sandbox: "docker",
        http: {
          allowHosts: ["127.0.0.1"]
        }
      }
    );

    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("HTTP private network blocked by policy.");
    expect(result.stderr).toContain("Hostname: 127.0.0.1");
    expect(result.stderr).toContain("--http-block-private-networks=false");
  });

  it("allows exact hosts in restrictive mode when configured and private-network blocking is disabled", async () => {
    const baseUrl = await startServer((request, response) => {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ method: request.method, ok: true }));
    });

    const result = await new HttpRunner().execute(
      {
        id: "curl-allowlisted",
        language: "curl",
        content: `curl ${baseUrl}/health`,
        filePath: "README.md",
        lineStart: 1,
        lineEnd: 1,
        metadata: {}
      },
      {
        cwd: process.cwd(),
        timeoutMs: 15_000,
        sandbox: "docker",
        http: {
          allowHosts: ["127.0.0.1"],
          blockPrivateNetworks: false
        }
      }
    );

    expect(result.ok).toBe(true);
    expect(result.http?.response.status).toBe(200);
  });
});
