# Complete Examples

All 16 examples from hx-cli. Each is a self-contained extension you can copy into `.claude/extensions/`.

---

## 01 — Deny Command (PreToolUse)

Block dangerous commands with `deny()`.

```typescript
import { defineExtension, deny } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.match(/rm\s+-rf\s+\//)) {
			return deny("Destructive rm -rf / command blocked")
		}
	})
})
```

## 02 — Additional Context (PreToolUse)

Inject context without blocking execution.

```typescript
import { defineExtension, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", async (input) => {
		return addContext(
			`Tool "${input.tool_name}" is being used. Remember to follow project conventions.`,
		)
	})
})
```

## 03 — Allow Command (PreToolUse)

Auto-approve safe commands without user confirmation.

```typescript
import { defineExtension, allow } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		const safeCommands = ["ls", "pwd", "echo", "date", "whoami"]
		const firstWord = input.tool_input.command?.trim().split(/\s/)[0]
		if (firstWord && safeCommands.includes(firstWord)) {
			return allow(`"${firstWord}" is in the safe command list`)
		}
	})
})
```

## 04 — Updated Input (PreToolUse)

Rewrite tool input before execution.

```typescript
import { defineExtension, modifyInput } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		const command = input.tool_input.command as string | undefined
		if (command?.startsWith("curl ") && !command.includes("--max-time")) {
			return modifyInput({ ...input.tool_input, command: `${command} --max-time 10` })
		}
	})
})
```

## 05 — Post Tool Use

Add context after tool execution.

```typescript
import { defineExtension, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PostToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.includes("git push")) {
			return addContext("git push was executed. Verify the CI pipeline status.")
		}
	})
})
```

## 06 — User Prompt Submit (NoMatcherEvent)

React to user input.

```typescript
import { defineExtension, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("UserPromptSubmit", async (input) => {
		if (input.prompt.toLowerCase().includes("deploy")) {
			return addContext("User mentioned deployment. Remind them to check staging first.")
		}
	})
})
```

## 07 — Session Start

Inject project info at session startup.

```typescript
import { defineExtension, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("SessionStart", "startup", async () => {
		const now = new Date().toISOString()
		return addContext(
			`Session started at ${now}. Project uses pnpm, Biome for lint, Vitest for tests.`,
		)
	})
})
```

## 08 — Notification

Handle notification events.

```typescript
import { defineExtension, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("Notification", async (input) => {
		return addContext(`Notification received: [${input.notification_type}] ${input.message}`)
	})
})
```

## 09 — Permission Request

Programmatic permission control.

```typescript
import { defineExtension, allow, deny } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PermissionRequest", "Bash", async (input) => {
		if (input.tool_input.command?.includes("npm publish")) {
			return deny("npm publish is not allowed from Claude Code.")
		}
		if (input.tool_input.command?.match(/^(bun|npm|pnpm|yarn)\s+test/)) {
			return allow()
		}
	})
})
```

## 10 — Hook Block Error

Block via exception (alternative to `deny()`).

```typescript
import { defineExtension, HookBlockError } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.includes("DROP TABLE")) {
			throw new HookBlockError("SQL DROP TABLE detected — operation blocked.")
		}
	})
})
```

## 11 — Stop (NoMatcherEvent)

Override stop behavior.

```typescript
import { defineExtension } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("Stop", async (_input) => {
		return { continue: true, stopReason: "Hook requested continuation" }
	})
})
```

## 12 — Elicitation (NoMatcherEvent)

Handle MCP elicitation requests.

```typescript
import { defineExtension, accept, decline } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("Elicitation", async (input) => {
		if (!input.requested_schema) {
			return decline()
		}
		return accept({ confirmed: true })
	})
})
```

## 13 — HTTP Hook (Declarative)

Send POST to a webhook URL on events.

```typescript
import { defineExtension } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.http("PostToolUse", {
		matcher: "Bash",
		url: "http://localhost:8080/hooks/post-tool-use",
		headers: { Authorization: "Bearer ${HOOK_AUTH_TOKEN}" },
		timeout: 5,
		statusMessage: "Sending tool usage to webhook...",
	})
})
```

## 14 — Prompt Hook (Declarative)

Single-turn LLM evaluation.

```typescript
import { defineExtension } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.prompt("PreToolUse", {
		matcher: "Edit|Write",
		prompt:
			"Check if this file edit follows the project's coding standards. " +
			"If the edit introduces console.log or debugger statements, deny it.",
		model: "claude-sonnet-4-6",
		timeout: 10,
		statusMessage: "Checking code quality...",
	})
})
```

## 15 — Agent Hook (Declarative)

Multi-turn LLM verification.

```typescript
import { defineExtension } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.agent("PostToolUse", {
		matcher: "Write",
		prompt:
			"Verify the written file is valid. " +
			"Read the file, check for syntax errors, and ensure it matches the project conventions.",
		model: "claude-sonnet-4-6",
		timeout: 30,
		statusMessage: "Verifying written file...",
	})
})
```

## 16 — Mixed (All Types)

Combine multiple hook types in one extension.

```typescript
import { defineExtension, HookBlockError, addContext } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("PreToolUse", "Bash", async (input) => {
		if (input.tool_input.command?.includes("rm -rf /")) {
			throw new HookBlockError("Destructive command blocked")
		}
		return addContext(`Bash command: ${input.tool_input.command}`)
	})

	cc.on("PreToolUse", async (input) => {
		return addContext(`Tool "${input.tool_name}" invoked`)
	})

	cc.on("UserPromptSubmit", async (input) => {
		if (input.prompt.length > 10000) {
			return addContext("Warning: very long prompt submitted")
		}
	})

	cc.http("PostToolUse", {
		matcher: "Bash",
		url: "http://localhost:8080/audit",
		timeout: 5,
	})

	cc.prompt("PreToolUse", {
		matcher: "Edit",
		prompt: "Ensure the edit does not introduce security vulnerabilities.",
	})

	cc.agent("PostToolUse", {
		matcher: "Write",
		prompt: "Verify the file is syntactically correct.",
	})
})
```
