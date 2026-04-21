export interface DocBlock {
  id: string;
  language: string;
  content: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  metadata: Record<string, string>;
}

export interface ExecutionContext {
  cwd: string;
  timeoutMs: number;
  sandbox: "docker" | "local";
  http?: HttpExecutionOptions;
}

export interface HttpExecutionOptions {
  allowHosts?: string[];
  timeoutMs?: number;
  maxRedirects?: number;
  maxBodyBytes?: number;
  blockPrivateNetworks?: boolean;
}

export interface HttpRequestDetails {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface HttpResponseDetails {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface HttpExchange {
  request: HttpRequestDetails;
  response: HttpResponseDetails;
}

export interface ExecutionResult {
  blockId: string;
  runnerName: string;
  ok: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  http?: HttpExchange;
}

export interface ExpectedOutcome {
  expectedExitCode?: number;
  expectedStdoutContains?: string;
  expectedStatus?: number;
  expectedBodyContains?: string;
  expectedJsonEquals?: unknown;
  expectedJsonHasKeys?: string[];
  ignoreJsonPaths?: string[];
}

export interface AssertionResult {
  assertion: string;
  ok: boolean;
  message: string;
}

export interface Runner {
  name: string;
  supports(block: DocBlock): boolean;
  execute(block: DocBlock, context: ExecutionContext): Promise<ExecutionResult>;
}

export interface Assertion {
  name: string;
  evaluate(result: ExecutionResult, expected: ExpectedOutcome): Promise<AssertionResult>;
}

export interface PlannedExecution {
  block: DocBlock;
  expected: ExpectedOutcome;
}

export interface BlockParseResult {
  filePath: string;
  blocks: DocBlock[];
}

export interface DriftItemResult {
  block: DocBlock;
  execution: ExecutionResult;
  assertions: AssertionResult[];
  ok: boolean;
}

export interface DriftReport {
  startedAt: string;
  finishedAt: string;
  total: number;
  passed: number;
  failed: number;
  results: DriftItemResult[];
}

export interface Reporter {
  publish(report: DriftReport): Promise<void>;
}

export interface JsonComparisonResult {
  ok: boolean;
  expectedText: string;
  actualText: string;
  differences: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildJsonPath(pathParts: string[]): string {
  return pathParts.join(".");
}

function sortJsonValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entryValue]) => [key, sortJsonValue(entryValue)]);

  return Object.fromEntries(entries);
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value), null, 2);
}

const OMIT = Symbol("omit");

type OmitMarker = typeof OMIT;

function omitJsonPaths(value: unknown, ignoredPaths: Set<string>, pathParts: string[] = []): unknown | OmitMarker {
  const currentPath = buildJsonPath(pathParts);
  if (currentPath && ignoredPaths.has(currentPath)) {
    return OMIT;
  }

  if (Array.isArray(value)) {
    const nextItems = value
      .map((item, index) => omitJsonPaths(item, ignoredPaths, [...pathParts, String(index)]))
      .filter((item) => item !== OMIT);
    return nextItems;
  }

  if (isPlainObject(value)) {
    const nextEntries = Object.entries(value)
      .map(([key, entryValue]) => [key, omitJsonPaths(entryValue, ignoredPaths, [...pathParts, key])] as const)
      .filter((entry) => entry[1] !== OMIT);
    return Object.fromEntries(nextEntries);
  }

  return value;
}

export function normalizeJson(value: unknown, ignorePaths: string[] = []): unknown {
  const omitted = omitJsonPaths(value, new Set(ignorePaths));
  if (omitted === OMIT) {
    return undefined;
  }

  return sortJsonValue(omitted);
}

function collectJsonDifferences(expected: unknown, actual: unknown, path = "$"): string[] {
  if (!isPlainObject(expected) && !Array.isArray(expected) && !isPlainObject(actual) && !Array.isArray(actual)) {
    if (Object.is(expected, actual)) {
      return [];
    }
    return [`${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`];
  }

  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      return [`${path}: expected ${Array.isArray(expected) ? "array" : typeof expected}, got ${Array.isArray(actual) ? "array" : typeof actual}`];
    }

    const differences: string[] = [];
    if (expected.length !== actual.length) {
      differences.push(`${path}: expected array length ${expected.length}, got ${actual.length}`);
    }

    for (let index = 0; index < Math.min(expected.length, actual.length); index += 1) {
      differences.push(...collectJsonDifferences(expected[index], actual[index], `${path}[${index}]`));
    }
    return differences;
  }

  if (!isPlainObject(expected) || !isPlainObject(actual)) {
    return [`${path}: expected ${typeof expected}, got ${typeof actual}`];
  }

  const keys = Array.from(new Set([...Object.keys(expected), ...Object.keys(actual)])).sort((a, b) => a.localeCompare(b));
  const differences: string[] = [];

  for (const key of keys) {
    if (!(key in expected)) {
      differences.push(`${path}.${key}: unexpected key present`);
      continue;
    }

    if (!(key in actual)) {
      differences.push(`${path}.${key}: missing key`);
      continue;
    }

    differences.push(...collectJsonDifferences(expected[key], actual[key], `${path}.${key}`));
  }

  return differences;
}

export function compareJson(expected: unknown, actual: unknown, ignorePaths: string[] = []): JsonComparisonResult {
  const normalizedExpected = normalizeJson(expected, ignorePaths);
  const normalizedActual = normalizeJson(actual, ignorePaths);
  const expectedText = stableStringify(normalizedExpected);
  const actualText = stableStringify(normalizedActual);
  const differences = expectedText === actualText ? [] : collectJsonDifferences(normalizedExpected, normalizedActual).slice(0, 10);

  return {
    ok: expectedText === actualText,
    expectedText,
    actualText,
    differences
  };
}
