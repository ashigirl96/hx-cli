# clex

Claude Code Extension SDK — write hooks in TypeScript, compile to `settings.local.json`.

```
Write TypeScript extensions → clex build → hooks & settings ready
```

## Install

```bash
bun install -g clex
```

## Quick Start

```bash
# Scaffold a new project with a sample extension
clex init

# Or create a new extension in an existing project
clex new my-guard

# Build all extensions
clex build
```

This generates `.claude/hooks/dist/*.mjs` and merges hook entries into `.claude/settings.local.json`.

## Writing Extensions

Create a file in `.claude/extensions/<name>/index.ts`:

````typescript
import { defineExtension } from "clex"

export default defineExtension((cc) => {
  // Block dangerous Bash commands
  cc.on("PreToolUse", { matcher: "Bash" }, async (input) => {
    const toolInput = input.tool_input as Record<string, unknown>
    const command = toolInput?.command as string | undefined

    if (command?.match(/rm\s+-rf\s+\//)) {
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse" as const,
          permissionDecision: "deny" as const,
          permissionDecisionReason: "Destructive command blocked",
        },
      }
    }
  })
})
````

## Four Hook Types

clex supports four ways to register hooks:

````typescript
import { defineExtension, HookBlockError } from "clex"

export default defineExtension((cc) => {
  // ── cc.on() — Command hook (compiled to .mjs) ──
  cc.on("PreToolUse", { matcher: "Bash" }, async (input) => {
    const toolInput = input.tool_input as Record<string, unknown>
    const command = toolInput?.command as string | undefined

    if (command?.includes("rm -rf /")) {
      throw new HookBlockError("Destructive command blocked")
    }

    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse" as const,
        additionalContext: `Bash command: ${command}`,
      },
    }
  })

  // ── cc.http() — Declarative HTTP webhook ──
  cc.http("PostToolUse", {
    matcher: "Bash",
    url: "http://localhost:8080/audit",
    timeout: 5,
  })

  // ── cc.prompt() — Single-turn LLM evaluation ──
  cc.prompt("PreToolUse", {
    matcher: "Edit",
    prompt: "Ensure the edit does not introduce security vulnerabilities.",
  })

  // ── cc.agent() — Multi-turn LLM verification ──
  cc.agent("PostToolUse", {
    matcher: "Write",
    prompt: "Verify the file is syntactically correct.",
  })
})
````

| Type | Method | Compiled | Use Case |
|------|--------|----------|----------|
| Command | `cc.on()` | `.mjs` | Programmatic logic with full Node.js/Bun access |
| HTTP | `cc.http()` | No | Forward events to an external webhook |
| Prompt | `cc.prompt()` | No | LLM single-turn evaluation (PreToolUse/PostToolUse/PermissionRequest) |
| Agent | `cc.agent()` | No | LLM multi-turn verification (PreToolUse/PostToolUse/PermissionRequest) |

## Key Concepts

### `hookSpecificOutput`

Each event has its own output fields:

````typescript
// PreToolUse — control permissions and rewrite input
{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny" | "allow" | "ask",
    permissionDecisionReason: "...",
    updatedInput: { command: "sanitized ..." },
    additionalContext: "Injected into Claude's context",
  }
}

// PostToolUse — annotate results
{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: "git push was executed. Check CI.",
  }
}

// PermissionRequest — programmatic allow/deny
{
  hookSpecificOutput: {
    hookEventName: "PermissionRequest",
    decision: { behavior: "deny", message: "Not allowed" },
  }
}
````

### `additionalContext`

Return `additionalContext` in `hookSpecificOutput` to inject text into Claude's conversation as a system-reminder. Available on most events. Without `permissionDecision`, tool execution is not blocked.

### `HookBlockError`

A concise way to block tool execution — throw instead of returning `hookSpecificOutput`:

````typescript
import { defineExtension, HookBlockError } from "clex"

export default defineExtension((cc) => {
  cc.on("PreToolUse", { matcher: "Bash" }, async (input) => {
    const toolInput = input.tool_input as Record<string, unknown>
    if ((toolInput?.command as string)?.includes("DROP TABLE")) {
      throw new HookBlockError("SQL DROP TABLE blocked")
    }
  })
})
````

### Matcher vs NoMatcher Events

Most events support `{ matcher: "pattern" }` for conditional execution (regex on tool name, source, etc.):

````typescript
cc.on("PreToolUse", { matcher: "Bash" }, async (input) => { ... })
cc.on("SessionStart", { matcher: "startup" }, async (input) => { ... })
````

**NoMatcherEvents** always fire — the matcher option is not available:
`UserPromptSubmit`, `Stop`, `TeammateIdle`, `TaskCompleted`, `WorktreeCreate`, `WorktreeRemove`

````typescript
cc.on("UserPromptSubmit", async (input) => { ... })
cc.on("Stop", async (input) => { ... })
````

## CLI

```
clex build              Build all enabled extensions
clex init               Create .claude/extensions/ with a sample extension
clex new <name>         Scaffold a new extension
clex list               List all extensions and their status
clex enable <name>      Enable an extension and rebuild
clex disable <name>     Disable an extension and rebuild
clex clean              Remove all clex artifacts
```

Options:
- `--runtime, -r` — Runtime for hooks: `"bun"` or `"node"` (auto-detected)

## Examples

See [`examples/`](./examples/) for 16 copy-ready extensions covering every hook pattern:

| # | Example | Pattern |
|---|---------|---------|
| 01 | `deny-command` | PreToolUse — block with `permissionDecision: "deny"` |
| 02 | `additional-context` | PreToolUse — inject context with `additionalContext` |
| 03 | `allow-command` | PreToolUse — auto-approve with `permissionDecision: "allow"` |
| 04 | `updated-input` | PreToolUse — rewrite input with `updatedInput` |
| 05 | `post-tool-use` | PostToolUse — annotate after execution |
| 06 | `user-prompt-submit` | UserPromptSubmit — NoMatcherEvent |
| 07 | `session-start` | SessionStart — inject project info |
| 08 | `notification` | Notification — handle notifications |
| 09 | `permission-request` | PermissionRequest — programmatic allow/deny |
| 10 | `hook-block-error` | HookBlockError — block via throw |
| 11 | `stop` | Stop — override stop behavior |
| 12 | `elicitation` | Elicitation — handle MCP elicitations |
| 13 | `http-hook` | `cc.http()` — declarative HTTP webhook |
| 14 | `prompt-hook` | `cc.prompt()` — LLM single-turn evaluation |
| 15 | `agent-hook` | `cc.agent()` — LLM multi-turn verification |
| 16 | `mixed` | All hook types in one extension |

Copy any example into your project:

```bash
cp -r examples/01-deny-command .claude/extensions/deny-command
clex build
```

## How It Works

```
.claude/extensions/my-ext/index.ts    # You write this
        ↓ clex build
.claude/hooks/dist/my-ext/*.mjs       # Compiled hook scripts
.claude/settings.local.json           # Hook entries merged in
        ↓ Claude Code reads
Hooks fire on tool use, prompts, sessions, etc.
```

1. **Discover** — Find all `.ts` files in `.claude/extensions/`
2. **Collect** — Execute the factory to record hook registrations
3. **Codegen** — Generate entry `.ts` files for each (event, matcher) pair
4. **Bundle** — Compile to `.mjs` via Bun.build
5. **Merge** — Write hook entries into `settings.local.json` (clex-managed hooks are tagged and never touch user hooks)

## License

MIT
