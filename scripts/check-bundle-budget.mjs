import { existsSync, readFileSync } from 'node:fs';
import { join, normalize, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const distDir = join(process.cwd(), 'dist');
const indexPath = join(distDir, 'index.html');
const budgets = {
  entry: { raw: 512 * 1024, gzip: 150 * 1024 },
  styles: { raw: 256 * 1024, gzip: 45 * 1024 },
};

function fail(message) {
  console.error(`[bundle-budget] ${message}`);
  process.exitCode = 1;
}

function resolveDistAsset(assetPath) {
  const normalizedPath = normalize(String(assetPath || '').replace(/^[/\\]+/, ''));
  const resolvedPath = join(distDir, normalizedPath);
  if (relative(distDir, resolvedPath).startsWith('..')) {
    throw new Error(`Asset path escapes dist: ${assetPath}`);
  }
  return resolvedPath;
}

function checkAsset(label, assetPath, budget) {
  const filePath = resolveDistAsset(assetPath);
  if (!existsSync(filePath)) {
    fail(`${label} asset not found: ${assetPath}`);
    return;
  }

  const bytes = readFileSync(filePath);
  const rawSize = bytes.length;
  const gzipSize = gzipSync(bytes).length;
  console.log(
    `[bundle-budget] ${label}: ${(rawSize / 1024).toFixed(1)} KiB raw, ${(gzipSize / 1024).toFixed(1)} KiB gzip`,
  );

  if (rawSize > budget.raw) {
    fail(`${label} raw size exceeds ${(budget.raw / 1024).toFixed(0)} KiB budget.`);
  }
  if (gzipSize > budget.gzip) {
    fail(`${label} gzip size exceeds ${(budget.gzip / 1024).toFixed(0)} KiB budget.`);
  }
}

if (!existsSync(indexPath)) {
  fail('dist/index.html not found. Run "npm run build" first.');
} else {
  const html = readFileSync(indexPath, 'utf8');
  const entryPath = html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
  const stylesheetPath = html.match(/<link[^>]+href="([^"]+\.css)"/)?.[1];

  if (!entryPath) fail('Entry script was not found in dist/index.html.');
  else checkAsset('entry', entryPath, budgets.entry);

  if (!stylesheetPath) fail('Stylesheet was not found in dist/index.html.');
  else checkAsset('styles', stylesheetPath, budgets.styles);
}
