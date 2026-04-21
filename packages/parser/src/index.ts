import fs from "node:fs/promises";
import path from "node:path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import type { BlockParseResult, DocBlock } from "@docs-drift/shared";

const processor = unified().use(remarkParse);

export interface ParseOptions {
  filePath: string;
  allowedLanguages?: string[];
}

interface CodeNode {
  type: "code";
  lang?: string | null;
  meta?: string | null;
  value: string;
  position?: {
    start?: { line?: number };
    end?: { line?: number };
  };
}

interface RootNode {
  children?: Array<{ type?: string } & Record<string, unknown>>;
}

function unquote(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseMetadata(rawMeta?: string | null): Record<string, string> {
  const metadata: Record<string, string> = {};
  if (!rawMeta) {
    return metadata;
  }

  const pattern = /([^\s=]+)=("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s]+)/g;
  for (const match of rawMeta.matchAll(pattern)) {
    const key = match[1];
    const value = match[2];
    metadata[key] = unquote(value);
  }

  return metadata;
}

function parseInfo(rawLang?: string | null, rawMeta?: string | null): { language: string; metadata: Record<string, string> } {
  const language = (rawLang ?? "").trim().toLowerCase();
  if (!language) {
    return { language: "", metadata: {} };
  }

  return { language, metadata: parseMetadata(rawMeta) };
}

function buildBlockId(filePath: string, lineStart: number, metadata: Record<string, string>): string {
  if (metadata.id) {
    return metadata.id;
  }

  const base = path.basename(filePath, path.extname(filePath));
  return `${base}:${lineStart}`;
}

export async function parseMarkdownFile(options: ParseOptions): Promise<BlockParseResult> {
  const text = await fs.readFile(options.filePath, "utf8");
  const ast = processor.parse(text) as unknown as RootNode;
  const blocks: DocBlock[] = [];

  for (const node of ast.children ?? []) {
    if (node.type !== "code") {
      continue;
    }

    const codeNode = node as unknown as CodeNode;
    const { language, metadata } = parseInfo(codeNode.lang, codeNode.meta);
    if (!language) {
      continue;
    }

    if (options.allowedLanguages && options.allowedLanguages.length > 0 && !options.allowedLanguages.includes(language)) {
      continue;
    }

    const lineStart = codeNode.position?.start?.line ?? 1;
    const lineEnd = codeNode.position?.end?.line ?? lineStart;

    blocks.push({
      id: buildBlockId(options.filePath, lineStart, metadata),
      language,
      content: codeNode.value,
      filePath: options.filePath,
      lineStart,
      lineEnd,
      metadata
    });
  }

  return {
    filePath: options.filePath,
    blocks
  };
}

export async function parseMarkdownFiles(filePaths: string[], allowedLanguages: string[]): Promise<DocBlock[]> {
  const all = await Promise.all(filePaths.map((filePath) => parseMarkdownFile({ filePath, allowedLanguages })));
  return all.flatMap((entry) => entry.blocks);
}
