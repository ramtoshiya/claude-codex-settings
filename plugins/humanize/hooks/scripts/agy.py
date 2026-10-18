#!/usr/bin/env python3
"""Run humanize.py as an Antigravity (agy) PreToolUse hook. Added in the ramtoshiya fork.

agy sends {"toolCall": {"name", "args"}} with PascalCase arguments and reads {"decision", "reason"}.
agy denies a call when the reply has no decision, so every path prints one. "ask" hands the call
back to agy's normal permission rules. A failed check also answers "ask", as a crashed hook lets
the call through in Claude Code and Codex.
"""

import json
import subprocess
import sys
from pathlib import Path

HUMANIZE = Path(__file__).with_name("humanize.py")


def hook_input(payload):
    """Translate an agy tool call to the Claude Code hook input that humanize.py reads."""
    call = payload.get("toolCall") or {}
    name, args = call.get("name", ""), call.get("args") or {}
    cwd = args.get("Cwd") or (payload.get("workspacePaths") or ["."])[0]
    if name == "run_command":
        return {"tool_name": "Bash", "tool_input": {"command": args.get("CommandLine", "")}, "cwd": cwd}
    if name == "write_to_file":
        tool_input = {"file_path": args.get("TargetFile", ""), "content": args.get("CodeContent", "")}
        return {"tool_name": "Write", "tool_input": tool_input, "cwd": cwd}
    # replace_file_content sends one replacement, multi_replace_file_content a ReplacementChunks list
    chunks = args.get("ReplacementChunks") or [args]
    edits = [
        {
            "old_string": chunk["TargetContent"],
            "new_string": chunk.get("ReplacementContent", ""),
            "replace_all": bool(chunk.get("AllowMultiple")),
        }
        for chunk in chunks
        if isinstance(chunk, dict) and chunk.get("TargetContent")
    ]
    return {"tool_name": "Edit", "tool_input": {"file_path": args.get("TargetFile", ""), "edits": edits}, "cwd": cwd}


def decide(payload):
    """Return the agy decision for one PreToolUse payload."""
    try:
        result = subprocess.run(
            [sys.executable, str(HUMANIZE)],
            input=json.dumps(hook_input(payload)),
            capture_output=True,
            text=True,
            timeout=8,
        )
        if result.returncode:
            detail = (result.stderr.strip().splitlines() or ["exit status " + str(result.returncode)])[-1]
            return {"decision": "ask", "reason": "humanize could not check this call: " + detail}
        if not result.stdout.strip():
            return {"decision": "ask"}
        output = json.loads(result.stdout)["hookSpecificOutput"]
        return {"decision": "ask", "reason": output["additionalContext"]}
    except Exception as error:
        return {"decision": "ask", "reason": "humanize could not check this call: " + str(error)}


if __name__ == "__main__":
    try:
        payload = json.load(sys.stdin)
    except ValueError as error:
        print(json.dumps({"decision": "ask", "reason": "humanize could not read the hook input: " + str(error)}))
    else:
        print(json.dumps(decide(payload)))
