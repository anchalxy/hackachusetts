// PreToolUse guard: blocks agent tool calls that read, write, move, delete, or stage
// .env / .env.local (and other .env.* files except .env.example).
// Exit 2 = block (stderr is shown to the agent). Exit 0 = allow.

const PATH_KEYS = new Set([
  'path',
  'targetFile',
  'sourcePath',
  'destinationPath',
  'includePattern',
  'query', // file_search query
  'cwd',
]);
const COMMAND_KEYS = new Set(['command']);

// Matches a filename that is a dotenv file: .env, .env.local, .env.production, ...
// .env.example / .env.sample stay allowed because they are meant to be shared.
const isEnvName = (name) =>
  /^\.env(\.[\w-]+)?$/.test(name) && !/^\.env\.(example|sample|template)$/.test(name);

const pathHitsEnv = (value) =>
  value
    .split(/[\\/]/)
    .some((segment) => isEnvName(segment.replace(/^\*+/, '').replace(/\*+$/, '')));

// In shell commands, `.env` must be a standalone token or path segment, so
// `process.env.FOO` (preceded by a word char) does not match.
const commandHitsEnv = (cmd) => {
  const re = /(?:^|[\s'"`/=<>(|;&])(\.env(?:\.[\w-]+)?)(?=$|[\s'"`;|&)<>])/g;
  for (const match of cmd.matchAll(re)) {
    if (isEnvName(match[1])) return match[1];
  }
  return null;
};

const findings = [];

const walk = (node, key) => {
  if (typeof node === 'string') {
    if (key && PATH_KEYS.has(key) && pathHitsEnv(node)) findings.push(`${key}: ${node}`);
    if (key && COMMAND_KEYS.has(key)) {
      const hit = commandHitsEnv(node);
      if (hit) findings.push(`command references ${hit}`);
    }
    return;
  }
  if (Array.isArray(node)) return node.forEach((item) => walk(item, key));
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walk(v, k);
  }
};

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    process.exit(0); // Unparseable input: don't block unrelated work.
  }
  walk(payload);
  if (findings.length) {
    process.stderr.write(
      `Blocked: this tool call touches a dotenv file (${findings.join('; ')}).\n` +
        'Secrets like ANTHROPIC_API_KEY live there. Reference variables by name instead, ' +
        'or ask the user to edit the file themselves.\n',
    );
    process.exit(2);
  }
  process.exit(0);
});
