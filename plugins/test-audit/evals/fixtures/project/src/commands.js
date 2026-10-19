import { createLifecycle } from './lifecycle.js';
import { resolveHookOptions } from './hook-options.js';

export const commands = [
  { name: 'send', summary: 'Batch and deliver an event' },
  { name: 'options', summary: 'Print resolved hook options without starting delivery' },
];

export function runCommand(name, input, write) {
  if (name === 'options') {
    write(JSON.stringify(resolveHookOptions(input)));
    return;
  }
  if (name === 'send') {
    const options = resolveHookOptions(input);
    if (!options.enabled) return;
    const dispatcher = createLifecycle({
      delayMs: options.delayMs,
      send: (batch) => write(JSON.stringify(batch)),
    });
    dispatcher.enqueue({ type: 'message', value: input.value ?? '' });
    if (options.mode === 'manual') dispatcher.flush();
    return dispatcher;
  }
  throw new Error(`Unknown command: ${name}`);
}
