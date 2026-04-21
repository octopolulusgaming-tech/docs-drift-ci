import type { DocBlock, PlannedExecution } from "@docs-drift/shared";

function parseNumber(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return undefined;
  }
  return parsed;
}

function getMetadataValue(metadata: Record<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value !== "undefined") {
      return value;
    }
  }
  return undefined;
}

function parseStringList(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

export interface PlannerOptions {
  blocks: DocBlock[];
}

export function buildExecutionPlan(options: PlannerOptions): PlannedExecution[] {
  const jsonById = new Map<string, DocBlock>();

  for (const block of options.blocks) {
    if (block.language === "json") {
      jsonById.set(block.id, block);
    }
  }

  const plan: PlannedExecution[] = [];

  for (const block of options.blocks) {
    if (block.language !== "bash" && block.language !== "sh" && block.language !== "curl") {
      continue;
    }

    const expectedJsonRef = getMetadataValue(block.metadata, ["docs-drift:expect-json-equals", "expectJson"]);
    const expectedJsonBlock = expectedJsonRef ? jsonById.get(expectedJsonRef) : undefined;

    let expectedJsonEquals: unknown = undefined;
    if (expectedJsonBlock) {
      try {
        expectedJsonEquals = JSON.parse(expectedJsonBlock.content);
      } catch {
        expectedJsonEquals = undefined;
      }
    }

    const expectedExitCode =
      block.language === "bash" || block.language === "sh"
        ? parseNumber(getMetadataValue(block.metadata, ["docs-drift:expect-exit", "expectExit"])) ?? 0
        : parseNumber(getMetadataValue(block.metadata, ["docs-drift:expect-exit", "expectExit"]));

    plan.push({
      block,
      expected: {
        expectedExitCode,
        expectedStdoutContains: getMetadataValue(block.metadata, ["docs-drift:expect-stdout-contains", "expectStdout"]),
        expectedStatus: parseNumber(getMetadataValue(block.metadata, ["docs-drift:expect-status"])),
        expectedBodyContains: getMetadataValue(block.metadata, ["docs-drift:expect-body-contains"]),
        expectedJsonEquals,
        expectedJsonHasKeys: parseStringList(getMetadataValue(block.metadata, ["docs-drift:expect-json-has-keys"])),
        ignoreJsonPaths: parseStringList(getMetadataValue(block.metadata, ["docs-drift:ignore-json-paths"]))
      }
    });
  }

  return plan;
}
