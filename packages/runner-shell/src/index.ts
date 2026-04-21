import { spawn } from "node:child_process";
import type { DocBlock, ExecutionContext, ExecutionResult, Runner } from "@docs-drift/shared";

function runCommand(command: string, args: string[], input: string, cwd: string, timeoutMs: number): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(command, args, { cwd, stdio: "pipe" });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        blockId: "",
        runnerName: "",
        ok: !timedOut,
        exitCode: timedOut ? 124 : (code ?? 1),
        stdout,
        stderr: timedOut ? `${stderr}\nProcess exceeded timeout.`.trim() : stderr,
        durationMs: Date.now() - start
      });
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

async function executeInLocalShell(content: string, context: ExecutionContext): Promise<ExecutionResult> {
  return runCommand("bash", ["-lc", "cat >/tmp/docs-drift-snippet.sh && bash /tmp/docs-drift-snippet.sh"], content, context.cwd, context.timeoutMs);
}

async function executeInDocker(content: string, context: ExecutionContext): Promise<ExecutionResult> {
  const args = [
    "run",
    "--rm",
    "-i",
    "-v",
    `${context.cwd}:/workspace`,
    "-w",
    "/workspace",
    "alpine:3.20",
    "sh",
    "-lc",
    "cat >/tmp/docs-drift-snippet.sh && sh /tmp/docs-drift-snippet.sh"
  ];
  return runCommand("docker", args, content, context.cwd, context.timeoutMs);
}

export class ShellRunner implements Runner {
  name = "shell-runner";

  supports(block: DocBlock): boolean {
    return block.language === "bash" || block.language === "sh";
  }

  async execute(block: DocBlock, context: ExecutionContext): Promise<ExecutionResult> {
    const baseResult = context.sandbox === "docker" ? await executeInDocker(block.content, context) : await executeInLocalShell(block.content, context);
    return {
      ...baseResult,
      blockId: block.id,
      runnerName: this.name
    };
  }
}
