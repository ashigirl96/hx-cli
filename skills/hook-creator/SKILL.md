---
name: hook-creator
description: >
  Create Claude Code hooks using hx-cli and the @dawkinsuke/hooks TypeScript API.
  Use this skill whenever the user asks to create, add, or write a hook or extension
  for Claude Code — including requests like "〇〇のhookを作成して", "create a hook that blocks X",
  "add a PreToolUse guard", "write an extension for Y", or any mention of hx-cli hooks,
  Claude Code hooks, or .claude/extensions. Also trigger when users describe behaviors they want
  to enforce, block, or automate in Claude Code sessions — these are hooks even if the user
  doesn't use the word "hook".
---

# Hook Creator

Create Claude Code hooks using hx-cli and the `@dawkinsuke/hooks` TypeScript API.

## Workflow

Every hook follows this sequence:

1. **Understand the intent** — What event? What condition? What action?
2. **Choose the hook type** — command (`cc.on`), HTTP, prompt, or agent
3. **Create the extension** — `hx new <name>` then write the TypeScript
4. **Build** — `hx build` compiles to `.mjs` and updates `settings.local.json`
5. **Verify** — Test the hook triggers correctly

## Step 1: Understand the Intent

Ask yourself three questions about the user's request:

| Question                         | Maps to                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| **When** should this fire?       | Hook event (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, etc.) |
| **Which tool** does it apply to? | Matcher (`"Bash"`, `"Edit"`, `"Write"`, `"Edit\|Write"`, or none)  |
| **What** should happen?          | Output helper (`deny`, `allow`, `addContext`, `modifyInput`, etc.) |

### Choosing the Event

| User wants to...                      | Event               | Matcher?                            |
| ------------------------------------- | ------------------- | ----------------------------------- |
| Block or modify a tool before it runs | `PreToolUse`        | Yes — tool name                     |
| React after a tool finishes           | `PostToolUse`       | Yes — tool name                     |
| Control permission prompts            | `PermissionRequest` | Yes — tool name                     |
| React to user input                   | `UserPromptSubmit`  | No (NoMatcherEvent)                 |
| Inject context at session start       | `SessionStart`      | Yes — `"startup"`, `"resume"`, etc. |
| Do something before Claude stops      | `Stop`              | No (NoMatcherEvent)                 |
| Handle MCP elicitation                | `Elicitation`       | No (NoMatcherEvent)                 |

For the complete event list with typed inputs, read `references/events-reference.md`.

### Choosing the Output

| User wants to...             | Helper                          | Import           |
| ---------------------------- | ------------------------------- | ---------------- |
| Block/reject                 | `deny(reason?)`                 | `deny`           |
| Auto-approve                 | `allow(reason?)`                | `allow`          |
| Ask user to confirm          | `ask(reason?)`                  | `ask`            |
| Add info to Claude's context | `addContext(text)`              | `addContext`     |
| Rewrite tool input           | `modifyInput(input)`            | `modifyInput`    |
| Block via exception          | `throw new HookBlockError(msg)` | `HookBlockError` |
| Accept elicitation           | `accept(content?)`              | `accept`         |
| Decline elicitation          | `decline()`                     | `decline`        |

All helpers are **chainable**:

```typescript
deny("reason").context("extra info")
allow().input({ command: "ls -la" }).context("modified")
addContext("warning message").visible() // shows macOS notification
```

## Step 2: Choose the Hook Type

Most hooks use `cc.on()` (command hooks). Use declarative types only when appropriate:

| Type        | Method        | When to use                                                                 |
| ----------- | ------------- | --------------------------------------------------------------------------- |
| **Command** | `cc.on()`     | Default choice — full TypeScript/Bun runtime, any logic                     |
| **HTTP**    | `cc.http()`   | Forward events to an external webhook URL                                   |
| **Prompt**  | `cc.prompt()` | LLM single-turn evaluation (PreToolUse/PostToolUse/PermissionRequest only)  |
| **Agent**   | `cc.agent()`  | LLM multi-turn verification (PreToolUse/PostToolUse/PermissionRequest only) |

## Step 3: Create the Extension

### Scaffold

```bash
hx new <name>
```

This creates `.claude/extensions/<name>/index.ts` with a bare template.

### Write the Code

The extension pattern is always:

```typescript
import { defineExtension /* helpers */ } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("<Event>", "<Matcher>", async (input) => {
		// Your logic here
		// Return a helper like deny(), allow(), addContext(), etc.
	})
})
```

#### Key patterns

**Pattern A: Guard — block dangerous operations**

```typescript
import { defineExtension, deny } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.match(/rm\s+-rf\s+\//)) {
			return deny("Destructive command blocked")
		}
	})
})
```

**Pattern B: Modify — rewrite tool input with `modifyInput()`**

`modifyInput()` is the idiomatic way to alter a command before execution. When you need to
"run X before Y" (e.g., run tests before commit), compose them with shell `&&` via `modifyInput`
rather than running them inline and using deny/addContext. The shell handles short-circuiting naturally.

```typescript
import { execSync } from "node:child_process"
import { defineExtension, modifyInput } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	// Prepend bun test before git commit when src/ files are staged
	cc.on("PreToolUse", "Bash", async (input) => {
		const command = input.tool_input.command as string | undefined
		if (!command || !/git\s+commit/.test(command)) return

		const staged = execSync("git diff --cached --name-only", { encoding: "utf-8" })
		const hasSrcChanges = staged
			.split("\n")
			.filter(Boolean)
			.some((f) => f.startsWith("src/"))

		if (hasSrcChanges) {
			return modifyInput({
				...input.tool_input,
				command: `bun test && ${command}`,
			})
		}
	})

	// Add --max-time to curl commands
	cc.on("PreToolUse", "Bash", async (input) => {
		const cmd = input.tool_input.command as string | undefined
		if (cmd?.startsWith("curl ") && !cmd.includes("--max-time")) {
			return modifyInput({ ...input.tool_input, command: `${cmd} --max-time 10` })
		}
	})
})
```

