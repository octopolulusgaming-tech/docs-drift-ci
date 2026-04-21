import { runGitHubAction } from "./index.js";

async function main(): Promise<void> {
  const exitCode = await runGitHubAction();
  process.exit(exitCode);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[docs-drift-action] ${message}\n`);
  process.exit(1);
});
