import { defineExtension } from "../../../../src/index.js";

export default defineExtension((cc) => {
	// Command hook
	cc.on("PreToolUse", { matcher: "Bash" }, async () => ({}));

	// HTTP hook
	cc.http("PostToolUse", {
		matcher: "Edit|Write",
		url: "http://localhost:8080/on-edit",
	});

	// Prompt hook
	cc.prompt("Stop", { prompt: "Are all tasks complete?" });

	// Agent hook
	cc.agent("Stop", { prompt: "Verify tests pass.", timeout: 120 });
});
