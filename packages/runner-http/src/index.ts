import type {
  DocBlock,
  ExecutionContext,
  ExecutionResult,
  HttpRequestDetails,
  HttpResponseDetails,
  Runner
} from "@docs-drift/shared";
import { evaluateHttpHostPolicy, resolveEffectiveHttpOptions } from "./http-policy.js";

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

export interface ParsedCurlRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

function tokenizeCurlCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | "\"" | null = null;

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];

    if (quote) {
      if (char === quote) {
        quote = null;
        continue;
      }

      if (quote === "\"" && char === "\\") {
        const next = command[index + 1];
        if (typeof next !== "undefined") {
          current += next;
          index += 1;
          continue;
        }
      }

      current += char;
      continue;
    }

    if (char === "'" || char === "\"") {
      quote = char;
      continue;
    }

    if (char === "\\") {
      const next = command[index + 1];
      if (next === "\n") {
        index += 1;
        continue;
      }
      if (typeof next !== "undefined") {
        current += next;
        index += 1;
      }
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function parseHeader(rawHeader: string): [string, string] {
  const separatorIndex = rawHeader.indexOf(":");
  if (separatorIndex === -1) {
    throw new Error(`Invalid curl header '${rawHeader}'. Expected 'Name: Value'.`);
  }

  const name = rawHeader.slice(0, separatorIndex).trim();
  const value = rawHeader.slice(separatorIndex + 1).trim();
  return [name, value];
}

function isIgnorableFlag(token: string): boolean {
  if (["--silent", "--show-error", "--location", "--fail", "--compressed"].includes(token)) {
    return true;
  }

  return /^-[fsSL]+$/.test(token);
}

function nextToken(tokens: string[], index: number, flag: string): string {
  const value = tokens[index + 1];
  if (typeof value === "undefined") {
    throw new Error(`Missing value for curl flag '${flag}'.`);
  }
  return value;
}

export function parseCurlCommand(content: string): ParsedCurlRequest {
  const tokens = tokenizeCurlCommand(content);
  if (tokens[0] !== "curl") {
    throw new Error("Curl blocks must start with the 'curl' command.");
  }

  let method = "GET";
  let url = "";
  const headers: Record<string, string> = {};
  const bodyParts: string[] = [];
  let methodExplicitlySet = false;

  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (isIgnorableFlag(token)) {
      continue;
    }

    if (token === "-X" || token === "--request") {
      method = nextToken(tokens, index, token).toUpperCase();
      methodExplicitlySet = true;
      index += 1;
      continue;
    }

    if (token === "-H" || token === "--header") {
      const [name, value] = parseHeader(nextToken(tokens, index, token));
      headers[name] = value;
      index += 1;
      continue;
    }

    if (token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary") {
      bodyParts.push(nextToken(tokens, index, token));
      if (!methodExplicitlySet) {
        method = "POST";
      }
      index += 1;
      continue;
    }

    if (token === "--json") {
      bodyParts.push(nextToken(tokens, index, token));
      headers["Content-Type"] ??= "application/json";
      headers["Accept"] ??= "application/json";
      if (!methodExplicitlySet) {
        method = "POST";
      }
      index += 1;
      continue;
    }

    if (token === "--url") {
      url = nextToken(tokens, index, token);
      index += 1;
      continue;
    }

    if (token === "-I" || token === "--head") {
      method = "HEAD";
      methodExplicitlySet = true;
      continue;
    }

    if (token === "-G" || token === "--get") {
      method = "GET";
      methodExplicitlySet = true;
      continue;
    }

    if (token.startsWith("-")) {
      throw new Error(`Unsupported curl flag '${token}'.`);
    }

    url = token;
  }

  if (!url) {
    throw new Error("Curl block does not include a URL.");
  }

  const body = bodyParts.length > 0 ? bodyParts.join("&") : undefined;
  return { method, url, headers, body };
}

function headersToRecord(headers: Headers): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    values[key] = value;
  }
  return values;
}

function buildRequestDetails(request: ParsedCurlRequest): HttpRequestDetails {
  return {
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.body
  };
}

function buildFailedExecutionResult(
  request: ParsedCurlRequest,
  message: string,
  startedAt: number,
  status = 0
): ExecutionResult {
  return {
    blockId: "",
    runnerName: "",
    ok: false,
    exitCode: 1,
    stdout: "",
    stderr: message,
    durationMs: Date.now() - startedAt,
    http: {
      request: buildRequestDetails(request),
      response: {
        status,
        headers: {},
        body: ""
      }
    }
  };
}

function buildTimeoutMessage(url: string, timeoutMs: number): string {
  return `HTTP request timed out. URL: ${url} TimeoutMs: ${timeoutMs} To allow more time, rerun with --http-timeout-ms=${timeoutMs * 2}`;
}

function buildRedirectLimitMessage(url: string, maxRedirects: number): string {
  return `HTTP redirect limit exceeded. URL: ${url} MaxRedirects: ${maxRedirects} To follow more redirects, rerun with --http-max-redirects=${maxRedirects + 1}`;
}

function buildBodyTooLargeMessage(url: string, maxBodyBytes: number, observedBytes: number): string {
  return `HTTP response body too large. URL: ${url} MaxBodyBytes: ${maxBodyBytes} ObservedBytes: ${observedBytes} To allow larger bodies, rerun with --http-max-body-bytes=${Math.max(observedBytes, maxBodyBytes * 2)}`;
}

function createTimeoutController(timeoutMs: number): { controller: AbortController; dispose: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
  return {
    controller,
    dispose: () => clearTimeout(timer)
  };
}

