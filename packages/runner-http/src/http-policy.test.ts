import { describe, expect, it } from "vitest";
import {
  buildBlockedHostMessage,
  buildPrivateNetworkBlockedMessage,
  evaluateHttpHostPolicy,
  getIpLiteralDetails,
  matchesAllowedHost,
  normalizeHost,
  resolveEffectiveHttpOptions,
  resolveHttpAllowlist
} from "./http-policy.js";

describe("normalizeHost", () => {
  it("normalizes trailing dots safely", () => {
    expect(normalizeHost("API.EXAMPLE.COM.")).toBe("api.example.com");
  });
});

describe("resolveHttpAllowlist", () => {
  it("allows localhost by default in sandbox=local", () => {
    expect(resolveHttpAllowlist({ cwd: ".", timeoutMs: 1000, sandbox: "local" })).toContain("localhost");
  });

  it("allows 127.0.0.1 by default in sandbox=local", () => {
    expect(resolveHttpAllowlist({ cwd: ".", timeoutMs: 1000, sandbox: "local" })).toContain("127.0.0.1");
  });

  it("allows ::1 by default in sandbox=local", () => {
    expect(resolveHttpAllowlist({ cwd: ".", timeoutMs: 1000, sandbox: "local" })).toContain("::1");
  });

  it("keeps project allowHosts alongside local defaults", () => {
    const allowlist = resolveHttpAllowlist({
      cwd: ".",
      timeoutMs: 1000,
      sandbox: "local",
      http: {
        allowHosts: ["site.api.espn.com"]
      }
    });

    expect(allowlist).toEqual(expect.arrayContaining(["localhost", "127.0.0.1", "::1", "site.api.espn.com"]));
  });
});

describe("resolveEffectiveHttpOptions", () => {
  it("uses conservative defaults", () => {
    const options = resolveEffectiveHttpOptions({ cwd: ".", timeoutMs: 1000, sandbox: "docker" });
    expect(options.timeoutMs).toBe(5000);
    expect(options.maxRedirects).toBe(3);
    expect(options.maxBodyBytes).toBe(262144);
    expect(options.blockPrivateNetworks).toBe(true);
  });

  it("disables private-network blocking by default in sandbox=local", () => {
    const options = resolveEffectiveHttpOptions({ cwd: ".", timeoutMs: 1000, sandbox: "local" });
    expect(options.blockPrivateNetworks).toBe(false);
  });
});

describe("matchesAllowedHost", () => {
  it("matches exact hostnames case-insensitively", () => {
    expect(matchesAllowedHost("API.EXAMPLE.COM", "api.example.com")).toBe(true);
  });

  it("matches wildcard subdomains", () => {
    expect(matchesAllowedHost("*.example.com", "api.example.com")).toBe(true);
  });

  it("does not match wildcard against apex domain", () => {
    expect(matchesAllowedHost("*.example.com", "example.com")).toBe(false);
  });

  it("does not match wildcard against incorrect hosts", () => {
    expect(matchesAllowedHost("*.example.com", "example.org")).toBe(false);
  });

  it("matches trailing-dot hostnames after normalization", () => {
    expect(matchesAllowedHost("api.example.com", "api.example.com.")).toBe(true);
  });
});

describe("getIpLiteralDetails", () => {
  it("detects private IPv4 literals", () => {
    expect(getIpLiteralDetails("10.1.2.3")?.category).toBe("private");
  });

  it("detects link-local IPv4 literals", () => {
    expect(getIpLiteralDetails("169.254.10.20")?.category).toBe("link-local");
  });

  it("detects IPv6 loopback literals", () => {
    expect(getIpLiteralDetails("::1")?.category).toBe("loopback");
  });

  it("detects IPv6 unique-local literals", () => {
    expect(getIpLiteralDetails("fd00::1")?.category).toBe("unique-local");
  });

  it("does not treat hostnames as IP literals", () => {
    expect(getIpLiteralDetails("api.example.com")).toBeNull();
  });
});

