/**
 * Runtime: the stdin→handler→stdout bridge that gets bundled into each generated hook script.
 *
 * Generated entry scripts call:
 *   runHook(extensionFactory);
 *
 * Event and matcher are passed via CLI args:
 *   bun guard.mjs PreToolUse Bash
 *
 * Protocol:
 * - Read JSON from stdin (or empty for some events)
 * - Re-execute factory to capture handlers for (event, matcher)
 * - Call handlers sequentially, last non-void result wins
 * - Output: string → raw stdout | object → JSON stdout | HookBlockError → stderr + exit(2)
 */
import type { HookEvent, HookJSONOutput } from "@anthropic-ai/claude-agent-sdk"
import type { HooksAPI, ExtensionFactory } from "./api/extension-api.js"
import { isHookOutput } from "./api/output.js"

// ---------------------------------------------------------------------------
// HookBlockError — throw to block via exit code 2
// ---------------------------------------------------------------------------

export class HookBlockError extends Error {
	constructor(reason: string) {
		super(reason)
		this.name = "HookBlockError"
	}
}

// ---------------------------------------------------------------------------
// runHook — the core runtime function
// ---------------------------------------------------------------------------

type AnyHandler = (input: unknown) => Promise<unknown> | unknown

export async function runHook(factory: ExtensionFactory): Promise<void> {
	// 0. Parse event and matcher from CLI args
	const targetEvent = process.argv[2] as HookEvent
	const targetMatcher: string | undefined = process.argv[3] || undefined

	if (!targetEvent) {
		process.stderr.write("Usage: <script> <event> [matcher]\n")
		process.exit(1)
	}

	// 1. Collect handlers by re-executing the factory
	const handlers: AnyHandler[] = []

	const api = {
		on(event: HookEvent, ...args: unknown[]): void {
			// Parse overloaded args:
			//   (event, handler)
			//   (event, options, handler)
			//   (event, matcher: string, handler)
			let matcher: string | undefined
			let handler: AnyHandler

			if (args.length >= 2 && typeof args[0] === "string") {
				// String matcher shorthand: on("PreToolUse", "Bash", handler)
				matcher = args[0]
				handler = args[1] as AnyHandler
			} else if (args.length >= 2 && typeof args[0] === "object" && args[0] !== null) {
				const opts = args[0] as { matcher?: string }
				matcher = opts.matcher
				handler = args[1] as AnyHandler
			} else {
				handler = args[0] as AnyHandler
			}

			// Only capture handlers matching our target (event, matcher)
			if (event === targetEvent && matcher === targetMatcher) {
				handlers.push(handler)
			}
		},
		http() {},
		prompt() {},
		agent() {},
	} as HooksAPI

	await factory(api)

	// 2. Read stdin
	const chunks: Buffer[] = []
	for await (const chunk of process.stdin) {
		chunks.push(chunk as Buffer)
	}
	const raw = Buffer.concat(chunks).toString("utf-8").trim()
	const input = raw ? JSON.parse(raw) : {}

	// 3. Execute handlers
	let result: unknown
	try {
		for (const handler of handlers) {
			const r = await handler(input)
			if (r !== undefined && r !== null) {
				result = r
			}
		}
	} catch (err) {
		if (err instanceof HookBlockError) {
			process.stderr.write(err.message)
			process.exit(2)
		}
		throw err
	}

	// 4. Output
	if (result === undefined || result === null) {
		// No output — exit 0
		return
	}

	if (typeof result === "string") {
		// Raw string output (e.g., WorktreeCreate returns an absolute path)
		process.stdout.write(result)
	} else if (isHookOutput(result)) {
		// Show visible context to user via macOS notification
		if (result._visible && result._context) {
			try {
				const msg = result._context.replaceAll('"', '\\"')
				const script = `display notification "${msg}" with title "hx"`
				await Bun.$`osascript -e ${script}`.quiet()
			} catch {
				// Notification unavailable (e.g., CI, Linux) — silently skip
			}
		}
		// HookOutput builder → resolve to wire format based on target event
		const resolved = result._resolve(targetEvent)
		process.stdout.write(JSON.stringify(resolved))
	} else {
		// Raw HookJSONOutput (backward compat)
		process.stdout.write(JSON.stringify(result as HookJSONOutput))
	}
}
