// Pi adapter for the humanize hook. Added in the ramtoshiya fork.
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionContext, ToolCallEventResult } from "@earendil-works/pi-coding-agent";

const script = fileURLToPath(new URL("./scripts/humanize.py", import.meta.url));
const runner = [
	"run", "--offline", "--no-project", "--managed-python", "--python", ">=3.11",
	"--no-config", "--exclude-newer", "3 days", "python", script,
];

// Resolve paths the way Pi's file tools do: strip a leading @, expand ~, then resolve against cwd.
function absolute(path: string, cwd: string) {
	const bare = path.replace(/^@/, "");
	if (bare === "~" || bare.startsWith("~/")) return resolve(homedir(), bare.slice(2));
	return resolve(cwd, bare);
}

// Translate Pi's built-in tool input to the Claude Code hook input that humanize.py reads.
function hookInput(toolName: string, input: any, cwd: string) {
	if (toolName === "bash") return { tool_name: "Bash", tool_input: { command: input.command }, cwd };
	if (toolName === "write") {
		return { tool_name: "Write", tool_input: { file_path: absolute(input.path, cwd), content: input.content }, cwd };
	}
	if (toolName === "edit") {
		const edits = input.edits.map((edit: any) => ({ old_string: edit.oldText, new_string: edit.newText }));
		return { tool_name: "Edit", tool_input: { file_path: absolute(input.path, cwd), edits }, cwd };
	}
}

// A failed check lets the call through, as a crashed hook does in Claude Code and Codex.
function skipped(ctx: ExtensionContext, detail: string) {
	if (ctx.hasUI) ctx.ui.notify(`humanize could not check this call: ${detail}`, "warning");
	return undefined;
}

export default function humanize(pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		const payload = hookInput(event.toolName, event.input, ctx.cwd);
		if (!payload) return;

		return new Promise<ToolCallEventResult | undefined>((done) => {
			const child = execFile(
				"uv",
				runner,
				{ cwd: ctx.cwd, signal: ctx.signal, timeout: 10_000, maxBuffer: 1024 * 1024, encoding: "utf8" },
				(error, stdout, stderr) => {
					if (error) return done(skipped(ctx, stderr.trim().split("\n").pop() || error.message));
					if (!stdout.trim()) return done(undefined);
					try {
						const output = JSON.parse(stdout).hookSpecificOutput;
						if (output?.permissionDecision === "deny") {
							return done({ block: true, reason: output.permissionDecisionReason });
						}
						done(skipped(ctx, "unexpected hook output"));
					} catch {
						done(skipped(ctx, "unexpected hook output"));
					}
				},
			);
			child.stdin?.on("error", () => {});
			child.stdin?.end(JSON.stringify(payload));
		});
	});
}
