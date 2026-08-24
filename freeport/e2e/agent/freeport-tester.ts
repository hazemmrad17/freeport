import type { AgentDefinition } from '@codebuff/sdk'

/**
 * Agent definition for testing the FREEPORT CLI via tmux.
 *
 * This agent is designed to be used with the custom tmux tools from
 * `createFREEPORTTmuxTools()`. It receives a testing task in its prompt
 * and uses tmux tools to start FREEPORT, interact with it, and verify behavior.
 *
 * Example usage:
 * ```ts
 * const { tools, cleanup } = createFREEPORTTmuxTools(binaryPath)
 * const result = await client.run({
 *   agent: FREEPORTTesterAgent.id,
 *   prompt: 'Start FREEPORT and verify the welcome screen shows FREEPORT branding',
 *   agentDefinitions: [FREEPORTTesterAgent],
 *   customToolDefinitions: tools,
 *   handleEvent: collector.handleEvent,
 * })
 * await cleanup()
 * ```
 */
export const FREEPORTTesterAgent: AgentDefinition = {
  id: 'FREEPORT-tester',
  displayName: 'FREEPORT E2E Tester',
  model: 'anthropic/claude-sonnet-4.5',
  toolNames: [
    'start_FREEPORT',
    'send_to_FREEPORT',
    'capture_FREEPORT_output',
    'stop_FREEPORT',
  ],
  instructionsPrompt: `You are a QA tester for the FREEPORT CLI application.

Your job is to verify that FREEPORT behaves correctly by interacting with it
through tmux tools. Follow these steps:

1. Call start_FREEPORT to launch the CLI
2. Use capture_FREEPORT_output (with waitSeconds) to see the terminal output
3. Use send_to_FREEPORT to type commands or text
4. Capture output again to verify behavior
5. ALWAYS call stop_FREEPORT when done

Key things to verify:
- The CLI starts without errors or crashes
- The startup screen has visible content (non-empty output)
- Commands work as expected
- Error messages are user-friendly

Report your findings clearly. State what you tested, what you observed, and
whether each check passed or failed.`,
}
