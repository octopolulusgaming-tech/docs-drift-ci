import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyDocs } from "../apps/cli/src/index.js";

let server: http.Server;
let baseUrl = "";

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

async function createRunnableExampleFromTemplate(): Promise<string> {
  const sourceRoot = path.resolve(process.cwd(), "examples/http-config");
  const targetRoot = await fs.mkdtemp(path.join(os.tmpdir(), "docs-drift-http-config-example-"));

  const readme = await fs.readFile(path.join(sourceRoot, "README.md"), "utf8");
  const config = await fs.readFile(path.join(sourceRoot, "docs-drift.config.json"), "utf8");

  await fs.writeFile(path.join(targetRoot, "README.md"), readme.replaceAll("http://127.0.0.1:4020", baseUrl));
  await fs.writeFile(path.join(targetRoot, "docs-drift.config.json"), config, "utf8");

  return targetRoot;
}

describe("examples/http-config", () => {
  it("verifies successfully using docs-drift.config.json", async () => {
    const rootDir = await createRunnableExampleFromTemplate();
    const exitCode = await verifyDocs({
      rootDir,
      sandbox: "local",
      summaryFile: ".docs-drift/http-config-summary.md"
    });

    expect(exitCode).toBe(0);
  });
});
