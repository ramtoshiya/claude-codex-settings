// Test the Pi adapter for the humanize hook. Added in the ramtoshiya fork.
// Run with Node 22.18 or newer, uv, and a cached uv-managed Python 3.11 or newer:
// node --test .github/scripts/test_humanize_pi.mjs
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import humanize from "../../plugins/humanize/hooks/pi.ts";

const SEMICOLON = String.fromCharCode(59);
let handler;
humanize({ on(event, callback) { if (event === "tool_call") handler = callback; } });

function fixture(t) {
	const cwd = mkdtempSync(join(tmpdir(), "humanize-pi-"));
	t.after(() => rmSync(cwd, { recursive: true, force: true }));
	return cwd;
}

function call(cwd, toolName, input, ui) {
	return handler({ type: "tool_call", toolName, toolCallId: "humanize-test", input }, { cwd, hasUI: !!ui, ui });
}

test("blocks flagged text from Pi write, edit, and bash calls", async (t) => {
	const cwd = fixture(t);
	writeFileSync(join(cwd, "notes.md"), "one\ntwo\n");
	const cases = [
		["write", { path: "draft.md", content: `Plain text${SEMICOLON} more.` }, /semicolon at .*draft\.md/],
		["edit", { path: "@notes.md", edits: [{ oldText: "two", newText: "we leverage it" }] }, /"leverage"/],
		["bash", { command: 'git commit -m "Leverage the cache"' }, /"leverage"/],
	];
	for (const [toolName, input, reason] of cases) {
		const result = await call(cwd, toolName, input);
		assert.equal(result?.block, true, toolName);
		assert.match(result.reason, reason);
	}
	assert.equal(await call(cwd, "write", { path: "draft.md", content: "Plain text." }), undefined);
});

test("lets the call through with a warning when the check cannot run", async (t) => {
	const cwd = fixture(t);
	const originalPath = process.env.PATH;
	t.after(() => { process.env.PATH = originalPath; });
	process.env.PATH = cwd;
	const warnings = [];
	const ui = { notify: (message, level) => warnings.push([message, level]) };
	assert.equal(await call(cwd, "write", { path: "draft.md", content: `Plain text${SEMICOLON} more.` }, ui), undefined);
	assert.equal(warnings.length, 1);
	assert.match(warnings[0][0], /could not check/);
	assert.equal(warnings[0][1], "warning");
});
