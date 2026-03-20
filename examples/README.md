# @dawkinsuke/hooks Examples

Each directory is a self-contained extension you can copy into `.claude/extensions/` and build with `hx build`.

## Usage

```bash
# Copy an example into your project
cp -r examples/01-deny-command .claude/extensions/deny-command

# Build all extensions
hx build
```

## Hook Registration Types

| #   | Example                         | Type          | Description                                        |
| --- | ------------------------------- | ------------- | -------------------------------------------------- |
| 13  | [http-hook](./13-http-hook)     | `cc.http()`   | Declarative HTTP webhook — POST to a URL on events |
| 14  | [prompt-hook](./14-prompt-hook) | `cc.prompt()` | Declarative single-turn LLM evaluation             |
| 15  | [agent-hook](./15-agent-hook)   | `cc.agent()`  | Declarative multi-turn LLM verification            |
| 16  | [mixed](./16-mixed)             | all types     | Combines command, HTTP, prompt, and agent hooks    |

All other examples use `cc.on()` (command hooks compiled to `.mjs`).

## PreToolUse — Permission & Input Control

| #   | Example                                       | Key Field                     | Description                         |
| --- | --------------------------------------------- | ----------------------------- | ----------------------------------- |
| 01  | [deny-command](./01-deny-command)             | `permissionDecision: "deny"`  | Block dangerous commands            |
| 02  | [additional-context](./02-additional-context) | `additionalContext`           | Inject info into Claude's context   |
| 03  | [allow-command](./03-allow-command)           | `permissionDecision: "allow"` | Auto-approve safe commands          |
| 04  | [updated-input](./04-updated-input)           | `updatedInput`                | Rewrite tool input before execution |
| 10  | [hook-block-error](./10-hook-block-error)     | `HookBlockError`              | Block via throw (exit code 2)       |

## Other Events

| #   | Example                                       | Event               | Description                             |
| --- | --------------------------------------------- | ------------------- | --------------------------------------- |
| 05  | [post-tool-use](./05-post-tool-use)           | `PostToolUse`       | Add context after tool execution        |
| 06  | [user-prompt-submit](./06-user-prompt-submit) | `UserPromptSubmit`  | React to user input (NoMatcherEvent)    |
| 07  | [session-start](./07-session-start)           | `SessionStart`      | Inject project info on session start    |
| 08  | [notification](./08-notification)             | `Notification`      | Handle notification events              |
| 09  | [permission-request](./09-permission-request) | `PermissionRequest` | Programmatic allow/deny decisions       |
| 11  | [stop](./11-stop)                             | `Stop`              | Override stop behavior (NoMatcherEvent) |
| 12  | [elicitation](./12-elicitation)               | `Elicitation`       | Handle MCP elicitation requests         |

## Hook Output Reference

### `SyncHookJSONOutput` (common fields — available on all events)

```typescript
{
  continue?: boolean        // Cancel a Stop event
  suppressOutput?: boolean  // Suppress tool output
  stopReason?: string       // Override stop reason
  decision?: "approve" | "block"
  systemMessage?: string
  reason?: string
  hookSpecificOutput?: ...  // Event-specific fields (see below)
}
```

### Event-Specific `hookSpecificOutput`

| Event                | Key Fields                                                                            |
| -------------------- | ------------------------------------------------------------------------------------- |
| `PreToolUse`         | `permissionDecision`, `permissionDecisionReason`, `updatedInput`, `additionalContext` |
| `PostToolUse`        | `additionalContext`, `updatedMCPToolOutput`                                           |
| `PostToolUseFailure` | `additionalContext`                                                                   |
| `UserPromptSubmit`   | `additionalContext`                                                                   |
| `SessionStart`       | `additionalContext`                                                                   |
| `Setup`              | `additionalContext`                                                                   |
| `Notification`       | `additionalContext`                                                                   |
| `SubagentStart`      | `additionalContext`                                                                   |
| `PermissionRequest`  | `decision: { behavior: "allow" \| "deny", ... }`                                      |
| `Elicitation`        | `action: "accept" \| "decline" \| "cancel"`, `content`                                |
| `ElicitationResult`  | `action`, `content`                                                                   |

### Matcher vs NoMatcher Events

**NoMatcherEvents** (matcher option is not available — hooks always fire):
`UserPromptSubmit`, `Stop`, `TeammateIdle`, `TaskCompleted`, `WorktreeCreate`, `WorktreeRemove`

All other events support the `matcher` option for conditional execution.
