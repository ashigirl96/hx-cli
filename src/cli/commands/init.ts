import * as fs from "node:fs";
import * as path from "node:path";

const SAMPLE_EXTENSION = `import { defineExtension } from "clex";

export default defineExtension((cc) => {
\tcc.on("PreToolUse", { matcher: "Bash" }, async (input) => {
\t\tconst toolInput = input.tool_input as Record<string, unknown>;
\t\tconst command = toolInput?.command as string | undefined;

\t\t// Block destructive commands
\t\tif (command?.match(/rm\\s+-rf\\s+\\//)) {
\t\t\treturn {
\t\t\t\thookSpecificOutput: {
\t\t\t\t\thookEventName: "PreToolUse" as const,
\t\t\t\t\tpermissionDecision: "deny" as const,
\t\t\t\t\tpermissionDecisionReason: "Destructive command blocked by clex",
\t\t\t\t},
\t\t\t};
\t\t}

\t\t// Allow everything else
\t\treturn {};
\t});
});
`;

export async function initCommand(): Promise<void> {
	const cwd = process.cwd();
	const extensionsDir = path.join(cwd, ".claude", "extensions");

	if (fs.existsSync(extensionsDir)) {
		const entries = fs.readdirSync(extensionsDir);
		if (entries.length > 0) {
			console.log(".claude/extensions/ already exists with extensions.");
			return;
		}
	}

	const sampleDir = path.join(extensionsDir, "guard");
	fs.mkdirSync(sampleDir, { recursive: true });
	fs.writeFileSync(path.join(sampleDir, "index.ts"), SAMPLE_EXTENSION, "utf-8");

	console.log("Created .claude/extensions/guard/index.ts");
	console.log("Run 'clex build' to compile and install hooks.");
}
