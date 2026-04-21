import { isIP } from "node:net";
import type { ExecutionContext } from "@docs-drift/shared";

const LOCALHOST_ALLOWLIST = ["localhost", "127.0.0.1", "::1"];

export interface HttpHostPolicyDecision {
  allowed: boolean;
  hostname: string;
  normalizedHostname: string;
  activeAllowlist: string[];
  effectiveBlockPrivateNetworks: boolean;
  reason?: string;
}

export interface EffectiveHttpOptions {
  allowHosts: string[];
  timeoutMs: number;
  maxRedirects: number;
  maxBodyBytes: number;
  blockPrivateNetworks: boolean;
}

export interface IpLiteralDetails {
  version: 4 | 6;
  category: "loopback" | "private" | "link-local" | "unique-local";
}

function stripTrailingDots(value: string): string {
  let normalized = value;
  while (normalized.endsWith(".")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

export function normalizeHost(value: string): string {
  let normalized = value.trim().toLowerCase();
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }
  return stripTrailingDots(normalized);
}

export function normalizeHostPattern(pattern: string): string {
  const trimmed = pattern.trim().toLowerCase();
  if (trimmed.startsWith("*.")) {
    const suffix = normalizeHost(trimmed.slice(2));
    return suffix ? `*.${suffix}` : "*.";
  }

  return normalizeHost(trimmed);
}

export function matchesAllowedHost(pattern: string, hostname: string): boolean {
  const normalizedPattern = normalizeHostPattern(pattern);
  const normalizedHostname = normalizeHost(hostname);

  if (normalizedPattern.startsWith("*.")) {
    const suffix = normalizedPattern.slice(2);
    return normalizedHostname.endsWith(`.${suffix}`) && normalizedHostname !== suffix;
  }

  return normalizedPattern === normalizedHostname;
}

function parseIpv4Octets(value: string): number[] | null {
  const parts = value.split(".");
  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  return octets;
}

function parseIpv6Bytes(value: string): Uint8Array | null {
  const normalized = normalizeHost(value);
  if (normalized === "") {
    return null;
  }

  const hasIpv4Tail = normalized.includes(".");
  let ipv4TailBytes: number[] = [];
  let ipv6Text = normalized;

  if (hasIpv4Tail) {
    const lastColonIndex = normalized.lastIndexOf(":");
    if (lastColonIndex === -1) {
      return null;
    }

    const ipv4Tail = normalized.slice(lastColonIndex + 1);
    const octets = parseIpv4Octets(ipv4Tail);
    if (!octets) {
      return null;
    }

    ipv4TailBytes = octets;
    ipv6Text = normalized.slice(0, lastColonIndex);
  }

  const [leftText, rightText, ...rest] = ipv6Text.split("::");
  if (rest.length > 0) {
    return null;
  }

  const leftParts = leftText ? leftText.split(":").filter(Boolean) : [];
  const rightParts = rightText ? rightText.split(":").filter(Boolean) : [];
  const tailHextets = ipv4TailBytes.length > 0 ? 2 : 0;
  const missingGroups = 8 - (leftParts.length + rightParts.length + tailHextets);

  if (missingGroups < 0) {
    return null;
  }

  if (normalized.includes("::")) {
    if (missingGroups < 1) {
      return null;
    }
  } else if (missingGroups !== 0) {
    return null;
  }

  const groups = [
    ...leftParts,
    ...Array.from({ length: normalized.includes("::") ? missingGroups : 0 }, () => "0"),
    ...rightParts
  ];

  if (ipv4TailBytes.length > 0) {
    groups.push(((ipv4TailBytes[0] << 8) | ipv4TailBytes[1]).toString(16));
    groups.push(((ipv4TailBytes[2] << 8) | ipv4TailBytes[3]).toString(16));
  }

  if (groups.length !== 8) {
    return null;
  }

  const bytes = new Uint8Array(16);
  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    if (!/^[0-9a-f]{1,4}$/i.test(group)) {
      return null;
    }
    const valueNumber = Number.parseInt(group, 16);
    bytes[index * 2] = (valueNumber >> 8) & 0xff;
    bytes[index * 2 + 1] = valueNumber & 0xff;
  }

  return bytes;
}

