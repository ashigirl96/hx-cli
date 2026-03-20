import * as fs from "node:fs";
import * as path from "node:path";

const TEMPLATE = `import { defineExtension } from "clex";

export default defineExtension((cc) => {
\t// Add your hooks here
\t// cc.on("PreToolUse", { matcher: "Bash" }, async (input) => { ... });
});
`;

export async function newCommand(name?: string): Promise<void> {
	if (!name) {
		console.error("Usage: clex new <name>");
		process.exit(1);
	}

	const cwd = process.cwd();
	const extDir = path.join(cwd, ".claude", "extensions", name);

	if (fs.existsSync(extDir)) {
		console.error(`Extension "${name}" already exists at .claude/extensions/${name}/`);
		process.exit(1);
	}

	fs.mkdirSync(extDir, { recursive: true });
	fs.writeFileSync(path.join(extDir, "index.ts"), TEMPLATE, "utf-8");

	console.log(`Created .claude/extensions/${name}/index.ts`);
	console.log("Edit the file and run 'clex build' to install hooks.");
}
