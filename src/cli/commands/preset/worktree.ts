import { defineCommand, option } from "@bunli/core"
import * as fs from "node:fs"
import * as path from "node:path"
import { z } from "zod"
import { buildExtensions } from "../../../build/builder.js"

export const SYSTEM_PROMPT = `You generate TypeScript extension files for hx-cli (Claude Code hooks toolkit).
Output ONLY the TypeScript code — no markdown fences, no prose, no explanation.
The first line of your response must be: import { defineExtension } from "@dawkinsuke/hooks";
Do not wrap the code in \`\`\` code blocks.`

export const EDIT_SYSTEM_PROMPT = `You modify TypeScript extension files for hx-cli (Claude Code hooks toolkit).
You will receive a modification request for an existing extension file.
Output ONLY the modified TypeScript code — no markdown fences, no prose, no explanation.
The first line of your response must be: import { defineExtension } from "@dawkinsuke/hooks";
Do not wrap the code in \`\`\` code blocks.`

export const PROMPT = `Generate a WorktreeCreate extension for this repo.

WorktreeCreate is responsible for CREATING a git worktree and returning its absolute path.
Claude Code uses the returned path as the working directory for the isolated session.
If no path is returned, worktree creation FAILS.
WorktreeRemove is NOT needed — Claude Code handles default git worktree removal automatically.

Rules:
- Start with: import { defineExtension } from "@dawkinsuke/hooks";
- Use cc.on("WorktreeCreate", async (input) => { ... })
- input.cwd is the project root directory
- input.name is the worktree name/slug
- Use Bun.$\`... 1>&2\` for shell commands (stdout is reserved for the worktree path, so redirect command output to stderr)
- WorktreeCreate MUST return the absolute path string of the created worktree
- Create the worktree under \`\${input.cwd}/.worktrees/\${input.name}\`
- Be idempotent: use existsSync from "node:fs" to check if the worktree directory already exists, and if so skip creation and return the path immediately
- Create a new branch with the same name as input.name
- After creating the worktree, symlink any gitignored secret/config files from input.cwd
- Install dependencies if a lock file exists (detect package manager)
- Run codegen/build steps if applicable
- Only include setup steps relevant to THIS repo — omit anything that doesn't apply
- Use short comments for non-obvious lines
- No console.log — use console.error for diagnostics (stdout is reserved for the worktree path return value)
- If the repo needs no post-creation setup, just create the worktree and return the path
- Do NOT add a WorktreeRemove handler — Claude Code's default git worktree removal handles cleanup automatically. A custom handler is only needed for non-git VCS (SVN, Perforce, etc.)

Example output for a Node.js project:

import { defineExtension } from "@dawkinsuke/hooks";
import { existsSync } from "node:fs";

export default defineExtension((cc) => {
\tcc.on("WorktreeCreate", async (input) => {
\t\tconst root = input.cwd;
\t\tconst name = input.name;
\t\tconst worktreeDir = \`\${root}/.worktrees/\${name}\`;

\t\t// Reuse existing worktree if it exists
\t\tif (existsSync(worktreeDir)) return worktreeDir;

\t\t// Create worktree with new branch
\t\tawait Bun.$\`git worktree add -b \${name} \${worktreeDir}\` 1>&2;

\t\t// Symlink secrets from project root
\t\tawait Bun.$\`ln -sf "\${root}/.env" "\${worktreeDir}/.env"\` 1>&2;
\t\tawait Bun.$\`ln -sf "\${root}/.dev.vars" "\${worktreeDir}/.dev.vars"\` 1>&2;

\t\t// Install deps and run codegen
\t\tawait Bun.$\`cd \${worktreeDir} && npm ci && npx prisma generate\` 1>&2;

\t\treturn worktreeDir;
\t});
});

Example output for a Rust project:

import { defineExtension } from "@dawkinsuke/hooks";
import { existsSync } from "node:fs";

export default defineExtension((cc) => {
\tcc.on("WorktreeCreate", async (input) => {
\t\tconst root = input.cwd;
\t\tconst name = input.name;
\t\tconst worktreeDir = \`\${root}/.worktrees/\${name}\`;

\t\tif (existsSync(worktreeDir)) return worktreeDir;

\t\tawait Bun.$\`git worktree add -b \${name} \${worktreeDir}\` 1>&2;
\t\tawait Bun.$\`ln -sf "\${root}/.env" "\${worktreeDir}/.env"\` 1>&2;
\t\tawait Bun.$\`cd \${worktreeDir} && cargo fetch\` 1>&2;

\t\treturn worktreeDir;
\t});
});

IMPORTANT: Output ONLY the raw TypeScript code. The very first characters of
your response must be: import { defineExtension } — no preamble, no markdown,
no commentary.`