describe("evaluateHttpHostPolicy", () => {
  it("allows localhost in sandbox=local", () => {
    const decision = evaluateHttpHostPolicy(new URL("http://localhost:4010/users"), {
      cwd: ".",
      timeoutMs: 1000,
      sandbox: "local"
    });

    expect(decision.allowed).toBe(true);
  });

  it("allows 127.0.0.1 in sandbox=local", () => {
    const decision = evaluateHttpHostPolicy(new URL("http://127.0.0.1:4010/users"), {
      cwd: ".",
      timeoutMs: 1000,
      sandbox: "local"
    });

    expect(decision.allowed).toBe(true);
  });

  it("allows ::1 in sandbox=local", () => {
    const decision = evaluateHttpHostPolicy(new URL("http://[::1]:4010/users"), {
      cwd: ".",
      timeoutMs: 1000,
      sandbox: "local"
    });

    expect(decision.allowed).toBe(true);
  });

  it("blocks non-allowlisted hosts in restrictive mode", () => {
    const decision = evaluateHttpHostPolicy(new URL("https://api.example.com/users"), {
      cwd: ".",
      timeoutMs: 1000,
      sandbox: "docker"
    });

    expect(decision.allowed).toBe(false);
  });

  it("allows exact hosts in restrictive mode when allowlisted", () => {
    const decision = evaluateHttpHostPolicy(new URL("https://api.example.com/users"), {
      cwd: ".",
      timeoutMs: 1000,
      sandbox: "docker",
      http: {
        allowHosts: ["api.example.com"]
      }
    });

    expect(decision.allowed).toBe(true);
  });

  it("allows exact hosts in sandbox=local when configured in docs-drift.config.json", () => {
    const decision = evaluateHttpHostPolicy(new URL("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"), {
      cwd: ".",
      timeoutMs: 1000,
      sandbox: "local",
      http: {
        allowHosts: ["site.api.espn.com"]
      }
    });

    expect(decision.allowed).toBe(true);
    expect(decision.activeAllowlist).toEqual(expect.arrayContaining(["localhost", "127.0.0.1", "::1", "site.api.espn.com"]));
  });

  it("supports wildcard allowlists in restrictive mode", () => {
    const decision = evaluateHttpHostPolicy(new URL("https://api.example.com/users"), {
      cwd: ".",
      timeoutMs: 1000,
      sandbox: "docker",
      http: {
        allowHosts: ["*.example.com"]
      }
    });

    expect(decision.allowed).toBe(true);
  });

  it("blocks private IPv4 literals outside local by default", () => {
    const decision = evaluateHttpHostPolicy(new URL("http://10.1.2.3/users"), {
      cwd: ".",
      timeoutMs: 1000,
      sandbox: "docker",
      http: {
        allowHosts: ["10.1.2.3"]
      }
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("HTTP private network blocked by policy.");
  });

  it("blocks loopback literals outside local when private-network blocking is enabled", () => {
    const decision = evaluateHttpHostPolicy(new URL("http://127.0.0.1/users"), {
      cwd: ".",
      timeoutMs: 1000,
      sandbox: "docker",
      http: {
        allowHosts: ["127.0.0.1"]
      }
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("Category: loopback");
  });

  it("allows literal IPs outside local when private-network blocking is disabled", () => {
    const decision = evaluateHttpHostPolicy(new URL("http://127.0.0.1/users"), {
      cwd: ".",
      timeoutMs: 1000,
      sandbox: "docker",
      http: {
        allowHosts: ["127.0.0.1"],
        blockPrivateNetworks: false
      }
    });

    expect(decision.allowed).toBe(true);
  });

  it("does not treat normal hostnames as IP literals", () => {
    const decision = evaluateHttpHostPolicy(new URL("https://internal.example.com/users"), {
      cwd: ".",
      timeoutMs: 1000,
      sandbox: "docker",
      http: {
        allowHosts: ["internal.example.com"]
      }
    });

    expect(decision.allowed).toBe(true);
  });

  it("normalizes trailing-dot hostnames in policy evaluation", () => {
    const decision = evaluateHttpHostPolicy(new URL("https://api.example.com./users"), {
      cwd: ".",
      timeoutMs: 1000,
      sandbox: "docker",
      http: {
        allowHosts: ["api.example.com"]
      }
    });

    expect(decision.allowed).toBe(true);
    expect(decision.normalizedHostname).toBe("api.example.com");
  });

  it("builds a clear blocked-host message", () => {
    const message = buildBlockedHostMessage("https://api.example.com/users", "api.example.com", ["localhost"]);
    expect(message).toContain("Hostname: api.example.com");
    expect(message).toContain("URL: https://api.example.com/users");
    expect(message).toContain("Allowlist: localhost");
    expect(message).toContain("--http-allow-host=api.example.com");
  });

  it("builds a clear private-network blocked message", () => {
    const message = buildPrivateNetworkBlockedMessage("http://10.0.0.1/users", "10.0.0.1", "private");
    expect(message).toContain("HTTP private network blocked by policy.");
    expect(message).toContain("Hostname: 10.0.0.1");
    expect(message).toContain("URL: http://10.0.0.1/users");
    expect(message).toContain("--http-block-private-networks=false");
  });
});
