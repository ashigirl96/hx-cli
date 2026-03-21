# Hook Events Reference

## Matcher-Supported Events

These events accept an optional `matcher` parameter to filter by tool name or source.

### PreToolUse

**When:** Before a tool executes.
**Matcher:** Tool name (`"Bash"`, `"Edit"`, `"Write"`, `"Read"`, `"Glob"`, `"Grep"`, `"Agent"`, `"Edit|Write"`, etc.)
**Input fields:**

- `tool_name: string` — the tool being invoked
- `tool_input: Record<string, any>` — tool parameters (e.g., `.command` for Bash, `.file_path` for Edit/Write/Read)
  **Available outputs:** `deny()`, `allow()`, `ask()`, `addContext()`, `modifyInput()`, `HookBlockError`

### PostToolUse

**When:** After a tool finishes successfully.
**Matcher:** Tool name
**Input fields:**

- `tool_name: string`
- `tool_input: Record<string, any>`
- `tool_result: unknown` — the tool's output
  **Available outputs:** `addContext()`, `.mcpOutput(data)` to rewrite MCP tool output

### PostToolUseFailure

**When:** After a tool fails.
**Matcher:** Tool name
**Input fields:**

- `tool_name: string`
- `tool_input: Record<string, any>`
- `error: string`
  **Available outputs:** `addContext()`

### PermissionRequest

**When:** When Claude requests permission to use a tool.
**Matcher:** Tool name
**Input fields:**

- `tool_name: string`
- `tool_input: Record<string, any>`
  **Available outputs:** `deny(reason?)`, `allow()`, `allow().input({...})`, `deny().interrupt()`

### SessionStart

**When:** Session starts.
**Matcher:** Source — `"startup"`, `"resume"`, `"clear"`, `"compact"`
**Input fields:**

- `source: string`
  **Available outputs:** `addContext()`

### SessionEnd

**When:** Session ends.
**Matcher:** Source
**Input fields:**

- `source: string`

### Notification

**When:** A notification event fires.
**Matcher:** Notification type
**Input fields:**

- `notification_type: string`
- `message: string`
  **Available outputs:** `addContext()`

### SubagentStart / SubagentStop

**When:** A subagent starts or stops.
**Matcher:** Subagent type
**Available outputs:** `addContext()` (SubagentStart only)

### PreCompact / PostCompact

**When:** Before/after context compaction.
**Matcher:** Source

### StopFailure

**When:** Claude fails to stop gracefully.
**Matcher:** Source

### Setup

**When:** Initial setup event.
**Matcher:** Source
**Available outputs:** `addContext()`

### ConfigChange

**When:** Configuration changes.
**Matcher:** Config key

### InstructionsLoaded

**When:** Instructions (CLAUDE.md etc.) are loaded.
**Matcher:** Source

---

## NoMatcher Events

These events always fire — the `matcher` option is not available.

### UserPromptSubmit

**When:** The user submits a prompt.
**Input fields:**

- `prompt: string` — the user's input text
  **Available outputs:** `addContext()`

### Stop

**When:** Claude is about to stop.
**Input fields:**

- `reason: string`
  **Available outputs:** Return `{ continue: true }` to cancel the stop, `{ stopReason: "..." }` to override reason

### TeammateIdle

**When:** A teammate agent is idle (in multi-agent setups).

### TaskCompleted

**When:** A task completes.

### WorktreeCreate

**When:** A git worktree is created.
**Special:** Handler can return a `string` (path) instead of `HookOutput`.

### WorktreeRemove

**When:** A git worktree is removed.

### Elicitation

**When:** An MCP server sends an elicitation (user input) request.
**Input fields:**

- `requested_schema: unknown`
  **Available outputs:** `accept(content?)`, `decline()`, `cancel()`

### ElicitationResult

**When:** After an elicitation result is received.
**Available outputs:** `accept()`, `decline()`, `cancel()`

---

## Common Tool Names for Matchers

| Matcher   | Tool             | `tool_input` key fields                            |
| --------- | ---------------- | -------------------------------------------------- |
| `"Bash"`  | Shell command    | `.command: string`                                 |
| `"Read"`  | Read file        | `.file_path: string`                               |
| `"Edit"`  | Edit file        | `.file_path: string`, `.old_string`, `.new_string` |
| `"Write"` | Write file       | `.file_path: string`, `.content: string`           |
| `"Glob"`  | File search      | `.pattern: string`                                 |
| `"Grep"`  | Content search   | `.pattern: string`, `.path: string`                |
| `"Agent"` | Subagent         | `.prompt: string`                                  |
| `"Skill"` | Skill invocation | `.skill: string`                                   |

Use `"Edit\|Write"` to match multiple tools (pipe-separated).