**Pattern C: Context injection — add info to Claude**

```typescript
import { defineExtension, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("SessionStart", "startup", async () => {
		return addContext("This project uses Bun, Biome for lint, Vitest for tests.")
	})
})
```

**Pattern D: Conditional with external data**

```typescript
import { execSync } from "node:child_process"
import { defineExtension, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		if (!/git\s+commit/.test(input.tool_input.command ?? "")) return
		const staged = execSync("git diff --cached --name-only", { encoding: "utf-8" })
		if (staged.includes("src/") && !staged.includes("README.md")) {
			return addContext("src/ changed but README.md not staged. Consider updating it.").visible()
		}
	})
})
```

**Pattern E: NoMatcherEvent (no matcher parameter)**

```typescript
import { defineExtension, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("UserPromptSubmit", async (input) => {
		if (input.prompt.toLowerCase().includes("deploy")) {
			return addContext("Reminder: check staging before deploying.")
		}
	})
})
```

**Pattern F: Declarative hooks (HTTP/Prompt/Agent)**

```typescript
import { defineExtension } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	// HTTP webhook
	cc.http("PostToolUse", {
		matcher: "Bash",
		url: "http://localhost:8080/hooks/audit",
		timeout: 5,
	})

	// LLM-based code review
	cc.prompt("PreToolUse", {
		matcher: "Edit|Write",
		prompt: "Check if this edit follows coding standards. Deny if it has console.log or debugger.",
		model: "claude-sonnet-4-6",
	})

	// Multi-turn verification
	cc.agent("PostToolUse", {
		matcher: "Write",
		prompt: "Read the file, check for syntax errors, verify project conventions.",
		model: "claude-sonnet-4-6",
		timeout: 30,
	})
})
```

**Pattern G: Multiple hooks in one extension**

```typescript
import { defineExtension, deny, addContext, HookBlockError } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.includes("rm -rf /")) {
			return deny("Blocked")
		}
	})

	cc.on("UserPromptSubmit", async (input) => {
		if (input.prompt.length > 10000) {
			return addContext("Warning: very long prompt")
		}
	})
})
```

## Step 4: Build

```bash
hx build
```

This does three things:

1. Bundles each extension into `.claude/hooks/<name>.mjs`
2. Registers hook entries in `.claude/settings.local.json`
3. Updates `.claude/hooks/.manifest.json`

## Step 5: Verify

After building, confirm:

- `.claude/hooks/<name>.mjs` exists
- `settings.local.json` has the correct event/matcher entries
- Test by triggering the event in Claude Code

## Code Organization

When an extension involves non-trivial logic (reading config files, detecting environments, parsing
data), extract that logic into named helper functions above the `defineExtension` call. This keeps
each function's responsibility clear and the extension body readable.

```typescript
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { defineExtension, addContext } from "@dawkinsuke/hooks"

// ── Helpers ─────────────────────────────────────
function readJson(filePath: string): Record<string, any> | null {
	try {
		if (!existsSync(filePath)) return null
		return JSON.parse(readFileSync(filePath, "utf-8"))
	} catch {
		return null
	}
}

function detectTechStack(projectRoot: string): string[] {
	const stack: string[] = []
	const pkg = readJson(join(projectRoot, "package.json"))
	if (pkg) {
		const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
		if (allDeps["hono"]) stack.push("Framework: Hono")
		if (allDeps["@biomejs/biome"]) stack.push("Linter: Biome")
		// ... more detection
	}
	return stack
}

// ── Extension ───────────────────────────────────
export default defineExtension((cc) => {
	cc.on("SessionStart", "startup", async () => {
		const stack = detectTechStack(process.cwd())
		if (stack.length === 0) return
		return addContext(`## Tech Stack\n${stack.map((s) => `- ${s}`).join("\n")}`)
	})
})
```

This pattern — helpers first, extension body last — makes the code easy to scan and test.

## Important Notes

- Extensions live in `.claude/extensions/<name>/index.ts` (or `.claude/extensions/<name>.ts`)
- Extensions can import Node.js built-ins (`child_process`, `fs`, etc.) — the bundle has full Bun runtime access
- `.visible()` chain triggers a macOS notification via `osascript`
- Multiple `cc.on()` calls for the same event+matcher are allowed — they run sequentially, last non-void result wins
- `tool_input` is typed as `Record<string, any>` so you can access `.command`, `.file_path`, etc. directly
- NoMatcherEvents (`UserPromptSubmit`, `Stop`, `TeammateIdle`, `TaskCompleted`, `WorktreeCreate`, `WorktreeRemove`) do not accept a matcher parameter
- `cc.prompt()` and `cc.agent()` only work on `PreToolUse`, `PostToolUse`, and `PermissionRequest`

## Other CLI Commands

| Command         | Purpose                                        |
| --------------- | ---------------------------------------------- |
| `hx init`       | Scaffold project with a sample guard extension |
| `hx new <name>` | Create new extension                           |
| `hx build`      | Compile all extensions                         |
| `hx list`       | Show extension status (enabled/disabled)       |
| `hx activate`   | Toggle extensions on/off                       |
| `hx clean`      | Remove all hx-managed hooks                    |
| `hx update`     | Update hx-cli to latest                        |

## References

For the complete event type reference with all typed inputs, read `references/events-reference.md`.
For all 16 copy-ready example extensions, read `references/examples.md`.
