import fs from "node:fs/promises";
import path from "node:path";
import type { DriftReport, Reporter } from "@docs-drift/shared";
import { summarizeReport } from "@docs-drift/reporter-core";

export interface MarkdownReporterOptions {
  outputFile?: string;
  writeToStdout?: boolean;
}

function formatFailureStderr(stderr: string): string {
  const normalized = stderr.replace(/\n/g, " ").trim();
  if (!normalized) {
    return "-";
  }

  if (normalized.startsWith("HTTP ")) {
    return normalized;
  }

  return normalized.slice(0, 120);
}

export function renderMarkdownReport(report: DriftReport): string {
  const lines: string[] = [];
  lines.push("# Docs Drift Report");
  lines.push("");
  lines.push(`Summary: **${summarizeReport(report)}**`);
  lines.push("");
  lines.push("| Block | File | Result | Assertions |");
  lines.push("|---|---|---|---|");

  for (const result of report.results) {
    const assertions = result.assertions.map((entry) => `${entry.assertion}:${entry.ok ? "ok" : "fail"}`).join(", ");
    const fileWithLine = `${path.relative(process.cwd(), result.block.filePath)}:${result.block.lineStart}`;
    lines.push(`| ${result.block.id} | ${fileWithLine} | ${result.ok ? "PASS" : "FAIL"} | ${assertions} |`);
    if (!result.ok) {
      const statusText = typeof result.execution.http?.response.status === "number" ? `status: ${result.execution.http.response.status} ` : "";
      const bodyPreview = (result.execution.http?.response.body ?? result.execution.stdout).replace(/\n/g, " ").slice(0, 120);
      const stderrText = formatFailureStderr(result.execution.stderr);
      lines.push(`|  |  |  | ${statusText}body: ${bodyPreview || "-"} stderr: ${stderrText || "-"} |`);
    }
  }

  return lines.join("\n");
}

export class MarkdownReporter implements Reporter {
  private readonly outputFile?: string;
  private readonly writeToStdout: boolean;

  constructor(options: MarkdownReporterOptions = {}) {
    this.outputFile = options.outputFile;
    this.writeToStdout = options.writeToStdout ?? true;
  }

  async publish(report: DriftReport): Promise<void> {
    const content = renderMarkdownReport(report);
    if (this.writeToStdout) {
      process.stdout.write(`${content}\n`);
    }
    if (this.outputFile) {
      await fs.mkdir(path.dirname(this.outputFile), { recursive: true });
      await fs.writeFile(this.outputFile, content, "utf8");
    }
  }
}