export function getIpLiteralDetails(hostname: string): IpLiteralDetails | null {
  const normalized = normalizeHost(hostname);
  const ipVersion = isIP(normalized);

  if (ipVersion === 4) {
    const octets = parseIpv4Octets(normalized);
    if (!octets) {
      return null;
    }

    if (octets[0] === 127) {
      return { version: 4, category: "loopback" };
    }

    if (octets[0] === 10) {
      return { version: 4, category: "private" };
    }

    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
      return { version: 4, category: "private" };
    }

    if (octets[0] === 192 && octets[1] === 168) {
      return { version: 4, category: "private" };
    }

    if (octets[0] === 169 && octets[1] === 254) {
      return { version: 4, category: "link-local" };
    }

    return null;
  }

  if (ipVersion === 6) {
    const bytes = parseIpv6Bytes(normalized);
    if (!bytes) {
      return null;
    }

    const isLoopback = bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1;
    if (isLoopback) {
      return { version: 6, category: "loopback" };
    }

    if ((bytes[0] & 0xfe) === 0xfc) {
      return { version: 6, category: "unique-local" };
    }

    if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) {
      return { version: 6, category: "link-local" };
    }

    return null;
  }

  return null;
}

export function resolveHttpAllowlist(context: ExecutionContext): string[] {
  const configuredHosts = (context.http?.allowHosts ?? []).map((pattern) => normalizeHostPattern(pattern)).filter(Boolean);
  const defaults = context.sandbox === "local" ? LOCALHOST_ALLOWLIST : [];
  return Array.from(new Set([...defaults, ...configuredHosts]));
}

export function resolveEffectiveHttpOptions(context: ExecutionContext): EffectiveHttpOptions {
  return {
    allowHosts: resolveHttpAllowlist(context),
    timeoutMs: context.http?.timeoutMs ?? 5_000,
    maxRedirects: context.http?.maxRedirects ?? 3,
    maxBodyBytes: context.http?.maxBodyBytes ?? 262_144,
    blockPrivateNetworks: context.http?.blockPrivateNetworks ?? context.sandbox !== "local"
  };
}

export function buildBlockedHostMessage(url: string, hostname: string, activeAllowlist: string[]): string {
  const renderedAllowlist = activeAllowlist.length > 0 ? activeAllowlist.join(", ") : "(empty)";
  return [
    "HTTP host blocked by policy.",
    `Hostname: ${hostname}`,
    `URL: ${url}`,
    `Allowlist: ${renderedAllowlist}`,
    `To allow this host, rerun with --http-allow-host=${hostname}`
  ].join(" ");
}

export function buildPrivateNetworkBlockedMessage(url: string, hostname: string, category: IpLiteralDetails["category"]): string {
  return [
    "HTTP private network blocked by policy.",
    `Hostname: ${hostname}`,
    `URL: ${url}`,
    `Category: ${category}`,
    "To allow private or loopback IP literals outside local sandbox, rerun with --http-block-private-networks=false or set {\"http\":{\"blockPrivateNetworks\":false}} in docs-drift.config.json"
  ].join(" ");
}

export function evaluateHttpHostPolicy(url: URL, context: ExecutionContext): HttpHostPolicyDecision {
  const hostname = url.hostname;
  const normalizedHostname = normalizeHost(hostname);
  const httpOptions = resolveEffectiveHttpOptions(context);
  const ipDetails = getIpLiteralDetails(normalizedHostname);

  if (httpOptions.blockPrivateNetworks && ipDetails) {
    return {
      allowed: false,
      hostname,
      normalizedHostname,
      activeAllowlist: httpOptions.allowHosts,
      effectiveBlockPrivateNetworks: true,
      reason: buildPrivateNetworkBlockedMessage(url.toString(), normalizedHostname, ipDetails.category)
    };
  }

  const allowed = httpOptions.allowHosts.some((pattern) => matchesAllowedHost(pattern, normalizedHostname));

  if (allowed) {
    return {
      allowed: true,
      hostname,
      normalizedHostname,
      activeAllowlist: httpOptions.allowHosts,
      effectiveBlockPrivateNetworks: httpOptions.blockPrivateNetworks
    };
  }

  return {
    allowed: false,
    hostname,
    normalizedHostname,
    activeAllowlist: httpOptions.allowHosts,
    effectiveBlockPrivateNetworks: httpOptions.blockPrivateNetworks,
    reason: buildBlockedHostMessage(url.toString(), normalizedHostname, httpOptions.allowHosts)
  };
}