// ---------------------------------------------------------------------------
// Prompt resolution — determines which system prompt & user prompt to use
// ---------------------------------------------------------------------------

export type PromptResolution =
	| { kind: "generate"; systemPrompt: string; prompt: string }
	| { kind: "error"; message: string }

export function resolvePrompts(
	flags: { replace: boolean; edit?: string },
	extensionExists: boolean,
): PromptResolution {
	// --edit: modify existing extension
	if (flags.edit) {
		if (!extensionExists) {
			return {
				kind: "error",
				message: "No existing extension found. Run 'hx preset worktree' first.",
			}
		}

		const editPrompt = `Read .claude/extensions/worktree-setup/index.ts and modify it based on:
${flags.edit}

Output the complete updated extension.
Keep all existing logic intact unless the modification explicitly changes it.`

		return { kind: "generate", systemPrompt: EDIT_SYSTEM_PROMPT, prompt: editPrompt }
	}

	// --replace or new: generate from scratch
	if (extensionExists && !flags.replace) {
		return {
			kind: "error",
			message:
				'Extension "worktree-setup" already exists at .claude/extensions/worktree-setup/\n' +
				"Run 'hx preset worktree --replace' to regenerate, or '--edit <prompt>' to modify.",
		}
	}

	return { kind: "generate", systemPrompt: SYSTEM_PROMPT, prompt: PROMPT }
}

// ---------------------------------------------------------------------------
// Shared: Claude execution → validation → write → build
// ---------------------------------------------------------------------------

async function generateAndWrite(
	systemPrompt: string,
	prompt: string,
	extDir: string,
	extFile: string,
	cwd: string,
): Promise<void> {
	// Check claude CLI
	const which = await Bun.$`which claude`.quiet().nothrow()
	if (which.exitCode !== 0) {
		console.error(
			"claude CLI not found. Install it: https://docs.anthropic.com/en/docs/claude-code",
		)
		process.exit(1)
	}

	// Generate via claude
	const result = await Bun.$`claude -p --system-prompt ${systemPrompt} ${prompt}`.quiet().nothrow()

	if (result.exitCode !== 0) {
		console.error("Failed to generate extension:", result.stderr.toString())
		process.exit(1)
	}

	const output = result.stdout.toString().trim()

	// Validate
	if (!output.startsWith("import { defineExtension }")) {
		console.error("Error: generated output did not contain a valid extension.")
		console.error("")
		console.error("Raw output:")
		console.error(output)
		process.exit(1)
	}

	// Write
	fs.mkdirSync(extDir, { recursive: true })
	fs.writeFileSync(extFile, output, "utf-8")
	console.log("Created .claude/extensions/worktree-setup/index.ts\n")

	// Auto-build
	console.log("Building extensions...\n")
	const buildResult = await buildExtensions(cwd)

	for (const err of buildResult.errors) {
		console.error(`  ✗ ${err.extension}: ${err.error}`)
	}
	for (const ext of buildResult.extensions) {
		const count = ext.registrations.length
		console.log(`  ✓ ${ext.name} (${count} hook${count !== 1 ? "s" : ""})`)
	}
	console.log(`\n${buildResult.hookCount} hook(s) written to .claude/settings.local.json`)
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export default defineCommand({
	name: "worktree",
	description: "Generate a WorktreeCreate extension using Claude",
	options: {
		replace: option(z.coerce.boolean().default(false), {
			description: "Regenerate an existing worktree-setup extension",
		}),
		edit: option(z.string().optional(), {
			description: "Edit existing extension with a modification prompt",
		}),
	},
	handler: async ({ flags }) => {
		const cwd = process.cwd()
		const extDir = path.join(cwd, ".claude", "extensions", "worktree-setup")
		const extFile = path.join(extDir, "index.ts")

		const resolution = resolvePrompts(flags, fs.existsSync(extFile))

		if (resolution.kind === "error") {
			console.error(resolution.message)
			process.exit(1)
		}

		const label = flags.edit ? "Editing" : "Analyzing repo to generate"
		console.log(`${label} worktree-setup extension...`)
		return generateAndWrite(resolution.systemPrompt, resolution.prompt, extDir, extFile, cwd)
	},
})
