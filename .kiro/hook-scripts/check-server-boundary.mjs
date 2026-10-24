// Keeps server-only code out of the app bundle.
// Client code (anything in src/ that isn't an Expo Router API route) must not:
//   - import @anthropic-ai/sdk
//   - import from scripts/agendas (the offline Node pipeline)
//   - read process.env.ANTHROPIC_* (server secrets)
//
// Modes:
//   node check-server-boundary.mjs scan  -> scan all of src/ (PostFileSave)
//   node check-server-boundary.mjs pre   -> check a proposed agent edit from stdin (PreToolUse)
// Exit 2 = violation (blocks in PreToolUse), exit 0 = clean.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const RULES = [
  {
    re: /(?:from\s+|require\(\s*|import\(\s*)['"]@anthropic-ai\/sdk(?:\/[^'"]*)?['"]/,
    why: 'imports @anthropic-ai/sdk',
  },
  {
    re: /(?:from\s+|require\(\s*|import\(\s*)['"][^'"]*scripts\/agendas[^'"]*['"]/,
    why: 'imports from scripts/agendas (offline pipeline)',
  },
  { re: /process\.env\.ANTHROPIC_\w*|process\.env\[\s*['"]ANTHROPIC_/, why: 'reads process.env.ANTHROPIC_*' },
];

// Server-side files: API routes (+api.ts) and anything under src/app/api/.
const isServerFile = (relPath) => {
  const p = relPath.split(sep).join('/');
  return p.startsWith('src/app/api/') || /\+api\.(ts|tsx|js|jsx)$/.test(p);
};
const isClientCode = (relPath) => {
  const p = relPath.split(sep).join('/');
  return p.startsWith('src/') && CODE_FILE.test(p) && !isServerFile(p);
};

const violationsIn = (text) => {
  const out = [];
  text.split('\n').forEach((line, i) => {
    for (const rule of RULES) if (rule.re.test(line)) out.push({ line: i + 1, why: rule.why, code: line.trim() });
  });
  return out;
};

const report = (items) => {
  process.stderr.write(
    'Server-only code leaked into the app bundle:\n' +
      items.map((v) => `  ${v.file}${v.line ? `:${v.line}` : ''}  ${v.why}\n    ${v.code}`).join('\n') +
      '\nMove this into a src/app/api/*+api.ts route and call it with fetch instead.\n',
  );
  process.exit(2);
};

const walkDir = (dir, acc = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkDir(full, acc);
    else acc.push(full);
  }
  return acc;
};

const scan = () => {
  const hits = [];
  for (const full of walkDir(SRC)) {
    const rel = relative(ROOT, full);
    if (!isClientCode(rel)) continue;
    for (const v of violationsIn(readFileSync(full, 'utf8'))) hits.push({ file: rel, ...v });
  }
  if (hits.length) report(hits);
  process.exit(0);
};

// PreToolUse: find the target path and the new content in the tool input.
// The payload shape isn't fixed, so collect by key name anywhere in the JSON.
const pre = (raw) => {
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    process.exit(0);
  }
  const paths = [];
  const contents = [];
  const walk = (node, key) => {
    if (typeof node === 'string') {
      if (key === 'path' || key === 'targetFile') paths.push(node);
      if (key === 'text' || key === 'newStr') contents.push(node);
      return;
    }
    if (Array.isArray(node)) return node.forEach((n) => walk(n, key));
    if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, k);
  };
  walk(payload);

  const hits = [];
  for (const p of paths) {
    const rel = p.startsWith('/') ? relative(ROOT, p) : p;
    if (!isClientCode(rel)) continue;
    for (const text of contents) for (const v of violationsIn(text)) hits.push({ file: rel, why: v.why, code: v.code });
  }
  if (hits.length) report(hits);
  process.exit(0);
};

if (process.argv[2] === 'pre') {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => (raw += c));
  process.stdin.on('end', () => pre(raw));
} else {
  scan();
}
