import type { DriftReport } from "@docs-drift/shared";

export function hasFailures(report: DriftReport): boolean {
  return report.failed > 0;
}

export function summarizeReport(report: DriftReport): string {
  return `${report.passed}/${report.total} passed`;
}
