import http from "node:http";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyDocs } from "../apps/cli/src/index.js";

let server: http.Server;

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

    response.statusCode = 404;
    response.end("not found");
  });

  await new Promise<void>((resolve) => {
    server.listen(4510, "127.0.0.1", () => resolve());
  });
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

describe("verifyDocs http support", () => {
  it("passes for curl fixtures", async () => {
    const rootDir = path.resolve(process.cwd(), "fixtures/http-passing");
    const exitCode = await verifyDocs({
      rootDir,
      sandbox: "local",
      summaryFile: ".docs-drift/http-passing-summary.md"
    });

    expect(exitCode).toBe(0);
  });

  it("fails for mismatched curl expectations", async () => {
    const rootDir = path.resolve(process.cwd(), "fixtures/http-failing");
    const exitCode = await verifyDocs({
      rootDir,
      sandbox: "local",
      summaryFile: ".docs-drift/http-failing-summary.md"
    });

    expect(exitCode).toBe(1);
  });
});
