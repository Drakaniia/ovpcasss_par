#!/usr/bin/env node
/**
 * Enforces docs/architecture/folder-architecture.md.
 * Run with `pnpm check:structure`.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const MAX_FILES_PER_DIR = 30;
const MAX_FILE_LINES = 400;
const MAX_SRC_DEPTH = 4;
const FORBIDDEN_DIRS = new Set(['utils', 'helpers', 'misc']);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.svelte', '.rs', '.css']);
const ROOT_CONFIG_FILE = /\.config\.(js|mjs|ts)$/;
const SKIP_DIRS = new Set([
  '.git',
  '.svelte-kit',
  '.turbo',
  '.wrangler',
  'build',
  'coverage',
  'dist',
  'migrations',
  'node_modules',
  'target',
]);

const problems = [];
let fileCount = 0;
let dirCount = 0;

const toPosix = (filePath) => path.relative(ROOT, filePath).split(path.sep).join('/');

async function entriesOf(dir) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function lineCount(filePath) {
  const contents = await readFile(filePath, 'utf8');
  return contents.length === 0 ? 0 : contents.split('\n').length;
}

async function walk(dir) {
  const entries = await entriesOf(dir);
  const files = entries.filter((entry) => entry.isFile());
  dirCount += 1;

  if (files.length > MAX_FILES_PER_DIR) {
    problems.push(`${toPosix(dir)} has ${files.length} files (max ${MAX_FILES_PER_DIR})`);
  }

  for (const entry of files) {
    fileCount += 1;
    const filePath = path.join(dir, entry.name);
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
    const lines = await lineCount(filePath);
    if (lines > MAX_FILE_LINES) {
      problems.push(`${toPosix(filePath)} has ${lines} lines (max ${MAX_FILE_LINES})`);
    }
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
    if (FORBIDDEN_DIRS.has(entry.name)) {
      problems.push(`${toPosix(path.join(dir, entry.name))} is a dumping-ground folder name`);
    }
    await walk(path.join(dir, entry.name));
  }
}

async function checkSrcDepth(srcDir, depth) {
  const entries = await entriesOf(srcDir);
  for (const entry of entries) {
    if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
    const child = path.join(srcDir, entry.name);
    const childDepth = depth + 1;
    if (childDepth > MAX_SRC_DEPTH) {
      problems.push(`${toPosix(child)} exceeds ${MAX_SRC_DEPTH} levels below src/`);
      continue;
    }
    await checkSrcDepth(child, childDepth);
  }
}

async function main() {
  const rootFiles = await entriesOf(ROOT);
  for (const entry of rootFiles) {
    if (!entry.isFile()) continue;
    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
    if (ROOT_CONFIG_FILE.test(entry.name)) continue;
    problems.push(`${entry.name} is source code in the repository root`);
  }

  await walk(ROOT);

  for (const workspace of ['apps', 'packages']) {
    for (const entry of await entriesOf(path.join(ROOT, workspace))) {
      if (!entry.isDirectory()) continue;
      const srcDir = path.join(ROOT, workspace, entry.name, 'src');
      await checkSrcDepth(srcDir, 0);
    }
  }

  if (problems.length > 0) {
    console.error(`Structure check failed (${problems.length} problem(s)):\n`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  console.log(`Structure check passed: ${fileCount} files, ${dirCount} directories.`);
}

await main();
