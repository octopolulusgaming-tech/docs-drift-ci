import { describe, expect, it } from "vitest";
import { parseVerifyCliArgs } from "./bin.js";

describe("parseVerifyCliArgs", () => {
  it("leaves httpAllowHosts undefined when no allowlist flag is provided", () => {
    const parsed = parseVerifyCliArgs(["--root=examples/http-local", "--sandbox=local"]);

    expect(parsed.httpAllowHosts).toBeUndefined();
  });

  it("propagates repeated --http-allow-host flags", () => {
    const parsed = parseVerifyCliArgs([
      "--root=examples/http-local",
      "--sandbox=docker",
      "--http-allow-host=api.example.com",
      "--http-allow-host=*.example.com",
      "--http-allow-host=localhost",
      "--http-timeout-ms=5000",
      "--http-max-redirects=3",
      "--http-max-body-bytes=262144",
      "--http-block-private-networks=false"
    ]);

    expect(parsed.rootDir).toBe("examples/http-local");
    expect(parsed.sandbox).toBe("docker");
    expect(parsed.httpAllowHosts).toEqual(["api.example.com", "*.example.com", "localhost"]);
    expect(parsed.httpTimeoutMs).toBe(5000);
    expect(parsed.httpMaxRedirects).toBe(3);
    expect(parsed.httpMaxBodyBytes).toBe(262144);
    expect(parsed.httpBlockPrivateNetworks).toBe(false);
  });
});