function resolveRedirectTarget(location: string, currentUrl: URL): URL {
  return new URL(location, currentUrl);
}

function shouldRewriteMethodForRedirect(status: number, method: string): boolean {
  return status === 303 || ((status === 301 || status === 302) && method !== "GET" && method !== "HEAD");
}

async function readResponseBody(response: Response, maxBodyBytes: number, url: string): Promise<{ ok: true; body: string } | { ok: false; message: string }> {
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const declaredLength = Number(contentLengthHeader);
    if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
      return {
        ok: false,
        message: buildBodyTooLargeMessage(url, maxBodyBytes, declaredLength)
      };
    }
  }

  if (!response.body) {
    return { ok: true, body: "" };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let observedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    observedBytes += value.byteLength;
    if (observedBytes > maxBodyBytes) {
      await reader.cancel();
      return {
        ok: false,
        message: buildBodyTooLargeMessage(url, maxBodyBytes, observedBytes)
      };
    }

    chunks.push(value);
  }

  return {
    ok: true,
    body: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8")
  };
}

async function executeRequest(request: ParsedCurlRequest, context: ExecutionContext): Promise<ExecutionResult> {
  const startedAt = Date.now();
  let currentRequest: ParsedCurlRequest = { ...request };
  let currentUrl: URL;

  try {
    currentUrl = new URL(currentRequest.url);
  } catch {
    return buildFailedExecutionResult(currentRequest, `HTTP request has invalid URL. URL: ${currentRequest.url}`, startedAt);
  }

  const httpOptions = resolveEffectiveHttpOptions(context);

  for (let redirectCount = 0; redirectCount <= httpOptions.maxRedirects; redirectCount += 1) {
    const policyDecision = evaluateHttpHostPolicy(currentUrl, context);
    if (!policyDecision.allowed) {
      return buildFailedExecutionResult(currentRequest, policyDecision.reason ?? "HTTP request blocked by policy.", startedAt);
    }

    const { controller, dispose } = createTimeoutController(httpOptions.timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method: currentRequest.method,
        headers: currentRequest.headers,
        body: currentRequest.body,
        redirect: "manual",
        signal: controller.signal
      });

      if (REDIRECT_STATUS_CODES.has(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          const bodyResult = await readResponseBody(response, httpOptions.maxBodyBytes, currentUrl.toString());
          return {
            blockId: "",
            runnerName: "",
            ok: true,
            exitCode: 0,
            stdout: bodyResult.ok ? bodyResult.body : "",
            stderr: bodyResult.ok ? "" : bodyResult.message,
            durationMs: Date.now() - startedAt,
            http: {
              request: buildRequestDetails({ ...currentRequest, url: currentUrl.toString() }),
              response: {
                status: response.status,
                headers: headersToRecord(response.headers),
                body: bodyResult.ok ? bodyResult.body : ""
              }
            }
          };
        }

        if (redirectCount >= httpOptions.maxRedirects) {
          return buildFailedExecutionResult({ ...currentRequest, url: currentUrl.toString() }, buildRedirectLimitMessage(currentUrl.toString(), httpOptions.maxRedirects), startedAt, response.status);
        }

        const nextUrl = resolveRedirectTarget(location, currentUrl);
        const shouldRewrite = shouldRewriteMethodForRedirect(response.status, currentRequest.method);
        currentRequest = {
          method: shouldRewrite ? "GET" : currentRequest.method,
          url: nextUrl.toString(),
          headers: { ...currentRequest.headers },
          body: shouldRewrite ? undefined : currentRequest.body
        };

        if (shouldRewrite) {
          delete currentRequest.headers["Content-Type"];
          delete currentRequest.headers["content-type"];
        }

        currentUrl = nextUrl;
        continue;
      }

      const bodyResult = await readResponseBody(response, httpOptions.maxBodyBytes, currentUrl.toString());
      if (!bodyResult.ok) {
        return buildFailedExecutionResult({ ...currentRequest, url: currentUrl.toString() }, bodyResult.message, startedAt, response.status);
      }

      const responseDetails: HttpResponseDetails = {
        status: response.status,
        headers: headersToRecord(response.headers),
        body: bodyResult.body
      };

      return {
        blockId: "",
        runnerName: "",
        ok: true,
        exitCode: 0,
        stdout: bodyResult.body,
        stderr: "",
        durationMs: Date.now() - startedAt,
        http: {
          request: buildRequestDetails({ ...currentRequest, url: currentUrl.toString() }),
          response: responseDetails
        }
      };
    } catch (error) {
      if (controller.signal.aborted) {
        return buildFailedExecutionResult({ ...currentRequest, url: currentUrl.toString() }, buildTimeoutMessage(currentUrl.toString(), httpOptions.timeoutMs), startedAt);
      }

      const message = error instanceof Error ? error.message : String(error);
      return buildFailedExecutionResult({ ...currentRequest, url: currentUrl.toString() }, message, startedAt);
    } finally {
      dispose();
    }
  }

  return buildFailedExecutionResult(currentRequest, buildRedirectLimitMessage(currentUrl.toString(), httpOptions.maxRedirects), startedAt);
}

export class HttpRunner implements Runner {
  name = "http-runner";

  supports(block: DocBlock): boolean {
    return block.language === "curl";
  }

  async execute(block: DocBlock, context: ExecutionContext): Promise<ExecutionResult> {
    const request = parseCurlCommand(block.content);
    const result = await executeRequest(request, context);
    return {
      ...result,
      blockId: block.id,
      runnerName: this.name
    };
  }
}
