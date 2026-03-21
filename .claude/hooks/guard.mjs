// src/api/output.ts
var HOOK_OUTPUT_MARKER = Symbol.for("hx:HookOutput");

class HookOutput {
  [HOOK_OUTPUT_MARKER] = true;
  _decision;
  _reason;
  _context;
  _updatedInput;
  _updatedMCPToolOutput;
  _elicitationAction;
  _elicitationContent;
  _interrupt;
  _visible;
  visible() {
    this._visible = true;
    return this;
  }
  context(text) {
    this._context = text;
    return this;
  }
  input(updated) {
    this._updatedInput = updated;
    return this;
  }
  mcpOutput(data) {
    this._updatedMCPToolOutput = data;
    return this;
  }
  interrupt() {
    this._interrupt = true;
    return this;
  }
  _resolve(event) {
    switch (event) {
      case "PreToolUse":
        return {
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            ...this._decision !== undefined && { permissionDecision: this._decision },
            ...this._reason !== undefined && { permissionDecisionReason: this._reason },
            ...this._updatedInput !== undefined && { updatedInput: this._updatedInput },
            ...this._context !== undefined && { additionalContext: this._context }
          }
        };
      case "PostToolUse":
        return {
          hookSpecificOutput: {
            hookEventName: "PostToolUse",
            ...this._context !== undefined && { additionalContext: this._context },
            ...this._updatedMCPToolOutput !== undefined && {
              updatedMCPToolOutput: this._updatedMCPToolOutput
            }
          }
        };
      case "PermissionRequest": {
        if (this._decision === "deny") {
          return {
            hookSpecificOutput: {
              hookEventName: "PermissionRequest",
              decision: {
                behavior: "deny",
                ...this._reason !== undefined && { message: this._reason },
                ...this._interrupt === true && { interrupt: true }
              }
            }
          };
        }
        if (this._decision === "allow") {
          return {
            hookSpecificOutput: {
              hookEventName: "PermissionRequest",
              decision: {
                behavior: "allow",
                ...this._updatedInput !== undefined && {
                  updatedInput: this._updatedInput
                }
              }
            }
          };
        }
        return {};
      }
      case "Elicitation":
      case "ElicitationResult":
        return {
          hookSpecificOutput: {
            hookEventName: event,
            ...this._elicitationAction !== undefined && { action: this._elicitationAction },
            ...this._elicitationContent !== undefined && {
              content: this._elicitationContent
            }
          }
        };
      case "PostToolUseFailure":
      case "UserPromptSubmit":
      case "SessionStart":
      case "Setup":
      case "SubagentStart":
      case "Notification":
        if (this._context !== undefined) {
          return {
            hookSpecificOutput: {
              hookEventName: event,
              additionalContext: this._context
            }
          };
        }
        return {};
      default:
        return {};
    }
  }
}
function isHookOutput(value) {
  return typeof value === "object" && value !== null && HOOK_OUTPUT_MARKER in value;
}
function deny(reason) {
  const out = new HookOutput;
  out._decision = "deny";
  if (reason !== undefined)
    out._reason = reason;
  return out;
}
function modifyInput(input) {
  const out = new HookOutput;
  out._updatedInput = input;
  return out;
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
// .claude/extensions/guard/index.ts
var guard_default = defineExtension((cc) => {
  cc.on("PreToolUse", "Bash", async (input) => {
    if (input.tool_input.command?.match(/rm\s+-rf\s+\//)) {
      return deny("Destructive command blocked by hx");
    }
  });
  cc.on("PreToolUse", "Bash", async (input) => {
    const command = input.tool_input.command;
    if (command && /git\s+commit/.test(command)) {
      return modifyInput({
        ...input.tool_input,
        command: `bun run ci:check && bun test && ${command}`
      });
    }
  });
});

// hx-virtual:hx-virtual:guard.mjs
await runHook(guard_default);
