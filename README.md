# @dawkinsuke/hooks

Claude Code hooks toolkit — write hooks in TypeScript, compile to `settings.local.json`.

```
Write TypeScript extensions → hx build → hooks & settings ready
```

## Prerequisites

- [Bun](https://bun.sh/) v1.0.0 or later

## Install

```bash
bun install -g @dawkinsuke/hooks
```

## Quick Start

```bash
# Scaffold a new project with a sample extension
hx init

# Or create a new extension in an existing project
hx new my-guard

# Build all extensions
hx build
```

This generates `.claude/hooks/<name>.mjs` and merges hook entries into `.claude/settings.local.json`.

## Writing Extensions

Create a file in `.claude/extensions/<name>/index.ts`:

```typescript
import { defineExtension, deny } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	// Block dangerous Bash commands
	cc.on("PreToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.match(/rm\s+-rf\s+\//)) {
			return deny("Destructive command blocked")
		}
	})
})
```

## Four Hook Types

`@dawkinsuke/hooks` supports four ways to register hooks:

```typescript
import { defineExtension, HookBlockError, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	// ── cc.on() — Command hook (compiled to .mjs) ──
	cc.on("PreToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.includes("rm -rf /")) {
			throw new HookBlockError("Destructive command blocked")
		}

		return addContext(`Bash command: ${input.tool_input.command}`)
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
```

| Type    | Method        | Compiled | Use Case                                                               |
| ------- | ------------- | -------- | ---------------------------------------------------------------------- |
| Command | `cc.on()`     | `.mjs`   | Programmatic logic with full Bun access                                |
| HTTP    | `cc.http()`   | No       | Forward events to an external webhook                                  |
| Prompt  | `cc.prompt()` | No       | LLM single-turn evaluation (PreToolUse/PostToolUse/PermissionRequest)  |
| Agent   | `cc.agent()`  | No       | LLM multi-turn verification (PreToolUse/PostToolUse/PermissionRequest) |

## Key Concepts

### Output Helpers

Instead of constructing raw `hookSpecificOutput` objects, use helper functions:

| Helper               | Effect                                 | Events                         |
| -------------------- | -------------------------------------- | ------------------------------ |
| `deny(reason?)`      | Block tool / deny permission           | PreToolUse, PermissionRequest  |
| `allow(reason?)`     | Auto-approve tool / grant permission   | PreToolUse, PermissionRequest  |
| `ask(reason?)`       | Prompt user for confirmation           | PreToolUse                     |
| `addContext(text)`   | Inject text into Claude's conversation | Most events                    |
| `modifyInput(input)` | Rewrite tool input                     | PreToolUse, PermissionRequest  |
| `accept(content?)`   | Accept elicitation                     | Elicitation, ElicitationResult |
| `decline()`          | Decline elicitation                    | Elicitation, ElicitationResult |
| `cancel()`           | Cancel elicitation                     | Elicitation, ElicitationResult |

Helpers are chainable for compound outputs:

```typescript
// deny + inject context
return deny("Dangerous").context("See docs for allowed commands")

// allow + rewrite input + inject context
return allow().input({ command: "ls -la" }).context("Modified for safety")

// deny + interrupt session (PermissionRequest)
return deny("Not allowed").interrupt()
```

Raw `HookJSONOutput` objects are still accepted for backward compatibility.

### `HookBlockError`

An alternative way to block tool execution — throw instead of returning `deny()`:

```typescript
import { defineExtension, HookBlockError } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.includes("DROP TABLE")) {
			throw new HookBlockError("SQL DROP TABLE blocked")
		}
	})
})
```

### Matcher vs NoMatcher Events

Most events support a matcher for conditional execution (regex on tool name, source, etc.).
Pass it as a string or an options object:

```typescript
cc.on("PreToolUse", "Bash", async (input) => { ... })               // string shorthand
cc.on("PreToolUse", { matcher: "Bash", timeout: 30 }, async (input) => { ... })  // options object
cc.on("SessionStart", "startup", async (input) => { ... })
```

**NoMatcherEvents** always fire — the matcher option is not available:
`UserPromptSubmit`, `Stop`, `TeammateIdle`, `TaskCompleted`, `WorktreeCreate`, `WorktreeRemove`

```typescript
cc.on("UserPromptSubmit", async (input) => { ... })
cc.on("Stop", async (input) => { ... })
```

## CLI

```
hx build              Build all enabled extensions
hx init               Create .claude/extensions/ with a sample extension
hx new <name>         Scaffold a new extension
hx list               List all extensions and their status
hx activate           Toggle extensions on/off (interactive)
hx update             Update hx to the latest version
hx clean              Remove all hx artifacts
hx completions        Generate shell completion scripts
```

Options:

- `--latest` — Install from GitHub main branch (bleeding edge, for `hx update`)

### Shell Completions

```bash
hx completions zsh > ~/.zsh/completions/_hx
```

## Examples

See [`examples/`](./examples/) for 16 copy-ready extensions covering every hook pattern:

| #   | Example              | Pattern                                    |
| --- | -------------------- | ------------------------------------------ |
| 01  | `deny-command`       | PreToolUse — block with `deny()`           |
| 02  | `additional-context` | PreToolUse — inject with `addContext()`    |
| 03  | `allow-command`      | PreToolUse — auto-approve with `allow()`   |
| 04  | `updated-input`      | PreToolUse — rewrite with `modifyInput()`  |
| 05  | `post-tool-use`      | PostToolUse — annotate with `addContext()` |
| 06  | `user-prompt-submit` | UserPromptSubmit — NoMatcherEvent          |
| 07  | `session-start`      | SessionStart — inject project info         |
| 08  | `notification`       | Notification — handle notifications        |
| 09  | `permission-request` | PermissionRequest — `deny()` / `allow()`   |
| 10  | `hook-block-error`   | HookBlockError — block via throw           |
| 11  | `stop`               | Stop — override stop behavior              |
| 12  | `elicitation`        | Elicitation — `accept()` / `decline()`     |
| 13  | `http-hook`          | `cc.http()` — declarative HTTP webhook     |
| 14  | `prompt-hook`        | `cc.prompt()` — LLM single-turn evaluation |
| 15  | `agent-hook`         | `cc.agent()` — LLM multi-turn verification |
| 16  | `mixed`              | All hook types in one extension            |

Copy any example into your project:

```bash
cp -r examples/01-deny-command .claude/extensions/deny-command
hx build
```

## How It Works

```
.claude/extensions/my-ext/index.ts    # You write this
        ↓ hx build
.claude/hooks/my-ext.mjs              # Compiled hook script (one per extension)
.claude/settings.local.json           # Hook entries merged in
        ↓ Claude Code reads
Hooks fire on tool use, prompts, sessions, etc.
```

1. **Discover** — Find all `.ts` files in `.claude/extensions/`
2. **Collect** — Execute the factory to record hook registrations
3. **Bundle** — Compile to a single `.mjs` per extension via Bun.build (in-memory, no intermediate files)
4. **Merge** — Write hook entries into `settings.local.json` (hx-managed hooks are tagged and never touch user hooks)

Each settings entry invokes the same `.mjs` with event/matcher as CLI args:

```
bun .claude/hooks/my-ext.mjs PreToolUse Bash
```

## Acknowledgments

This project was inspired by [pi-mono](https://github.com/badlogic/pi-mono) by Mario Zechner — particularly the coding-agent extension system. The TypeScript-first, event-driven hook architecture in hx-cli is built with great respect for pi's design.

## License

MIT
