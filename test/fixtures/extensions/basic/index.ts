import { defineExtension } from "../../../../src/index.js";

export default defineExtension((cc) => {
	cc.on("PreToolUse", { matcher: "Bash" }, async (input) => {
		const toolInput = input.tool_input as Record<string, unknown>;
		if ((toolInput?.command as string)?.includes("dangerous")) {
			return {
				hookSpecificOutput: {
					hookEventName: "PreToolUse" as const,
					permissionDecision: "deny" as const,
					permissionDecisionReason: "Blocked by basic fixture",
				},
			};
		}
		return {};
	});
});
