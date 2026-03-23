// src/api/output.ts
var HOOK_OUTPUT_MARKER = Symbol.for("hx:HookOutput");
function isHookOutput(value) {
  return typeof value === "object" && value !== null && HOOK_OUTPUT_MARKER in value;
}

// src/runtime.ts
class HookBlockError extends Error {
  constructor(reason) {
    super(reason);
    this.name = "HookBlockError";
  }
}
async function runHook(factory) {
  const targetEvent = process.argv[2];
  const targetMatcher = process.argv[3] || undefined;
  if (!targetEvent) {
    process.stderr.write(`Usage: <script> <event> [matcher]
`);
    process.exit(1);
  }
  const handlers = [];
  const api = {
    on(event, ...args) {
      let matcher;
      let handler;
      if (args.length >= 2 && typeof args[0] === "string") {
        matcher = args[0];
        handler = args[1];
      } else if (args.length >= 2 && typeof args[0] === "object" && args[0] !== null) {
        const opts = args[0];
        matcher = opts.matcher;
        handler = args[1];
      } else {
        handler = args[0];
      }
      if (event === targetEvent && matcher === targetMatcher) {
        handlers.push(handler);
      }
    },
    http() {},
    prompt() {},
    agent() {}
  };
  await factory(api);
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  const input = raw ? JSON.parse(raw) : {};
  let result;
  try {
    for (const handler of handlers) {
      const r = await handler(input);
      if (r !== undefined && r !== null) {
        result = r;
      }
    }
  } catch (err) {
    if (err instanceof HookBlockError) {
      process.stderr.write(err.message);
      process.exit(2);
    }
    throw err;
  }
  if (result === undefined || result === null) {
    return;
  }
  if (typeof result === "string") {
    process.stdout.write(result);
  } else if (isHookOutput(result)) {
    if (result._visible && result._context) {
      try {
        const msg = result._context.replaceAll('"', "\\\"");
        const script = `display notification "${msg}" with title "hx"`;
        await Bun.$`osascript -e ${script}`.quiet();
      } catch {}
    }
    const resolved = result._resolve(targetEvent);
    process.stdout.write(JSON.stringify(resolved));
  } else {
    process.stdout.write(JSON.stringify(result));
  }
}

// src/api/extension-api.ts
function defineExtension(factory) {
  return factory;
}
// .claude/extensions/worktree-setup/index.ts
import { existsSync } from "node:fs";
var worktree_setup_default = defineExtension((cc) => {
  cc.on("WorktreeCreate", async (input) => {
    const root = input.cwd;
    const name = input.name;
    const worktreeDir = `${root}/.worktrees/${name}`;
    if (existsSync(worktreeDir))
      return worktreeDir;
    await Bun.$`git worktree add -b ${name} ${worktreeDir} 1>&2`;
    await Bun.$`ln -sf "${root}/.envrc" "${worktreeDir}/.envrc" 1>&2`;
    await Bun.$`cd ${worktreeDir} && bun install 1>&2`;
    return worktreeDir;
  });
});

// hx-virtual:hx-virtual:worktree-setup.mjs
await runHook(worktree_setup_default);
