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

Optionally, install the Claude Code plugin so Claude can create hooks for you in natural language:

```bash
# In Claude Code
/plugin marketplace add ashigirl96/hx-cli
/plugin install hook-creator@dawkinsuke-hx-cli
```

## Quick Start

### Option A: Scaffold manually

```bash
hx init        # creates .claude/extensions/guard/index.ts
hx build       # compiles to .claude/hooks/ and updates settings.local.json
```

### Option B: Let Claude create hooks for you

With the plugin installed, just ask in natural language:

```
> Create a hook that blocks git push
> Create a hook that runs tests before every git commit
> Create a hook that injects project info at session start
```

Claude will scaffold the extension, write the TypeScript, and run `hx build`.

## Writing Extensions

Create `.claude/extensions/<name>/index.ts` (or use `hx new <name>` to scaffold):

```typescript
import { defineExtension, deny, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	// Command hook — compiled to .mjs, full Bun runtime access
	cc.on("PreToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.match(/rm\s+-rf\s+\//)) {
			return deny("Destructive command blocked")
		}
	})

	// HTTP hook — POST to a URL on events (declarative, not compiled)
	cc.http("PostToolUse", {
		matcher: "Bash",
		url: "http://localhost:8080/audit",
		timeout: 5,
	})

	// Prompt hook — single-turn LLM evaluation (declarative)
	cc.prompt("PreToolUse", {
		matcher: "Edit",
		prompt: "Ensure the edit does not introduce security vulnerabilities.",
	})

	// Agent hook — multi-turn LLM verification (declarative)
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

## Output Helpers

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

Helpers are chainable:

```typescript
deny("Dangerous").context("See docs for allowed commands")
allow().input({ command: "ls -la" }).context("Modified for safety")
addContext("warning").visible() // macOS notification
```

## Examples

See [`examples/`](./examples/) for 16 copy-ready extensions covering every hook pattern.

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
3. **Bundle** — Compile to a single `.mjs` per extension via Bun.build
4. **Merge** — Write hook entries into `settings.local.json` (hx-managed hooks are tagged and never touch user hooks)

## Acknowledgments

This project was inspired by [pi-mono](https://github.com/badlogic/pi-mono) by Mario Zechner — particularly the coding-agent extension system.

## License

MIT
