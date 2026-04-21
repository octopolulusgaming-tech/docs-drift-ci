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
    if (request.url === "/payload") {
      response.end("payload-ok");
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

async function createProject(config: unknown): Promise<string> {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "docs-drift-http-config-"));
  await fs.writeFile(
    path.join(rootDir, "README.md"),
    `# Fixture\n\n\`\`\`curl id=config-test docs-drift:expect-body-contains=payload\ncurl ${baseUrl}/payload\n\`\`\`\n`
  );
  await fs.writeFile(path.join(rootDir, "docs-drift.config.json"), JSON.stringify(config, null, 2));
  return rootDir;
}

describe("verifyDocs config precedence", () => {
  it("uses HTTP config from docs-drift.config.json", async () => {
    const rootDir = await createProject({
      http: {
        maxBodyBytes: 4
      }
    });

    const exitCode = await verifyDocs({
      rootDir,
      sandbox: "local",
      summaryFile: ".docs-drift/config-summary.md"
    });

    expect(exitCode).toBe(1);
  });

  it("lets CLI-style overrides win over project config", async () => {
    const rootDir = await createProject({
      http: {
        maxBodyBytes: 4
      }
    });

    const exitCode = await verifyDocs({
      rootDir,
      sandbox: "local",
      httpMaxBodyBytes: 32,
      summaryFile: ".docs-drift/config-override-summary.md"
    });

    expect(exitCode).toBe(0);
  });
});
