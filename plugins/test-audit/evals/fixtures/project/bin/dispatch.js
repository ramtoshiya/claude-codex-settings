#!/usr/bin/env node
import { commands, runCommand } from '../src/commands.js';

const [name = '--help', value = ''] = process.argv.slice(2);
if (name === '--help') {
  process.stdout.write(commands.map((command) => `${command.name}: ${command.summary}`).join('\n') + '\n');
} else {
  runCommand(name, { value }, (line) => process.stdout.write(`${line}\n`));
}
