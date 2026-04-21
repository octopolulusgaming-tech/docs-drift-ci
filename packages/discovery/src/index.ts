import fg from "fast-glob";
import path from "node:path";

export interface DiscoveryOptions {
  rootDir: string;
  include: string[];
}

export async function discoverMarkdownFiles(options: DiscoveryOptions): Promise<string[]> {
  const matches = await fg(options.include, {
    cwd: options.rootDir,
    onlyFiles: true,
    unique: true,
    dot: false
  });

  return matches.sort().map((file) => path.join(options.rootDir, file));
}
