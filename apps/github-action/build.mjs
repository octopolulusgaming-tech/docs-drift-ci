import { rm } from "node:fs/promises";
import { build } from "esbuild";

await rm("dist", { recursive: true, force: true });

await build({
  entryPoints: ["src/entrypoint.ts"],
  outfile: "dist/index.cjs",
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node20",
  sourcemap: false,
  minify: false
});
