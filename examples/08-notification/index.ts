/**
 * Notification — Add context to notification events.
 *
 * notification_type can be used to filter notifications.
 */
import { defineExtension } from "@dawkinsuke/hooks"

export default defineExtension((cc) => {
	cc.on("Notification", async (input) => {
		return {
			hookSpecificOutput: {
				hookEventName: "Notification" as const,
				additionalContext: `Notification received: [${input.notification_type}] ${input.message}`,
			},
		}
	})
})
